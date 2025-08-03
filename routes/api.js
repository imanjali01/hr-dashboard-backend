// routes/api.js
// API routes for HR Dashboard and User functionality

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login route for HR and users
router.post(
  '/login',
  [
    check('email', 'Valid email is required').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, role: user.role });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Get all jobs with application counts (supports search and sort)
router.get('/jobs', auth, async (req, res) => {
  try {
    const { search, sortBy, sortOrder = 'asc' } = req.query;
    let query = {};
    let sort = {};

    // Search by keywords
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      };
    }

    // Sort by field
    if (sortBy) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.postedDate = -1; // Default: newest first
    }

    const jobs = await Job.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'jobId',
          as: 'applications',
        },
      },
      {
        $project: {
          title: 1,
          department: 1,
          location: 1,
          postedDate: 1,
          totalApplications: { $size: '$applications' },
        },
      },
      { $sort: sort },
    ]);

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get applications for a specific job (HR only)
router.get('/jobs/:jobId/applications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const applications = await Application.find({ jobId: req.params.jobId })
      .populate('jobId', 'title department')
      .select('candidateName candidateEmail status appliedDate resume interviewRounds')
      .skip(skip)
      .limit(limit);

    const total = await Application.countDocuments({ jobId: req.params.jobId });
    res.json({ applications, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update application status (HR only)
router.put(
  '/applications/:id',
  [
    auth,
    check('status', 'Invalid status').isIn(['Applied', 'Under Review', 'Interview', 'Rejected', 'Hired']),
  ],
  async (req, res) => {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { status } = req.body;
      const application = await Application.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Get applications for logged-in user
router.get('/user/applications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const applications = await Application.find({ userId: req.user.userId })
      .populate('jobId', 'title department')
      .select('candidateName candidateEmail status appliedDate resume interviewRounds')
      .skip(skip)
      .limit(limit);

    const total = await Application.countDocuments({ userId: req.user.userId });
    res.json({
      applications,
      total,
      page,
      limit,
      progress: applications.map(app => ({
        jobId: app.jobId._id,
        title: app.jobId.title,
        progress: (app.interviewRounds / 4) * 100 // Calculate % progress
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Updating interview progress (HR only)
router.put('/applications/:id/progress', auth, async (req, res) => {
  if (req.user.role !== 'hr') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const { interviewRounds } = req.body;
    if (!Number.isInteger(interviewRounds) || interviewRounds < 0 || interviewRounds > 4) {
      return res.status(400).json({ message: 'Invalid interviewRounds (0-4)' });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { interviewRounds },
      { new: true }
    );
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({
      ...application.toObject(),
      progress: (application.interviewRounds / 4) * 100,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;