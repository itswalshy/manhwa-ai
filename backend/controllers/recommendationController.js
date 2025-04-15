const Recommendation = require('../models/Recommendation');
const Manhwa = require('../models/Manhwa');
const User = require('../models/User');
const ReadingHistory = require('../models/ReadingHistory');
const { calculateResourceUsage } = require('../utils/systemResources');
const redis = require('../config/redis');
const logger = require('../config/logger');

// Get recommendations for a user
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0, genres, tags, refresh = false } = req.query;
    
    // Check if we can serve from cache (if refresh is not requested)
    if (!refresh) {
      const cachedRecommendations = await redis.get(`recommendations:${userId}`);
      if (cachedRecommendations) {
        logger.info(`Serving cached recommendations for user ${userId}`);
        return res.status(200).json(JSON.parse(cachedRecommendations));
      }
    }

    // Check system resource usage to determine which tier to use
    const resourceUsage = await calculateResourceUsage();
    
    // Select recommendation tier based on resource availability and user history
    const user = await User.findById(userId);
    const readingHistoryCount = await ReadingHistory.countDocuments({ user: userId });
    
    let recommendationTier = 'lightweight';
    
    // If resources are available and user has sufficient history, use higher tiers
    if (resourceUsage.cpu < 70 && resourceUsage.memory < 70 && readingHistoryCount >= 5) {
      recommendationTier = 'standard';
      
      // Only use enhanced tier during off-peak hours and with low resource usage
      const currentHour = new Date().getHours();
      if ((currentHour >= 2 && currentHour <= 5) && resourceUsage.cpu < 50 && resourceUsage.memory < 50) {
        recommendationTier = 'enhanced';
      }
    }
    
    logger.info(`Using ${recommendationTier} recommendation tier for user ${userId}`);
    
    // Get recommendations using the selected tier
    let recommendations;
    const startTime = Date.now();
    
    switch (recommendationTier) {
      case 'lightweight':
        recommendations = await getLightweightRecommendations(userId, { genres, tags, limit, offset });
        break;
      case 'standard':
        recommendations = await getStandardRecommendations(userId, { genres, tags, limit, offset });
        break;
      case 'enhanced':
        recommendations = await getEnhancedRecommendations(userId, { genres, tags, limit, offset });
        break;
      default:
        recommendations = await getLightweightRecommendations(userId, { genres, tags, limit, offset });
    }
    
    const processingTime = Date.now() - startTime;
    
    // Store recommendations in database
    const recommendationDoc = new Recommendation({
      user: userId,
      recommendations: recommendations.items.map(item => ({
        manhwa: item.manhwa._id,
        score: item.score,
        reason: item.reason
      })),
      generatedBy: recommendationTier,
      isPersonalized: recommendationTier !== 'lightweight',
      filters: {
        genres: genres ? genres.split(',') : [],
        tags: tags ? tags.split(',') : []
      },
      metadata: {
        processingTime,
        algorithmVersion: '1.0.0',
        itemsConsidered: recommendations.metadata.itemsConsidered,
        confidenceScore: recommendations.metadata.confidenceScore
      }
    });
    
    await recommendationDoc.save();
    
    // Format response
    const response = {
      items: recommendations.items,
      metadata: {
        tier: recommendationTier,
        processingTime,
        count: recommendations.items.length,
        total: recommendations.metadata.totalAvailable,
        confidenceScore: recommendations.metadata.confidenceScore
      }
    };
    
    // Cache recommendations for 24 hours
    await redis.set(
      `recommendations:${userId}`, 
      JSON.stringify(response), 
      'EX', 
      60 * 60 * 24
    );
    
    return res.status(200).json(response);
    
  } catch (error) {
    logger.error(`Error getting recommendations: ${error.message}`);
    return res.status(500).json({ message: 'Error getting recommendations', error: error.message });
  }
};

// Lightweight recommendation tier - tag/genre based matching with minimal processing
const getLightweightRecommendations = async (userId, options) => {
  const { genres, tags, limit = 10, offset = 0 } = options;
  
  // Start with a basic query
  let query = { isActive: true };
  
  // Add filters if provided
  if (genres) {
    query.genres = { $in: genres.split(',') };
  }
  
  if (tags) {
    query.tags = { $in: tags.split(',') };
  }
  
  // Get user preferences for better matching
  const user = await User.findById(userId);
  const preferredGenres = user?.preferences?.genres || [];
  const preferredArtStyles = user?.preferences?.artStyles || [];
  
  if (preferredGenres.length > 0 && !genres) {
    // If user has preferences and no specific genre filter was requested
    query.genres = { $in: preferredGenres };
  }
  
  // Get reading history to exclude already read manhwas
  const readingHistory = await ReadingHistory.find({ user: userId })
    .select('manhwa -_id');
    
  const readManhwaIds = readingHistory.map(history => history.manhwa);
  
  if (readManhwaIds.length > 0) {
    query._id = { $nin: readManhwaIds };
  }
  
  // Count total available for pagination info
  const totalAvailable = await Manhwa.countDocuments(query);
  
  // Get manhwas that match criteria, sorted by popularity
  const manhwas = await Manhwa.find(query)
    .sort({ 'popularity.viewCount': -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit))
    .select('_id title description coverImage thumbnailImage genres tags artStyle status chapters popularity');
  
  // Format response
  const recommendations = {
    items: manhwas.map(manhwa => {
      // Generate a simple score based on genre match
      const genreMatchCount = manhwa.genres.filter(g => preferredGenres.includes(g)).length;
      const artStyleMatchCount = manhwa.artStyle.filter(a => preferredArtStyles.includes(a)).length;
      
      // Normalize to 0-1 range
      const genreScore = preferredGenres.length > 0 ? genreMatchCount / preferredGenres.length : 0;
      const artStyleScore = preferredArtStyles.length > 0 ? artStyleMatchCount / preferredArtStyles.length : 0;
      
      // Combine scores with popularity factor
      const popularityFactor = Math.min(1, manhwa.popularity.viewCount / 10000);
      const finalScore = 0.4 * genreScore + 0.3 * artStyleScore + 0.3 * popularityFactor;
      
      // Determine reason for recommendation
      let reason = 'trending';
      if (genreScore > 0.5) reason = 'genre_match';
      else if (artStyleScore > 0.5) reason = 'art_style_match';
      
      return {
        manhwa: manhwa,
        score: parseFloat(finalScore.toFixed(2)),
        reason
      };
    }),
    metadata: {
      itemsConsidered: totalAvailable,
      totalAvailable,
      confidenceScore: 0.7 // Lower confidence for lightweight tier
    }
  };
  
  return recommendations;
};

// Standard recommendation tier - collaborative filtering based on user behavior
const getStandardRecommendations = async (userId, options) => {
  const { genres, tags, limit = 10, offset = 0 } = options;
  
  // Similar to lightweight but with more sophisticated processing
  let recommendations = await getLightweightRecommendations(userId, options);
  
  try {
    // Get user's reading history with ratings
    const userHistory = await ReadingHistory.find({ user: userId })
      .populate('manhwa')
      .select('manhwa rating lastChapterRead overallProgress readingStatus');
    
    if (userHistory.length >= 5) {
      // Find users with similar reading patterns
      const userGenres = new Set();
      const userManhwaIds = userHistory.map(h => {
        // Collect genres from user's read manhwas
        h.manhwa.genres.forEach(g => userGenres.add(g));
        return h.manhwa._id;
      });
      
      // Find users who read similar manhwas
      const similarUsers = await ReadingHistory.aggregate([
        { 
          $match: { 
            manhwa: { $in: userManhwaIds },
            user: { $ne: userId }
          } 
        },
        {
          $group: {
            _id: '$user',
            commonManhwas: { $sum: 1 },
            manhwas: { $push: '$manhwa' }
          }
        },
        {
          $match: {
            commonManhwas: { $gte: 3 } // Users must have at least 3 manhwas in common
          }
        },
        {
          $sort: { commonManhwas: -1 }
        },
        {
          $limit: 20 // Top 20 similar users
        }
      ]);
      
      if (similarUsers.length > 0) {
        // Get manhwas read by similar users but not by current user
        const similarUserIds = similarUsers.map(u => u._id);
        const similarUserManhwas = new Set();
        
        similarUsers.forEach(u => {
          u.manhwas.forEach(m => similarUserManhwas.add(m.toString()));
        });
        
        // Remove manhwas already read by current user
        userManhwaIds.forEach(id => similarUserManhwas.delete(id.toString()));
        
        if (similarUserManhwas.size > 0) {
          // Get details of recommended manhwas
          const collaborativeRecs = await Manhwa.find({
            _id: { $in: Array.from(similarUserManhwas) },
            isActive: true
          }).select('_id title description coverImage thumbnailImage genres tags artStyle status chapters popularity');
          
          // Get ratings for these manhwas from similar users
          const manhwaRatings = await ReadingHistory.aggregate([
            {
              $match: {
                user: { $in: similarUserIds },
                manhwa: { $in: Array.from(similarUserManhwas).map(id => mongoose.Types.ObjectId(id)) }
              }
            },
            {
              $group: {
                _id: '$manhwa',
                avgRating: { $avg: '$rating' },
                readCount: { $sum: 1 }
              }
            }
          ]);
          
          // Create a map of ratings
          const ratingsMap = {};
          manhwaRatings.forEach(r => {
            ratingsMap[r._id.toString()] = {
              avgRating: r.avgRating || 3, // default to 3 if no rating
              readCount: r.readCount
            };
          });
          
          // Calculate collaborative filtering score
          const collabItems = collaborativeRecs.map(manhwa => {
            const ratingInfo = ratingsMap[manhwa._id.toString()] || { avgRating: 3, readCount: 1 };
            const popularityFactor = Math.min(1, manhwa.popularity.viewCount / 10000);
            
            // Calculate score based on similar users' ratings and popularity
            const weightedRating = (ratingInfo.avgRating / 5) * 0.6;
            const normalizedReadCount = Math.min(1, ratingInfo.readCount / 10) * 0.2;
            const score = weightedRating + normalizedReadCount + (popularityFactor * 0.2);
            
            return {
              manhwa: manhwa,
              score: parseFloat(score.toFixed(2)),
              reason: 'similar_to_read'
            };
          });
          
          // Combine and sort recommendations
          const combinedItems = [
            ...recommendations.items.slice(0, Math.floor(limit * 0.4)), // Keep 40% of popularity-based recs
            ...collabItems.slice(0, Math.ceil(limit * 0.6))  // Add 60% collaborative recs
          ].sort((a, b) => b.score - a.score)
           .slice(0, limit);
          
          recommendations.items = combinedItems;
          recommendations.metadata.confidenceScore = 0.85; // Higher confidence for standard tier
        }
      }
    }
    
    return recommendations;
  } catch (error) {
    logger.error(`Error in standard recommendations: ${error.message}`);
    // Fall back to lightweight recommendations if anything fails
    return recommendations;
  }
};

// Enhanced recommendation tier - includes content-based filtering for art style matching
const getEnhancedRecommendations = async (userId, options) => {
  try {
    // Start with standard recommendations
    let recommendations = await getStandardRecommendations(userId, options);
    
    // Get user preferences with more detail
    const user = await User.findById(userId);
    const { genres = [], artStyles = [], tags = [] } = user?.preferences || {};
    
    // Get reading history with high ratings (4-5 stars)
    const favoriteHistory = await ReadingHistory.find({ 
      user: userId,
      rating: { $gte: 4 }
    }).populate('manhwa');
    
    if (favoriteHistory.length > 0) {
      // Extract content features from favorite manhwas
      const favoriteGenres = new Set();
      const favoriteArtStyles = new Set();
      const favoriteTags = new Set();
      
      favoriteHistory.forEach(history => {
        history.manhwa.genres.forEach(g => favoriteGenres.add(g));
        history.manhwa.artStyle.forEach(a => favoriteArtStyles.add(a));
        history.manhwa.tags.forEach(t => favoriteTags.add(t));
      });
      
      // Enhance with content-based recommendations
      // Look for manhwas with similar content features
      const contentQuery = {
        isActive: true,
        _id: { $nin: favoriteHistory.map(h => h.manhwa._id) }
      };
      
      if (favoriteGenres.size > 0) {
        contentQuery.genres = { $in: Array.from(favoriteGenres) };
      }
      
      if (favoriteArtStyles.size > 0) {
        contentQuery.artStyle = { $in: Array.from(favoriteArtStyles) };
      }
      
      if (favoriteTags.size > 0) {
        contentQuery.tags = { $in: Array.from(favoriteTags) };
      }
      
      const contentBasedManhwas = await Manhwa.find(contentQuery)
        .limit(20)
        .select('_id title description coverImage thumbnailImage genres tags artStyle status chapters popularity');
      
      // Calculate content similarity scores
      const contentItems = contentBasedManhwas.map(manhwa => {
        // Calculate similarity scores for each feature
        const genreSimilarity = calculateSetSimilarity(
          new Set(manhwa.genres), 
          favoriteGenres
        );
        
        const artStyleSimilarity = calculateSetSimilarity(
          new Set(manhwa.artStyle),
          favoriteArtStyles
        );
        
        const tagSimilarity = calculateSetSimilarity(
          new Set(manhwa.tags),
          favoriteTags
        );
        
        // Weight the features
        const score = (
          genreSimilarity * 0.4 + 
          artStyleSimilarity * 0.4 + 
          tagSimilarity * 0.2
        );
        
        // Determine primary reason
        let reason = 'genre_match';
        if (artStyleSimilarity > genreSimilarity && artStyleSimilarity > tagSimilarity) {
          reason = 'art_style_match';
        } else if (tagSimilarity > genreSimilarity && tagSimilarity > artStyleSimilarity) {
          reason = 'tag_match';
        }
        
        return {
          manhwa: manhwa,
          score: parseFloat(score.toFixed(2)),
          reason
        };
      });
      
      // Combine all recommendations
      const combinedItems = [
        ...recommendations.items.slice(0, Math.floor(options.limit * 0.7)), // 70% from standard tier
        ...contentItems.slice(0, Math.ceil(options.limit * 0.3))  // 30% from content-based
      ].sort((a, b) => b.score - a.score)
       .slice(0, options.limit);
      
      recommendations.items = combinedItems;
      recommendations.metadata.confidenceScore = 0.95; // Highest confidence for enhanced tier
    }
    
    return recommendations;
  } catch (error) {
    logger.error(`Error in enhanced recommendations: ${error.message}`);
    // Fall back to standard recommendations if enhanced processing fails
    return getStandardRecommendations(userId, options);
  }
};

// Helper function to calculate similarity between two sets
function calculateSetSimilarity(set1, set2) {
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // Calculate intersection size
  let intersectionSize = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionSize++;
    }
  }
  
  // Jaccard similarity: intersection size / union size
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

// Get trending manhwas (used for non-authenticated users or new users)
exports.getTrending = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // Check if we can serve from cache
    const cachedTrending = await redis.get('trending:manhwas');
    if (cachedTrending) {
      return res.status(200).json(JSON.parse(cachedTrending));
    }
    
    // Get trending manhwas based on view count and recency
    const trending = await Manhwa.find({ isActive: true })
      .sort({ 'popularity.viewCount': -1, 'updatedAt': -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('_id title description coverImage thumbnailImage genres status chapters popularity');
    
    const response = {
      items: trending.map(manhwa => ({
        manhwa,
        score: 1.0,
        reason: 'trending'
      })),
      metadata: {
        count: trending.length,
        tier: 'lightweight'
      }
    };
    
    // Cache trending for 1 hour
    await redis.set('trending:manhwas', JSON.stringify(response), 'EX', 60 * 60);
    
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error getting trending manhwas: ${error.message}`);
    return res.status(500).json({ message: 'Error getting trending manhwas', error: error.message });
  }
}; 