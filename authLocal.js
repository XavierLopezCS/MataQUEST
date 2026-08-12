// authLocal.js — first-party username/password login for MataQUEST.
//
// Deliberately SEPARATE from auth.js. That file is the Canvas OAuth flow,
// which we can't use: Canvas OAuth login needs the same developer key as the
// Canvas API, and that access never came through. auth.js also only ever
// establishes a Canvas *token*, never a *userId* — so it can't tell you who
// owns a progress record. This file fills that gap with a self-contained
// login: no external provider, no client secrets, no redirect URIs to
// coordinate across the team before a demo.
//
// The whole job of this file is to establish IDENTITY. On success it sets
// req.session.userId, and every progress/XP endpoint now trusts THAT instead
// of a userId the browser sends in the request.

const express = require('express');
const User = require('./User');

const router = express.Router();

// POST /auth/register   body: { username, password, displayName? }
// Creates an account and logs it straight in.
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'That username is taken' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      username,
      passwordHash,
      displayName: displayName || '',
    });

    req.session.userId = user._id.toString();
    res.status(201).json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error('POST /auth/register failed:', err.message);
    res.status(500).json({ error: 'Could not register', details: err.message });
  }
});

// POST /auth/login   body: { username, password }
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });

    // Identical response whether the username is unknown OR the password is
    // wrong, so we don't leak which usernames exist.
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user._id.toString();
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error('POST /auth/login failed:', err.message);
    res.status(500).json({ error: 'Could not log in', details: err.message });
  }
});

// POST /auth/logout — clears the session.
// (Canvas auth.js has a GET /auth/logout; different method, so no collision.)
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// requireAuth — the identity twin of ensureValidToken in auth.js.
// ensureValidToken checks for a Canvas TOKEN; this checks for a logged-in
// USER. Put it in front of any endpoint that reads or writes one specific
// user's data, so the userId comes from the session cookie, not the client.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

module.exports = { router, requireAuth };
