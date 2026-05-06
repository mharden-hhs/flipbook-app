// src/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

require('./middleware/passport');

const authRoutes   = require('./routes/auth');
const adminRoutes  = require('./routes/admin');
const viewerRoutes = require('./routes/viewer');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = process.env.STORAGE_PATH || './public/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Session
const pgSession = require('connect-pg-simple')(session);

app.use(session({
  store: new pgSession({
    conString: process.env.DATABASE_URL,
    tableName:  'Session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', viewerRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong.');
});

app.listen(PORT, () => {
  console.log(`FlipDoc running on http://localhost:${PORT}`);
});
