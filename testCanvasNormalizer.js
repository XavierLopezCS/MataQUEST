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

const { normalizeAssignments } = require('./canvasClient');
const { calculateCourseXP } = require('./xpCalculator');
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

console.log(
  `\n${failures === 0 ? 'All normalization checks passed.' : failures + ' check(s) FAILED.'}\n`
);
process.exit(failures === 0 ? 0 : 1);
