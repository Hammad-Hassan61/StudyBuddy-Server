const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();


router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json(req.user);
});

module.exports = router; 