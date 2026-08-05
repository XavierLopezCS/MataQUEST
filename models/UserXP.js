// models/UserXP.js — Mongoose schema for a user's XP record

const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.Mixed, required: true }, // "101" or 101
    assignmentId: { type: mongoose.Schema.Types.Mixed, required: true },
    xp: { type: Number, required: true },
    trophy: { type: String, enum: ['gold', 'silver', 'bronze', null], default: null },
    gradePercent: { type: Number, default: null },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    awardedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userXPSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  totalXP: { type: Number, default: 0 },
  awardedKeys: { type: [String], default: [] }, // ["101:1", "101:2", ...]
  history: { type: [historyEntrySchema], default: [] }
});

module.exports = mongoose.model('UserXP', userXPSchema);