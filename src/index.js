require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

// Import JWT strategy
require('./config/jwtStrategy');

const app = express();

// Middleware
// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   credentials: true
// }));
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Serve static uploaded files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes); 

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 