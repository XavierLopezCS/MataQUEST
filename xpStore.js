// xpStore.js — MongoDB-backed persistence for awarded XP
//
// Tracks, per user:
//   - totalXP earned so far
//   - which (courseId, assignmentId) pairs have already been awarded,
//     so the same assignment can't be double-awarded
//   - a history log of individual award events

const UserXP = require('./models/UserXP');

// Normalize userId to a string so a numeric id from a JSON body (42) and
// a string id from a query param ("42") resolve to the same user record.
function normalizeUserId(userId) {
  return String(userId);
}

async function getOrCreateUser(userId) {
  const key = normalizeUserId(userId);
  let user = await UserXP.findOne({ userId: key });
  if (!user) {
    user = await UserXP.create({ userId: key, totalXP: 0, awardedKeys: [], history: [] });
  }
  return user;
}

async function hasAwarded(userId, courseId, assignmentId) {
  const user = await getOrCreateUser(userId);
  return user.awardedKeys.includes(`${courseId}:${assignmentId}`);
}

/**
 * Record an XP award for a user. Returns the user's XP total before and
 * after the award.
 */
async function awardXP(userId, { courseId, assignmentId, xp, trophy, gradePercent, breakdown }) {
  const key = normalizeUserId(userId);
  const awardKey = `${courseId}:${assignmentId}`;

  const user = await getOrCreateUser(key);

  if (user.awardedKeys.includes(awardKey)) {
    throw new Error(`Assignment ${assignmentId} in course ${courseId} was already awarded to user ${userId}`);
  }

  const xpBefore = user.totalXP;

  user.awardedKeys.push(awardKey);
  user.totalXP += xp;
  user.history.push({
    courseId,
    assignmentId,
    xp,
    trophy,
    gradePercent,
    breakdown,
    awardedAt: new Date()
  });

  await user.save();

  return { xpBefore, xpAfter: user.totalXP };
}

async function getUserProgress(userId) {
  const user = await getOrCreateUser(userId);
  const trophies = { gold: 0, silver: 0, bronze: 0 };
  user.history.forEach(h => {
    if (h.trophy) trophies[h.trophy]++;
  });

  return {
    userId: user.userId,
    totalXP: user.totalXP,
    trophies,
    assignmentsCompleted: user.history.length,
    history: user.history
  };
}

/** All award history for a user, optionally filtered to one course. */
async function getUserHistoryForCourse(userId, courseId) {
  const user = await getOrCreateUser(userId);
  return user.history.filter(h => h.courseId === courseId);
}

module.exports = {
  getOrCreateUser,
  hasAwarded,
  awardXP,
  getUserProgress,
  getUserHistoryForCourse
};