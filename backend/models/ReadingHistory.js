const mongoose = require('mongoose');

const ReadingHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  manhwa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manhwa',
    required: true,
    index: true
  },
  chapters: [{
    chapterNumber: {
      type: Number,
      required: true
    },
    dateRead: {
      type: Date,
      default: Date.now
    },
    readDuration: Number, // in seconds
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    }
  }],
  lastChapterRead: {
    type: Number,
    default: 0
  },
  overallProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  favorite: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  readingStatus: {
    type: String,
    enum: ['Reading', 'Completed', 'On Hold', 'Dropped', 'Plan to Read'],
    default: 'Reading'
  },
  notes: String,
  deviceInfo: {
    type: String,
    default: 'Unknown'
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

// Compound index for faster queries
ReadingHistorySchema.index({ user: 1, manhwa: 1 }, { unique: true });

// Index for time-based queries
ReadingHistorySchema.index({ user: 1, updatedAt: -1 });

// Method to update reading progress
ReadingHistorySchema.methods.updateProgress = function(chapterNumber, completionPercentage = 100, readDuration = 0) {
  // Find if chapter already exists
  const existingChapterIndex = this.chapters.findIndex(ch => ch.chapterNumber === chapterNumber);
  
  if (existingChapterIndex >= 0) {
    // Update existing chapter
    this.chapters[existingChapterIndex].dateRead = new Date();
    this.chapters[existingChapterIndex].completionPercentage = completionPercentage;
    this.chapters[existingChapterIndex].readDuration = readDuration;
  } else {
    // Add new chapter
    this.chapters.push({
      chapterNumber,
      dateRead: new Date(),
      completionPercentage,
      readDuration
    });
  }
  
  // Update last chapter read if this is further
  if (chapterNumber > this.lastChapterRead) {
    this.lastChapterRead = chapterNumber;
  }
  
  // Mark as modified and save
  this.markModified('chapters');
  return this.save();
};

// Method to calculate reading statistics
ReadingHistorySchema.methods.getReadingStats = function() {
  const totalChapters = this.chapters.length;
  const totalTime = this.chapters.reduce((sum, chapter) => sum + (chapter.readDuration || 0), 0);
  const averageTimePerChapter = totalChapters > 0 ? totalTime / totalChapters : 0;
  
  return {
    totalChapters,
    lastRead: this.updatedAt,
    totalTimeSpent: totalTime,
    averageTimePerChapter,
    readingStatus: this.readingStatus,
    overallProgress: this.overallProgress,
    rating: this.rating
  };
};

const ReadingHistory = mongoose.model('ReadingHistory', ReadingHistorySchema);

module.exports = ReadingHistory; 