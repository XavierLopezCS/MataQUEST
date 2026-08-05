// mockStore.js — shared read/write layer for the mock assignment data.
//
// Single source of truth for turning "a set of fields from a user" into a
// well-formed assignment saved into mockAssignments.json. Both the CLI
// (mockEditor.js) and the HTTP endpoint (POST /api/assignments in server.js)
// go through here, so the browser form and `npm run edit` produce identical
// data in identical shape — the shape xpCalculator.js already expects.
//
// It reuses the pure, already-tested helpers exported by mockEditor.js
// (shape detection, id assignment, validation, object building) instead of
// reimplementing them, and only adds the thin file I/O around them. The save
// path writes the same one-level `.bak` backup the CLI does.

'use strict';

const fs = require('fs');
const path = require('path');
const {
  detectShape,
  nextId,
  buildAssignment,
  addAssignment,
  parseBool,
  parseNumberOrNull,
  parseDateOrNull,
} = require('./mockEditor');

const DEFAULT_FILE = path.join(__dirname, 'mockAssignments.json');

function load(file = DEFAULT_FILE) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

function save(data, file = DEFAULT_FILE) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.bak`); // same one-level backup the CLI makes
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Validate + coerce raw input into a clean assignment, append it to the store,
 * and persist. Values in `input` may all be strings (as they arrive from a
 * form); the same mockEditor parse helpers coerce them exactly like the CLI.
 *
 * @param {object} input - raw fields (courseId, name, points_possible, due_at,
 *   has_submitted_submissions, submission_grade, submitted_at)
 * @param {object} [options]
 * @param {string} [options.file] - target JSON file (defaults to mockAssignments.json)
 * @param {Array}  [options.validCourseIds] - if given, courseId must be one of
 *   these — stops the form creating an orphan course bucket the demo won't render
 * @returns {{ok:true, assignment:object, courseId:string|null} | {ok:false, errors:string[]}}
 */
function createAssignment(input, { file = DEFAULT_FILE, validCourseIds = null } = {}) {
  const data = load(file);
  const shape = detectShape(data);
  const errors = [];

  // --- course (only meaningful for the course-keyed shape this project uses) ---
  let courseId;
  if (shape === 'byCourse') {
    courseId = String(input.courseId ?? '').trim();
    if (!courseId) {
      errors.push('Pick a course.');
    } else if (validCourseIds && !validCourseIds.map(String).includes(courseId)) {
      errors.push(`Course ${courseId} isn't one of the known courses (${validCourseIds.join(', ')}).`);
    }
  }

  // --- name ---
  const name = String(input.name ?? '').trim();
  if (!name) errors.push('Give the assignment a name.');

  // --- points ---
  const points_possible = parseNumberOrNull(input.points_possible, null);
  if (points_possible === null || points_possible < 0) {
    errors.push('Points possible must be a number of 0 or more.');
  }

  // --- submission state ---
  const due_at = parseDateOrNull(input.due_at, null);
  const has_submitted_submissions = parseBool(input.has_submitted_submissions, false);

  let submission_grade = null;
  let submitted_at = null;
  if (has_submitted_submissions) {
    // null grade = submitted but not graded yet (xpCalculator treats as no XP)
    submission_grade = parseNumberOrNull(input.submission_grade, null);
    submitted_at = parseDateOrNull(input.submitted_at, null);
    if (
      submission_grade !== null &&
      points_possible !== null &&
      submission_grade > points_possible
    ) {
      errors.push(`Grade (${submission_grade}) can't be more than points possible (${points_possible}).`);
    }
  }

  if (errors.length) return { ok: false, errors };

  const assignment = buildAssignment({
    id: nextId(data, shape),
    name,
    points_possible,
    due_at,
    has_submitted_submissions,
    submission_grade,
    submitted_at,
  });

  addAssignment(data, shape, assignment, courseId);
  save(data, file);

  return { ok: true, assignment, courseId: courseId ?? null };
}

module.exports = { load, save, createAssignment, DEFAULT_FILE };
