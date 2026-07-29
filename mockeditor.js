#!/usr/bin/env node
/**
 * mockEditor.js — interactive editor for MataQUEST mock assignment data.
 *
 * Since we're staying on mock data (no live Canvas), this lets you add, edit,
 * or delete assignments without hand-editing JSON and risking a syntax error
 * that breaks server.js.
 *
 * Run:   node mockEditor.js [path-to-json]
 * Default path: ./mockAssignments.json
 *
 * Works with either JSON shape:
 *   1) Flat array:            [ {assignment}, {assignment}, ... ]
 *   2) Course-keyed object:   { "1": [ {assignment} ], "2": [ ... ] }
 *      (this is the shape server.js uses — assignments[courseId])
 *   3) Wrapped:               { "assignments": [ {assignment}, ... ] }
 *
 * The mock assignment schema (matches xpCalculator.js expectations):
 *   id                        number   unique
 *   name                      string
 *   points_possible           number
 *   due_at                    string   YYYY-MM-DD (or full ISO 8601), or null
 *   has_submitted_submissions boolean
 *   submission_grade          number   or null (null = submitted, not yet graded)
 *   submitted_at              string   YYYY-MM-DD (or full ISO 8601), or null (drives on-time vs late XP)
 *
 * Zero dependencies — Node built-ins only. Writes a .bak backup before saving.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const FILE = process.argv[2] || path.resolve(process.cwd(), 'mockAssignments.json');

// ---------------------------------------------------------------------------
// Pure data helpers (no I/O) — these are the testable core.
// ---------------------------------------------------------------------------

/** Figure out which of the supported shapes `data` is. */
function detectShape(data) {
  if (Array.isArray(data)) return 'array';
  if (data && typeof data === 'object') {
    if (Array.isArray(data.assignments)) return 'wrapped';
    const vals = Object.values(data);
    if (vals.length > 0 && vals.every((v) => Array.isArray(v))) return 'byCourse';
  }
  return 'unknown';
}

/** Return the array of assignments for a given course key (byCourse only). */
function courseKeys(data, shape) {
  return shape === 'byCourse' ? Object.keys(data) : [];
}

/**
 * Flatten every assignment across the file into a uniform list of
 * { courseId, assignment } records. courseId is null for flat/wrapped shapes.
 */
function listAll(data, shape) {
  if (shape === 'array') return data.map((a) => ({ courseId: null, assignment: a }));
  if (shape === 'wrapped') return data.assignments.map((a) => ({ courseId: null, assignment: a }));
  if (shape === 'byCourse') {
    const out = [];
    for (const key of Object.keys(data)) {
      for (const a of data[key]) out.push({ courseId: key, assignment: a });
    }
    return out;
  }
  return [];
}

/** Highest existing id across the whole file, + 1. Falls back to 1. */
function nextId(data, shape) {
  const ids = listAll(data, shape)
    .map((r) => Number(r.assignment.id))
    .filter((n) => Number.isFinite(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

/** Locate an assignment by id. Returns { arrayRef, index, courseId } or null. */
function findById(data, shape, id) {
  const target = Number(id);
  if (shape === 'array' || shape === 'wrapped') {
    const arr = shape === 'array' ? data : data.assignments;
    const index = arr.findIndex((a) => Number(a.id) === target);
    return index === -1 ? null : { arrayRef: arr, index, courseId: null };
  }
  if (shape === 'byCourse') {
    for (const key of Object.keys(data)) {
      const index = data[key].findIndex((a) => Number(a.id) === target);
      if (index !== -1) return { arrayRef: data[key], index, courseId: key };
    }
  }
  return null;
}

/** Insert a new assignment. For byCourse, courseId picks/creates the bucket. */
function addAssignment(data, shape, assignment, courseId) {
  if (shape === 'array') {
    data.push(assignment);
  } else if (shape === 'wrapped') {
    data.assignments.push(assignment);
  } else if (shape === 'byCourse') {
    const key = String(courseId);
    if (!Array.isArray(data[key])) data[key] = [];
    data[key].push(assignment);
  }
  return data;
}

/** Remove an assignment by id. Returns the removed object, or null. */
function deleteById(data, shape, id) {
  const hit = findById(data, shape, id);
  if (!hit) return null;
  const [removed] = hit.arrayRef.splice(hit.index, 1);
  return removed;
}

/** Build a well-formed assignment object with sane defaults. */
function buildAssignment(fields) {
  return {
    id: fields.id,
    name: fields.name ?? 'Untitled assignment',
    points_possible: fields.points_possible ?? 0,
    due_at: fields.due_at ?? null,
    has_submitted_submissions: fields.has_submitted_submissions ?? false,
    submission_grade: fields.submission_grade ?? null,
    submitted_at: fields.submitted_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Value parsing / validation
// ---------------------------------------------------------------------------

function parseBool(raw, fallback) {
  const s = String(raw).trim().toLowerCase();
  if (s === '') return fallback;
  if (['y', 'yes', 'true', '1'].includes(s)) return true;
  if (['n', 'no', 'false', '0'].includes(s)) return false;
  return fallback;
}

function parseNumberOrNull(raw, fallback) {
  const s = String(raw).trim();
  if (s === '') return fallback;
  if (s.toLowerCase() === 'null') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Accept "YYYY-MM-DD" or full ISO 8601 and return a normalized string.
 * A date-only value is stored as-is ("YYYY-MM-DD"); a value that includes a
 * time is stored as full ISO 8601. Empty string keeps the fallback; the
 * literal "null" clears to null.
 */
function parseDateOrNull(raw, fallback) {
  const s = String(raw).trim();
  if (s === '') return fallback;
  if (s.toLowerCase() === 'null') return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const normalized = dateOnly ? `${s}T00:00:00` : s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return fallback;

  // Keep date-only inputs clean (YYYY-MM-DD); only add a time when one was given.
  return dateOnly ? s : d.toISOString();
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function loadFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

function saveFile(file, data) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.bak`); // one-level safety net
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Interactive shell
// ---------------------------------------------------------------------------

/**
 * Queue-based line reader. Unlike rl.question(), this buffers every incoming
 * line so nothing is dropped when input arrives faster than we consume it
 * (e.g. piped/scripted input). Returns null once stdin closes (EOF).
 */
function makeReader(rl) {
  const queue = [];
  const waiters = [];
  let closed = false;
  rl.on('line', (line) => {
    if (waiters.length) waiters.shift()(line);
    else queue.push(line);
  });
  rl.on('close', () => {
    closed = true;
    while (waiters.length) waiters.shift()(null);
  });
  return (prompt) => {
    if (prompt) process.stdout.write(prompt);
    if (queue.length) return Promise.resolve(queue.shift());
    if (closed) return Promise.resolve(null);
    return new Promise((resolve) => waiters.push(resolve));
  };
}

// makeAsk kept for the tiny pre-load prompt; delegates to the reader.
function makeAsk(rl) {
  const read = makeReader(rl);
  return (q) => read(q).then((v) => (v === null ? '' : v));
}

function fmtAssignment(a, courseId) {
  const grade = a.submission_grade === null || a.submission_grade === undefined ? '—' : a.submission_grade;
  const sub = a.has_submitted_submissions ? 'submitted' : 'not submitted';
  const course = courseId != null ? `[course ${courseId}] ` : '';
  return `  #${a.id}  ${course}${a.name}\n` +
         `        ${a.points_possible} pts · due ${a.due_at ?? '—'} · ${sub} · grade ${grade}` +
         (a.submitted_at ? ` · submitted ${a.submitted_at}` : '');
}

function printAll(data, shape) {
  const all = listAll(data, shape);
  if (all.length === 0) {
    console.log('\n(no assignments yet)\n');
    return;
  }
  console.log('');
  for (const { courseId, assignment } of all) console.log(fmtAssignment(assignment, courseId));
  console.log(`\n${all.length} assignment(s) total.\n`);
}

async function promptNewAssignment(ask, data, shape) {
  const id = nextId(data, shape);
  console.log(`\nNew assignment (auto id: ${id}). Press Enter to accept defaults.\n`);

  const name = (await ask('  Name: ')).trim() || 'Untitled assignment';
  const points_possible = parseNumberOrNull(await ask('  Points possible [0]: '), 0) ?? 0;
  const due_at = parseDateOrNull(await ask('  Due date (YYYY-MM-DD, blank = none): '), null);
  const has_submitted_submissions = parseBool(await ask('  Submitted? (y/N): '), false);

  let submission_grade = null;
  let submitted_at = null;
  if (has_submitted_submissions) {
    submission_grade = parseNumberOrNull(await ask('  Grade (blank/null = not graded yet): '), null);
    submitted_at = parseDateOrNull(await ask('  Submitted-at date (YYYY-MM-DD, blank = none): '), null);
  }

  let courseId;
  if (shape === 'byCourse') {
    const keys = courseKeys(data, shape);
    console.log(`  Existing course ids: ${keys.join(', ') || '(none)'}`);
    courseId = (await ask('  Course id for this assignment: ')).trim() || keys[0] || '1';
  }

  const assignment = buildAssignment({
    id, name, points_possible, due_at, has_submitted_submissions, submission_grade, submitted_at,
  });
  addAssignment(data, shape, assignment, courseId);
  console.log(`\n✓ Added #${id} "${name}".\n`);
}

async function promptEditAssignment(ask, data, shape) {
  const idRaw = (await ask('\n  Edit which id? ')).trim();
  const hit = findById(data, shape, idRaw);
  if (!hit) {
    console.log(`  No assignment with id ${idRaw}.\n`);
    return;
  }
  const a = hit.arrayRef[hit.index];
  console.log('\nCurrent value:');
  console.log(fmtAssignment(a, hit.courseId));
  console.log('\nPress Enter to keep a field unchanged. Type "null" to clear a nullable field.\n');

  a.name = (await ask(`  Name [${a.name}]: `)).trim() || a.name;
  a.points_possible = parseNumberOrNull(await ask(`  Points possible [${a.points_possible}]: `), a.points_possible);
  a.due_at = parseDateOrNull(await ask(`  Due date [${a.due_at ?? 'none'}]: `), a.due_at);
  a.has_submitted_submissions = parseBool(
    await ask(`  Submitted? [${a.has_submitted_submissions ? 'y' : 'n'}]: `),
    a.has_submitted_submissions
  );
  a.submission_grade = parseNumberOrNull(await ask(`  Grade [${a.submission_grade ?? 'null'}]: `), a.submission_grade);
  a.submitted_at = parseDateOrNull(await ask(`  Submitted-at [${a.submitted_at ?? 'none'}]: `), a.submitted_at);

  console.log(`\n✓ Updated #${a.id}.\n`);
}

async function promptDeleteAssignment(ask, data, shape) {
  const idRaw = (await ask('\n  Delete which id? ')).trim();
  const hit = findById(data, shape, idRaw);
  if (!hit) {
    console.log(`  No assignment with id ${idRaw}.\n`);
    return;
  }
  const a = hit.arrayRef[hit.index];
  const confirm = await ask(`  Delete #${a.id} "${a.name}"? (y/N): `);
  if (parseBool(confirm, false)) {
    deleteById(data, shape, idRaw);
    console.log(`\n✓ Deleted #${idRaw}.\n`);
  } else {
    console.log('  Cancelled.\n');
  }
}

async function main() {
  // Load, or offer to create a starter file.
  let data;
  let shape;
  if (!fs.existsSync(FILE)) {
    console.log(`No file at ${FILE}.`);
    const rlTmp = readline.createInterface({ input: process.stdin, output: process.stdout });
    const askTmp = makeAsk(rlTmp);
    const create = await askTmp('Create a new course-keyed file here? (Y/n): ');
    rlTmp.close();
    if (!parseBool(create, true)) {
      console.log('Nothing to do.');
      return;
    }
    data = { '1': [] };
    shape = 'byCourse';
    saveFile(FILE, data);
    console.log(`Created ${FILE}.\n`);
  } else {
    try {
      data = loadFile(FILE);
    } catch (err) {
      console.error(`Could not parse ${FILE}: ${err.message}`);
      process.exit(1);
    }
    shape = detectShape(data);
    if (shape === 'unknown') {
      console.error('Unrecognized JSON shape. Expected an array, a course-keyed object, or { "assignments": [...] }.');
      process.exit(1);
    }
  }

  console.log(`Editing ${FILE}`);
  console.log(`Detected shape: ${shape}${shape === 'byCourse' ? ` (courses: ${courseKeys(data, shape).join(', ')})` : ''}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const read = makeReader(rl);
  const ask = (p) => read(p).then((v) => v ?? ''); // field prompts: EOF -> ''
  let dirty = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const menuRaw = await read(
      '\n== MataQUEST mock editor ==\n' +
      '  [l] list   [a] add   [e] edit   [d] delete   [s] save   [q] quit\n' +
      '> '
    );
    if (menuRaw === null) { // stdin closed
      if (dirty) saveFile(FILE, data);
      console.log('\n(input closed)');
      break;
    }
    const choice = menuRaw.trim().toLowerCase();

    if (choice === 'l') {
      printAll(data, shape);
    } else if (choice === 'a') {
      await promptNewAssignment(ask, data, shape);
      dirty = true;
    } else if (choice === 'e') {
      await promptEditAssignment(ask, data, shape);
      dirty = true;
    } else if (choice === 'd') {
      await promptDeleteAssignment(ask, data, shape);
      dirty = true;
    } else if (choice === 's') {
      saveFile(FILE, data);
      dirty = false;
      console.log(`\n✓ Saved to ${FILE} (backup: ${path.basename(FILE)}.bak)\n`);
    } else if (choice === 'q') {
      if (dirty) {
        const save = await ask('Unsaved changes — save before quitting? (Y/n): ');
        if (parseBool(save, true)) saveFile(FILE, data);
      }
      console.log('Bye.');
      break;
    } else {
      console.log('  Unknown option.');
    }
  }
  rl.close();
}

// Export pure helpers so they can be unit-tested without the interactive shell.
module.exports = {
  detectShape, listAll, nextId, findById, addAssignment, deleteById,
  buildAssignment, parseBool, parseNumberOrNull, parseDateOrNull,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}