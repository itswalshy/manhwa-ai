const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recommendations: [{
    manhwa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manhwa'
    },
    score: {
      type: Number,
      min: 0,
      max: 1
    },
    reason: {
      type: String,
      enum: ['genre_match', 'similar_to_read', 'popular_in_preferences', 'trending', 'art_style_match', 'tag_match', 'user_behavior']
    },
    weight: {
      type: Number,
      default: 1
    }
  }],
  generatedBy: {
    type: String,
    enum: ['lightweight', 'standard', 'enhanced'],
    default: 'lightweight'
  },
  isPersonalized: {
    type: Boolean,
    default: false
  },
  filters: {
    genres: [String],
    tags: [String],
    excludedTags: [String],
    contentRating: [String],
    status: [String]
  },
  metadata: {
    processingTime: Number, // in milliseconds
    algorithmVersion: String,
    itemsConsidered: Number,
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Expire after 24 hours by default
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
    },
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// TTL index to automatically remove expired recommendations
RecommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to format recommendations for API response
RecommendationSchema.methods.formatForResponse = function() {
  return {
    id: this._id,
    recommendedItems: this.recommendations.map(rec => ({
      manhwaId: rec.manhwa,
      score: rec.score,
      reason: rec.reason
    })),
    generatedBy: this.generatedBy,
    isPersonalized: this.isPersonalized,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt
  };
};

const Recommendation = mongoose.model('Recommendation', RecommendationSchema);

module.exports = Recommendation; 