const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to user
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  resume: { type: String },
  status: { 
    type: String, 
    enum: ['Applied', 'Under Review', 'Interview', 'Rejected', 'Hired'], 
    default: 'Applied' 
  },
  interviewRounds: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 4 // Max 4 rounds
  },
  appliedDate: { type: Date, default: Date.now },
});

// Indexes for performance
applicationSchema.index({ jobId: 1, appliedDate: -1 });
applicationSchema.index({ userId: 1, appliedDate: -1 });

module.exports = mongoose.model('Application', applicationSchema);