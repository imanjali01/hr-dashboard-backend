// seed.js
// Seeds hr_dashboard_v2 with test data for HR and user functionality

const mongoose = require('mongoose');
const Job = require('./models/Job');
const Application = require('./models/Application');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const seedDB = async () => {
  await connectDB();
  await Job.deleteMany({});
  await Application.deleteMany({});
  await User.deleteMany({});

  // Create HR user
  const hrUser = await User.create({
    email: 'hr_v2@example.com',
    password: await bcrypt.hash('password123', 10),
    role: 'hr',
  });

  // Create regular user
  const regularUser = await User.create({
    email: 'user@example.com',
    password: await bcrypt.hash('password123', 10),
    role: 'user',
  });

  // Create sample job
  const job = await Job.create({
    title: 'Product Manager',
    department: 'Product',
    location: 'On-site',
  });

  // Create sample applications
  await Application.create([
    {
      jobId: job._id,
      userId: regularUser._id,
      candidateName: 'Chris Lee',
      candidateEmail: 'chris@example.com',
      resume: 'http://example.com/resume_chris.pdf',
      status: 'Applied',
      interviewRounds: 0,
    },
    {
      jobId: job._id,
      userId: regularUser._id,
      candidateName: 'Diana Chen',
      candidateEmail: 'diana@example.com',
      resume: 'http://example.com/resume_diana.pdf',
      status: 'Under Review',
      interviewRounds: 1,
    },
  ]);

  console.log('Database hr_dashboard seeded successfully');
  mongoose.connection.close();
};

seedDB().catch((error) => {
  console.error('Seeding error:', error);
  process.exit(1);
});