// User.js — Mongoose model for a MataQUEST account.
//
// This is the identity record the rest of the app keys off. At login we set
// req.session.userId = user._id.toString(), and THAT string is the same
// userId that xpStore uses to key a user's XP/progress docs in Mongo. So the
// chain is: one account -> one _id -> one progress record. Keep it intact —
// if you ever change what goes into req.session.userId, xpStore's existing
// docs stop matching.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,   // Mongo enforces no duplicate usernames
      trim: true,
      lowercase: true, // store canonical form so "Steven" == "steven" at login
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Hash a plaintext password. Static so route code never touches bcrypt directly.
userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

// Compare a plaintext attempt against this user's stored hash.
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// The ONLY shape the frontend is ever allowed to see — never leak passwordHash.
userSchema.methods.toPublicJSON = function () {
  return {
    userId: this._id.toString(),
    username: this.username,
    displayName: this.displayName || this.username,
  };
};

module.exports = mongoose.model('User', userSchema);
