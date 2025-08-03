const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String },
  postedDate: { type: Date, default: Date.now },
});

// Indexing for search and sort
jobSchema.index({ title: 'text', department: 'text', location: 'text' });
jobSchema.index({ postedDate: -1 });

module.exports = mongoose.model('Job', jobSchema);