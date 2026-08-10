// server.js — Mock Canvas LMS API
// Mimics the shape of the real Canvas REST API so the rest of the app
// (frontend, XP logic, etc.) can be built against it before real
// Canvas OAuth/access is sorted out.
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config( { quiet: true} );
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { calculateCourseXP, calculateAssignmentXP } = require('./xpCalculator');
const { router: authRouter, ensureValidToken } = require('./auth');
const mockStore = require('./mockStore');
const xpStore = require('./xpStore');
const { connectDB } = require('./db');

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

// Mock assignments now live in mockAssignments.json so they can be edited
// with the mockEditor.cjs tool. We read the file FRESH on each request (rather
// than require(), which caches) so edits show up on a browser refresh without
// needing to restart the server.
const MOCK_ASSIGNMENTS_FILE = path.join(__dirname, 'mockAssignments.json');

function loadAssignments() {
  const raw = fs.readFileSync(MOCK_ASSIGNMENTS_FILE, 'utf8');
  return JSON.parse(raw);
}

// GET /api/v1/courses

app.get('/api/protected/ping', ensureValidToken, (req, res) => {
  res.json({ message: "You're authenticated! This route required a valid session." });
});

app.get('/api/v1/courses', (req, res) => {
  res.json(courses);
});

// GET /api/v1/courses/:id/assignments
app.get('/api/v1/courses/:id/assignments', (req, res) => {
  const assignments = loadAssignments();
  const list = assignments[req.params.id];
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
  const assignments = loadAssignments();
  const list = assignments[req.params.courseId];
  if (!list) return res.status(404).json({ error: "Course not found" });

  const result = calculateCourseXP(list);
  res.json(result);
});

// POST /api/assignments — manual assignment entry (SCRUM-261).
// NOT a real Canvas endpoint. With no live Canvas sync, this is how
// assignments get into the mock store from the browser. It goes through
// mockStore, so it produces byte-for-byte the same data that `npm run edit`
// does, and the new assignment shows up on the next demo.html refresh.
app.post('/api/assignments', (req, res) => {
  try {
    const result = mockStore.createAssignment(req.body, {
      validCourseIds: courses.map(c => c.id),
    });
    if (!result.ok) {
      return res.status(400).json({ error: 'Validation failed', details: result.errors });
    }
    res.status(201).json({
      message: `Added "${result.assignment.name}" to course ${result.courseId}.`,
      assignment: result.assignment,
    });
  } catch (err) {
    console.error('Failed to add assignment:', err);
    res.status(500).json({ error: 'Could not save assignment', details: err.message });
  }
});

// ---- helper: look up a single assignment by course + assignment id ----
// Reads fresh from mockAssignments.json each time, same pattern as the
// rest of this file, so it stays in sync with edits made via mockStore.
function findAssignment(courseId, assignmentId) {
  const assignments = loadAssignments();
  const list = assignments[courseId];
  if (!list) return null;
  return list.find(a => String(a.id) === String(assignmentId)) || null;
}

// POST /api/xp/award — award XP for one completed assignment.
// Body: { userId, courseId, assignmentId, submittedAt? }
// Persists the award in MongoDB (idempotent — an assignment can only be
// awarded once per user).
app.post('/api/xp/award', async (req, res) => {
  try {
    const { userId, courseId, assignmentId, submittedAt } = req.body || {};

    if (userId === undefined || courseId === undefined || assignmentId === undefined) {
      return res.status(400).json({ error: "userId, courseId, and assignmentId are required" });
    }

    const assignment = findAssignment(String(courseId), assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found for that course" });
    }

    if (await xpStore.hasAwarded(userId, courseId, assignmentId)) {
      return res.status(409).json({ error: "XP for this assignment has already been awarded to this user" });
    }

    const result = calculateAssignmentXP(assignment, submittedAt);

    if (result.xp === 0 && result.breakdown.reason === "not_submitted") {
      return res.status(400).json({ error: "Assignment has not been submitted/graded yet — no XP to award" });
    }

    const { xpAfter } = await xpStore.awardXP(userId, {
      courseId,
      assignmentId,
      xp: result.xp,
      trophy: result.trophy,
      gradePercent: result.gradePercent,
      breakdown: result.breakdown
    });

    res.status(201).json({
      awarded: {
        courseId,
        assignmentId,
        assignmentName: assignment.name,
        xp: result.xp,
        trophy: result.trophy,
        gradePercent: result.gradePercent
      },
      totalXP: xpAfter
    });
  } catch (err) {
    console.error('POST /api/xp/award failed:', err.message);
    res.status(500).json({ error: 'Failed to award XP', details: err.message });
  }
});

// GET /api/user/progress — a user's total XP and per-assignment trophy
// counts.
// Query: ?userId=42
app.get('/api/user/progress', async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId === undefined) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }

    const progress = await xpStore.getUserProgress(userId);

    res.json({
      userId,
      totalXP: progress.totalXP,
      assignmentsCompleted: progress.assignmentsCompleted,
      trophies: progress.trophies,
      history: progress.history
    });
  } catch (err) {
    console.error('GET /api/user/progress failed:', err.message);
    res.status(500).json({ error: 'Failed to load progress', details: err.message });
  }
});

// GET /api/dashboard — aggregation endpoint combining all courses:
// XP available vs. XP actually earned per course. Powers the main
// dashboard view.
// Query: ?userId=42
app.get('/api/dashboard', async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId === undefined) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }

    const allAssignments = loadAssignments();

    const courseBreakdown = await Promise.all(courses.map(async course => {
      const courseAssignments = allAssignments[course.id] || [];
      const possible = calculateCourseXP(courseAssignments); // XP if everything is completed as-is
      const earnedHistory = await xpStore.getUserHistoryForCourse(userId, course.id);
      const earnedXP = earnedHistory.reduce((sum, h) => sum + h.xp, 0);

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.course_code,
        possibleXP: possible.totalXP,
        earnedXP,
        assignmentsAwarded: earnedHistory.length,
        assignmentsTotal: courseAssignments.length
      };
    }));

    const progress = await xpStore.getUserProgress(userId);

    res.json({
      userId,
      totalXP: progress.totalXP,
      trophies: progress.trophies,
      courses: courseBreakdown
    });
  } catch (err) {
    console.error('GET /api/dashboard failed:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Mock Canvas API is running. Try /api/v1/courses');
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Mock Canvas API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();