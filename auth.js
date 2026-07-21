// auth.js — Canvas OAuth2 login flow
const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
  CANVAS_DOMAIN,
  CANVAS_CLIENT_ID,
  CANVAS_CLIENT_SECRET,
  CANVAS_REDIRECT_URI
} = process.env;

router.get('/login', (req, res) => {
  if (!CANVAS_DOMAIN || !CANVAS_CLIENT_ID) {
    return res.status(500).send(
      "Canvas OAuth isn't configured yet. Fill in .env with your real " +
      "CANVAS_DOMAIN / CANVAS_CLIENT_ID / CANVAS_CLIENT_SECRET, or use " +
      "GET /auth/mock-login to test locally without real credentials."
    );
  }

  const authUrl =
    `${CANVAS_DOMAIN}/login/oauth2/auth` +
    `?client_id=${CANVAS_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(CANVAS_REDIRECT_URI)}`;

  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: `Canvas returned an error: ${error}` });
  }
  if (!code) {
    return res.status(400).json({ error: "Missing 'code' in redirect from Canvas" });
  }

  try {
    const tokenRes = await axios.post(`${CANVAS_DOMAIN}/login/oauth2/token`, {
      grant_type: 'authorization_code',
      client_id: CANVAS_CLIENT_ID,
      client_secret: CANVAS_CLIENT_SECRET,
      redirect_uri: CANVAS_REDIRECT_URI,
      code
    });

    req.session.canvasToken = tokenRes.data.access_token;
    req.session.canvasRefreshToken = tokenRes.data.refresh_token;
    req.session.tokenExpiresAt = Date.now() + 55 * 60 * 1000;

    res.redirect('/auth/success');
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Token exchange with Canvas failed',
      details: err.response?.data || err.message
    });
  }
});

router.get('/mock-login', (req, res) => {
  req.session.canvasToken = 'mock-token-for-local-dev';
  req.session.tokenExpiresAt = Date.now() + 60 * 60 * 1000;
  res.send('Mock session created. You can now hit protected routes, e.g. GET /api/protected/ping');
});

router.get('/success', (req, res) => {
  res.send('Logged in to Canvas successfully. You can now call protected endpoints.');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.send('Logged out.'));
});

async function ensureValidToken(req, res, next) {
  if (!req.session.canvasToken) {
    return res.status(401).json({ error: 'Not logged in. Visit /auth/login (or /auth/mock-login for local dev) first.' });
  }

  const isExpired = Date.now() > (req.session.tokenExpiresAt || 0);
  const isMockToken = req.session.canvasToken === 'mock-token-for-local-dev';

  if (isExpired && !isMockToken) {
    try {
      const refreshRes = await axios.post(`${CANVAS_DOMAIN}/login/oauth2/token`, {
        grant_type: 'refresh_token',
        client_id: CANVAS_CLIENT_ID,
        client_secret: CANVAS_CLIENT_SECRET,
        refresh_token: req.session.canvasRefreshToken
      });
      req.session.canvasToken = refreshRes.data.access_token;
      req.session.tokenExpiresAt = Date.now() + 55 * 60 * 1000;
    } catch (err) {
      console.error('Token refresh failed:', err.response?.data || err.message);
      return res.status(401).json({ error: 'Session expired. Please log in again at /auth/login.' });
    }
  }

  next();
}

module.exports = { router, ensureValidToken };