const mongoose = require('mongoose');

const ManhwaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  alternativeTitles: [String],
  description: {
    type: String,
    required: true
  },
  coverImage: {
    type: String, // URL to image
    required: true
  },
  thumbnailImage: {
    type: String // Smaller version for listings
  },
  author: {
    type: String,
    required: true,
    index: true
  },
  artist: String,
  status: {
    type: String,
    enum: ['Ongoing', 'Completed', 'Hiatus', 'Cancelled'],
    default: 'Ongoing'
  },
  releaseYear: Number,
  country: {
    type: String,
    enum: ['Korea', 'China', 'Japan', 'Other'],
    default: 'Korea'
  },
  type: {
    type: String,
    enum: ['Manhwa', 'Manhua', 'Manga', 'Webtoon', 'Other'],
    default: 'Manhwa'
  },
  genres: [{
    type: String,
    enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Martial Arts', 'Historical', 'Psychological'],
    index: true
  }],
  tags: [{
    type: String,
    index: true
  }],
  contentRating: {
    type: String,
    enum: ['Everyone', 'Teen', 'Mature', 'Adult'],
    default: 'Teen'
  },
  chapters: {
    total: {
      type: Number,
      default: 0
    },
    latest: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  artStyle: [{
    type: String,
    enum: ['Realistic', 'Cartoon', 'Chibi', 'Sketch', 'Watercolor', '3D', 'Minimalist']
  }],
  popularity: {
    viewCount: {
      type: Number,
      default: 0
    },
    favoriteCount: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  similarManhwas: [{
    manhwa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manhwa'
    },
    similarityScore: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  featureVector: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // For AI recommendation calculations
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search functionality
ManhwaSchema.index({ title: 'text', description: 'text' });

// Virtual for calculating average rating
ManhwaSchema.virtual('averageRating').get(function() {
  return this.popularity.ratingCount > 0 
    ? this.popularity.rating / this.popularity.ratingCount 
    : 0;
});

// Method to get basic info for listings
ManhwaSchema.methods.getBasicInfo = function() {
  return {
    id: this._id,
    title: this.title,
    coverImage: this.thumbnailImage || this.coverImage,
    genres: this.genres,
    status: this.status,
    chapters: this.chapters.total,
    rating: this.averageRating,
    author: this.author,
    type: this.type
  };
};

// Method to update popularity
ManhwaSchema.methods.updateRating = function(newRating) {
  this.popularity.rating += newRating;
  this.popularity.ratingCount += 1;
  return this.save();
};

const Manhwa = mongoose.model('Manhwa', ManhwaSchema);

module.exports = Manhwa; 