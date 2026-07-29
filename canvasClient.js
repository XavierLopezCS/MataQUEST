// canvasClient.js — Real Canvas LMS API client
//
// This is the live counterpart to the fake data in server.js.
// NOTHING IN HERE IS ACTIVE YET — server.js still serves mock data only.
// See "Switching to live Canvas" at the bottom of this file for the swap.
//
// Every function that actually talks over the network to Canvas is marked
// with a "// CANVAS API CALL" comment.
//
// Conventions matched to the rest of the project:
//   - CommonJS (project is "type": "commonjs")
//   - axios (same HTTP client as auth.js)
//   - CANVAS_DOMAIN includes the protocol, e.g. https://csun.instructure.com
//   - access token lives at req.session.canvasToken (set by auth.js)

const axios = require('axios');

const API_BASE = () => `${process.env.CANVAS_DOMAIN}/api/v1`;

/**
 * Shared authenticated GET against the Canvas REST API.
 * Token refresh is already handled upstream by ensureValidToken in auth.js,
 * so by the time we get here the token in session should be valid.
 *
 * @param {string} path - path after /api/v1, e.g. "/courses"
 * @param {string} token - Canvas access token (req.session.canvasToken)
 * @param {object} params - optional query params
 */
async function canvasGet(path, token, params = {}) {
  if (!token) {
    throw new Error('No Canvas access token. User must log in via /auth/login first.');
  }

  // CANVAS API CALL: all live Canvas reads funnel through this request
  const res = await axios.get(`${API_BASE()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });

  return res.data;
}

// ---------------------------------------------------------------------------
// Raw Canvas fetchers
// ---------------------------------------------------------------------------

/**
 * The user's active courses.
 * Returns the same fields the mock server's /api/v1/courses returns
 * (id, name, course_code), plus whatever else Canvas sends.
 */
async function fetchCourses(token) {
  // CANVAS API CALL: GET /courses
  return canvasGet('/courses', token, {
    enrollment_state: 'active',
    per_page: 50,
  });
}

/**
 * Assignments for one course, WITH the current user's submission inlined.
 *
 * The `include[]=submission` param is the important bit — it saves us from
 * making a second API call per assignment just to find out whether the
 * student submitted it and what they scored.
 */
async function fetchAssignments(token, courseId) {
  // CANVAS API CALL: GET /courses/:id/assignments?include[]=submission
  return canvasGet(`/courses/${courseId}/assignments`, token, {
    'include[]': 'submission',
    per_page: 100,
  });
}

/** The logged-in user's profile — real equivalent of mock /api/v1/users/self */
async function fetchSelf(token) {
  // CANVAS API CALL: GET /users/self
  return canvasGet('/users/self', token);
}

// ---------------------------------------------------------------------------
// Normalization — the actual "glue" between real Canvas and our XP logic
// ---------------------------------------------------------------------------
//
// Real Canvas does NOT return the same field names the mock data uses.
// The mock assignment objects look like this:
//
//   { id, name, points_possible, due_at,
//     has_submitted_submissions: true, submission_grade: 10 }
//
// Real Canvas returns points_possible / due_at / name / id the same way,
// but submission info comes back nested under `submission`:
//
//   { id, name, points_possible, due_at,
//     submission: { workflow_state: "graded", score: 10,
//                   submitted_at: "2026-07-14T18:22:00Z" } }
//
// So this function flattens real Canvas assignments into the mock's shape.
// That means xpCalculator.js works on live data with ZERO changes to it.

/**
 * @param {object} canvasAssignment - a raw assignment object from Canvas
 * @returns {object} assignment shaped the way xpCalculator.js expects
 */
function normalizeAssignment(canvasAssignment) {
  const sub = canvasAssignment.submission || {};

  // Canvas marks unsubmitted work with workflow_state "unsubmitted".
  // Anything else (submitted / pending_review / graded) means they turned it in.
  const submitted =
    Boolean(sub.submitted_at) ||
    (sub.workflow_state && sub.workflow_state !== 'unsubmitted');

  return {
    id: canvasAssignment.id,
    name: canvasAssignment.name,
    points_possible: canvasAssignment.points_possible ?? 0,
    due_at: canvasAssignment.due_at, // real Canvas sends ISO 8601
    has_submitted_submissions: Boolean(submitted),

    // Canvas calls it `score`; our XP logic calls it `submission_grade`.
    // Ungraded-but-submitted work comes back with score === null, which
    // xpCalculator already treats as "no XP yet" — that's correct behavior.
    submission_grade: sub.score ?? null,

    // NOT in the mock data, but real Canvas gives us this — it's what makes
    // the on-time bonus / late penalty in xpCalculator actually work.
    // (See the note in README about wiring this through.)
    submitted_at: sub.submitted_at ?? null,
  };
}

/** Normalize a whole course's worth of assignments. */
function normalizeAssignments(canvasAssignments) {
  return canvasAssignments.map(normalizeAssignment);
}

/**
 * Convenience: fetch + normalize in one call.
 * This is the function server.js would use when we flip to live mode —
 * it returns assignments already in the exact shape calculateCourseXP wants.
 */
async function getCourseAssignmentsForXP(token, courseId) {
  const raw = await fetchAssignments(token, courseId);
  return normalizeAssignments(raw);
}

// ---------------------------------------------------------------------------
// Switching to live Canvas (for later — do NOT do this yet)
// ---------------------------------------------------------------------------
//
// Once we have a real developer key and the values in .env are real, the
// swap in server.js is small. The mock route:
//
//   app.get('/api/v1/courses/:id/assignments', (req, res) => {
//     const list = assignments[parseInt(req.params.id, 10)];
//     ...
//     res.json(list);
//   });
//
// becomes:
//
//   const canvas = require('./canvasClient');
//
//   app.get('/api/v1/courses/:id/assignments', ensureValidToken, async (req, res) => {
//     try {
//       const list = await canvas.getCourseAssignmentsForXP(
//         req.session.canvasToken,
//         req.params.id
//       );
//       res.json(list);
//     } catch (err) {
//       res.status(502).json({ error: 'Canvas request failed', details: err.message });
//     }
//   });
//
// The XP route and xpCalculator.js need no changes at all, because
// normalizeAssignment() hands them the field names they already use.

module.exports = {
  fetchCourses,
  fetchAssignments,
  fetchSelf,
  normalizeAssignment,
  normalizeAssignments,
  getCourseAssignmentsForXP,
};
