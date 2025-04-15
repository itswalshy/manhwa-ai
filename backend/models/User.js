const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  preferences: {
    genres: [{
      type: String,
      enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Martial Arts', 'Historical', 'Psychological']
    }],
    artStyles: [{
      type: String,
      enum: ['Realistic', 'Cartoon', 'Chibi', 'Sketch', 'Watercolor', '3D', 'Minimalist']
    }],
    tags: [String],
    excludedTags: [String]
  },
  readingHistory: [{
    manhwa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manhwa'
    },
    lastChapterRead: Number,
    progress: Number, // Percentage of completion
    dateRead: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 0,
      max: 5
    }
  }],
  recommendationProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Will store derived preference vectors
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user profile without sensitive information
UserSchema.methods.getProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    preferences: this.preferences,
    readingHistoryCount: this.readingHistory.length,
    isActive: this.isActive,
    lastActive: this.lastActive,
    createdAt: this.createdAt
  };
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 