// xpCalculator.js — XP & Trophy calculation logic
//
// Takes a Canvas-style assignment object (real or mock) and returns
// how much XP the student earned and what trophy tier they hit.
//
// Design goals:
// - Simple, tunable numbers (all constants at the top, easy to rebalance)
// - Works with real Canvas API fields, since it only reads fields that
//   also exist in the real Canvas assignment/submission response shape:
//     points_possible, has_submitted_submissions, submission_grade, due_at

// ---- Tunable constants ----
const XP_PER_POINT = 10;        // base XP earned per point_possible, if fully completed
const ON_TIME_BONUS_XP = 15;    // flat bonus if submitted before due_at
const LATE_PENALTY_MULTIPLIER = 0.5; // XP multiplier if submitted late (still get partial credit)

const TROPHY_THRESHOLDS = {
  gold: 0.95,   // grade percentage >= 95%
  silver: 0.80, // grade percentage >= 80%
  bronze: 0.0   // any completed submission with a grade
};

/**
 * Calculate XP and trophy for a single assignment.
 * @param {Object} assignment - Canvas-style assignment object
 * @param {number} assignment.points_possible
 * @param {boolean} assignment.has_submitted_submissions
 * @param {number|null} assignment.submission_grade
 * @param {string} assignment.due_at - ISO date string
 * @param {string} [submittedAt] - ISO date string of when it was submitted (optional; if omitted, assumed on-time when graded)
 * @returns {{ xp: number, trophy: string|null, gradePercent: number|null, breakdown: object }}
 */
function calculateAssignmentXP(assignment, submittedAt = null) {
  const {
    points_possible = 0,
    has_submitted_submissions = false,
    submission_grade = null,
    due_at = null
  } = assignment;

  // Not submitted yet: no XP, no trophy
  if (!has_submitted_submissions || submission_grade === null) {
    return {
      xp: 0,
      trophy: null,
      gradePercent: null,
      breakdown: { reason: "not_submitted" }
    };
  }

  const gradePercent = points_possible > 0
    ? Math.min(submission_grade / points_possible, 1) // clamp at 100%
    : 0;

  // Base XP scales with both assignment weight (points_possible) and how well they did
  let xp = points_possible * XP_PER_POINT * gradePercent;

  // On-time bonus
  let onTime = true;
  if (due_at && submittedAt) {
    onTime = new Date(submittedAt) <= new Date(due_at);
  }

  if (onTime) {
    xp += ON_TIME_BONUS_XP;
  } else {
    xp *= LATE_PENALTY_MULTIPLIER;
  }

  xp = Math.round(xp);

  // Trophy tier based on grade percentage
  let trophy = "bronze";
  if (gradePercent >= TROPHY_THRESHOLDS.gold) trophy = "gold";
  else if (gradePercent >= TROPHY_THRESHOLDS.silver) trophy = "silver";

  return {
    xp,
    trophy,
    gradePercent: Math.round(gradePercent * 100),
    breakdown: {
      basePoints: points_possible,
      earnedPercent: Math.round(gradePercent * 100),
      onTime,
      onTimeBonusApplied: onTime ? ON_TIME_BONUS_XP : 0,
      latePenaltyApplied: onTime ? null : LATE_PENALTY_MULTIPLIER
    }
  };
}

/**
 * Calculate total XP and highest trophy across a list of assignments.
 * @param {Array} assignments
 * @returns {{ totalXP: number, trophies: {gold:number, silver:number, bronze:number}, perAssignment: Array }}
 */
function calculateCourseXP(assignments) {
  const perAssignment = assignments.map(a => ({
    id: a.id,
    name: a.name,
    ...calculateAssignmentXP(a)
  }));

  const totalXP = perAssignment.reduce((sum, a) => sum + a.xp, 0);

  const trophies = { gold: 0, silver: 0, bronze: 0 };
  perAssignment.forEach(a => {
    if (a.trophy) trophies[a.trophy]++;
  });

  return { totalXP, trophies, perAssignment };

}
module.exports = { calculateAssignmentXP, calculateCourseXP };
