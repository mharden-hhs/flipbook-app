// src/routes/auth.js
const express  = require('express');
const passport = require('passport');
const router   = express.Router();

// Redirect to Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login?error=unauthorized' }),
  (req, res) => {
    const returnTo = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

// Login page (shown when not authenticated)
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/admin');
  res.render('auth/login', {
    error: req.query.error === 'unauthorized'
      ? 'That Google account is not authorized. Contact your administrator.'
      : null
  });
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
