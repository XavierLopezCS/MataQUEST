// server.js — Mock Canvas LMS API
// Mimics the shape of the real Canvas REST API so the rest of the app
// (frontend, XP logic, etc.) can be built against it before real
// Canvas OAuth/access is sorted out.

require('dotenv').config( { quiet: true} );
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { calculateCourseXP } = require('./xpCalculator');
const { router: authRouter, ensureValidToken } = require('./auth');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
}));

app.use('/auth', authRouter);

const PORT = 3001;

// ---- Fake in-memory "Canvas" data ---
// This is a test but with a Canvas API we would not need this

const courses = [
  { id: 101, name: "COMP 380: Software Engineering", course_code: "COMP380" },
  { id: 102, name: "MATH 210: Discrete Structures", course_code: "MATH210" }
];

const assignments = {
  101: [
    {
      id: 1,
      name: "Project Proposal",
      points_possible: 10,
      due_at: "07-15-2026",
      has_submitted_submissions: true,
      submission_grade: 10
    },
    {
      id: 2,
      name: "Sprint 1 Report",
      points_possible: 20,
      due_at: "07-22-2026",
      has_submitted_submissions: false,
      submission_grade: null
    }
  ],
  102: [
    {
      id: 3,
      name: "Problem Set 1",
      points_possible: 15,
      due_at: "07-18-2026",
      has_submitted_submissions: true,
      submission_grade: 15
    }
  ]
};

// GET /api/v1/courses

app.get('/api/protected/ping', ensureValidToken, (req, res) => {
  res.json({ message: "You're authenticated! This route required a valid session." });
});

app.get('/api/v1/courses', (req, res) => {
  res.json(courses);
});

// GET /api/v1/courses/:id/assignments
app.get('/api/v1/courses/:id/assignments', (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const list = assignments[courseId];
  if (!list) return res.status(404).json({ error: "Course not found" });
  res.json(list);
});

// GET /api/v1/users/self  (stand-in for "current logged in user")
app.get('/api/v1/users/self', (req, res) => {
  res.json({ id: 42, name: "Test Student", login_id: "tstudent01" });
});

// GET /api/xp/:courseId — NOT a real Canvas endpoint; this is our own
// app-specific endpoint that runs the XP calculator over a course's
// assignments and returns total XP + trophy counts.

app.get('/api/xp/:courseId', (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const list = assignments[courseId];
  if (!list) return res.status(404).json({ error: "Course not found" });

  const result = calculateCourseXP(list);
  res.json(result);
});

app.get('/', (req, res) => {
  res.send('Mock Canvas API is running. Try /api/v1/courses');
});

app.listen(PORT, () => {
  console.log(`Mock Canvas API listening on http://localhost:${PORT}`);
});