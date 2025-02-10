const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: [true, 'SpotifyId is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Track name is required'],
    trim: true
  },
  youtubeUrl: {
    type: String,
    required: [true, 'YouTube URL is required'],
    trim: true
  },
  gridFsFileId: {
    type: mongoose.Types.ObjectId,
    required: [true, 'GridFS File ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  strict: true
});

// Add validation middleware
trackSchema.pre('save', async function(next) {
  try {
    if (!this._id) {
      throw new Error('SpotifyId (_id) is required');
    }
    
    // Check if a track with this ID already exists
    const existingTrack = await mongoose.model('Track').findById(this._id);
    if (existingTrack) {
      throw new Error(`Track with ID ${this._id} already exists`);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Add error handling middleware
trackSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Track with this ID already exists'));
  } else {
    next(error);
  }
});

const Track = mongoose.model('Track', trackSchema);

module.exports = Track;