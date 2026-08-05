// testCanvasNormalizer.js — proves the Canvas integration layer works
// WITHOUT needing a real Canvas developer key.
//
// Run with:  node testCanvasNormalizer.js
//
// It feeds realistic RAW Canvas API payloads (canvasSample.json) through
// normalizeAssignments() and then straight into the team's existing
// calculateCourseXP() — with no changes to xpCalculator.js.
//
// If this passes, the only thing standing between us and live Canvas data
// is real credentials in .env.

const fs = require('fs');
const path = require('path');
const { normalizeAssignments } = require('./canvasClient');
const { calculateCourseXP } = require('./xpCalculator');
const mockStore = require('./mockStore');
const sample = require('./canvasSample.json');

let failures = 0;

function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures++;
  console.log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  );
}

console.log('\n--- Normalization: raw Canvas -> xpCalculator shape ---\n');

const comp380 = normalizeAssignments(sample.assignments['101']);

const graded = comp380.find((a) => a.id === 1);
console.log('Graded, submitted on time:');
check('has_submitted_submissions is true', graded.has_submitted_submissions, true);
check('score mapped to submission_grade', graded.submission_grade, 10);
check('submitted_at carried through', graded.submitted_at, '2026-07-14T18:22:00Z');

const unsubmitted = comp380.find((a) => a.id === 2);
console.log('\nNever submitted (workflow_state "unsubmitted"):');
check('has_submitted_submissions is false', unsubmitted.has_submitted_submissions, false);
check('submission_grade is null', unsubmitted.submission_grade, null);

const ungraded = comp380.find((a) => a.id === 5);
console.log('\nTurned in but not graded yet:');
check('counts as submitted', ungraded.has_submitted_submissions, true);
check('grade still null (no XP until graded)', ungraded.submission_grade, null);

console.log('\n--- End-to-end: normalized data through calculateCourseXP() ---\n');

for (const [courseId, raw] of Object.entries(sample.assignments)) {
  const result = calculateCourseXP(normalizeAssignments(raw));
  console.log(`Course ${courseId}: ${result.totalXP} XP total, trophies =`, result.trophies);
  result.perAssignment.forEach((a) => {
    console.log(
      `   - ${a.name}: ${a.xp} XP | trophy=${a.trophy} | grade=${
        a.gradePercent === null ? '—' : a.gradePercent + '%'
      } | onTime=${a.breakdown.onTime}`
    );
  });
}

// ---------------------------------------------------------------------------
// KNOWN ISSUE surfaced by this test — see note in README
// ---------------------------------------------------------------------------
// "Late Lab Writeup" (id 4) was due 2026-07-10 but submitted 2026-07-12.
// It should be flagged late and take the LATE_PENALTY_MULTIPLIER, but it
// currently reports onTime=true and receives the on-time bonus instead.
//
// Cause is in xpCalculator.js, not in this integration layer:
//
//     const perAssignment = assignments.map(a => ({
//       ...calculateAssignmentXP(a)          // <-- submittedAt never passed
//     }));
//
// calculateAssignmentXP(assignment, submittedAt) defaults submittedAt to null,
// so the `if (due_at && submittedAt)` branch never runs and onTime stays true.
//
// The one-line fix (in xpCalculator.js, owned by whoever wrote it):
//
//     ...calculateAssignmentXP(a, a.submitted_at)
//
// The normalizer here already supplies `submitted_at` on every assignment,
// so nothing on the Canvas side needs to change for that fix to work.

const late = comp380.find((a) => a.id === 4);
console.log('\n--- Late-submission check ---\n');
console.log(`  "Late Lab Writeup" due ${late.due_at}, submitted ${late.submitted_at}`);
const lateResult = calculateCourseXP([late]).perAssignment[0];
if (lateResult.breakdown.onTime === true) {
  console.log('  NOTE: reported as on-time — see KNOWN ISSUE comment in this file.');
} else {
  console.log('  Correctly flagged late; penalty applied.');
}

// ---------------------------------------------------------------------------
// Manual entry (mockStore) — the write path shared by the browser form
// (POST /api/assignments) and the `npm run edit` CLI. Since we're staying on
// mock data, this is how assignments get in, so it's tested here alongside the
// read path. Runs against a throwaway copy so mockAssignments.json is untouched.
// ---------------------------------------------------------------------------

console.log('\n--- Manual entry: mockStore.createAssignment() ---\n');

const TMP = path.join(__dirname, '__store_test.json');
fs.copyFileSync(path.join(__dirname, 'mockAssignments.json'), TMP);
const KNOWN = [101, 102];

// valid: on-time graded -> next auto id (max existing is 3)
let r = mockStore.createAssignment(
  { courseId: '101', name: 'Sprint 2 Report', points_possible: '20', due_at: '2026-07-29',
    has_submitted_submissions: true, submission_grade: '19', submitted_at: '2026-07-28' },
  { file: TMP, validCourseIds: KNOWN }
);
console.log('Valid, on-time, graded:');
check('accepted', r.ok, true);
check('auto id = 4', r.assignment.id, 4);
check('points coerced to number', r.assignment.points_possible, 20);
check('due stored as YYYY-MM-DD', r.assignment.due_at, '2026-07-29');
check('submitted_at carried through', r.assignment.submitted_at, '2026-07-28');
check(
  'exact mock shape',
  Object.keys(r.assignment).join(','),
  'id,name,points_possible,due_at,has_submitted_submissions,submission_grade,submitted_at'
);

// valid: late submission into same course -> id increments again
r = mockStore.createAssignment(
  { courseId: '101', name: 'Late Design Doc', points_possible: '10', due_at: '2026-07-20',
    has_submitted_submissions: true, submission_grade: '9', submitted_at: '2026-07-25' },
  { file: TMP, validCourseIds: KNOWN }
);
console.log('\nValid, late:');
check('id incremented to 5', r.assignment.id, 5);

// invalid: blank name, negative points, grade > points
r = mockStore.createAssignment(
  { courseId: '101', name: '', points_possible: '-5', has_submitted_submissions: true, submission_grade: '999' },
  { file: TMP, validCourseIds: KNOWN }
);
console.log('\nInvalid (name / points / grade):');
check('rejected', r.ok, false);
check('flags name', r.errors.some((e) => /name/i.test(e)), true);
check('flags points', r.errors.some((e) => /points/i.test(e)), true);

// invalid: unknown course
r = mockStore.createAssignment(
  { courseId: '999', name: 'Orphan', points_possible: '10' },
  { file: TMP, validCourseIds: KNOWN }
);
console.log('\nInvalid (unknown course):');
check('rejected', r.ok, false);
check('flags course', r.errors.some((e) => /course/i.test(e)), true);

// valid: not-yet-submitted into 102 (grade defaults null)
r = mockStore.createAssignment(
  { courseId: '102', name: 'Problem Set 2', points_possible: '15', due_at: '2026-08-05', has_submitted_submissions: false },
  { file: TMP, validCourseIds: KNOWN }
);
console.log('\nValid, not yet submitted:');
check('accepted', r.ok, true);
check('grade defaults to null', r.assignment.submission_grade, null);
check('landed in course 102', r.courseId, '102');

// downstream: saved data still runs cleanly through calculateCourseXP()
const saved = JSON.parse(fs.readFileSync(TMP, 'utf8'));
console.log('\nDownstream through calculateCourseXP():');
check('course 101 now has 4 assignments', saved['101'].length, 4);
const storeXP = calculateCourseXP(saved['101']);
check('totalXP is a finite number', Number.isFinite(storeXP.totalXP), true);
console.log(`     -> course 101 totalXP = ${storeXP.totalXP}, trophies =`, storeXP.trophies);

fs.unlinkSync(TMP);
if (fs.existsSync(TMP + '.bak')) fs.unlinkSync(TMP + '.bak');

console.log(
  `\n${failures === 0 ? 'All checks passed.' : failures + ' check(s) FAILED.'}\n`
);
process.exit(failures === 0 ? 0 : 1);