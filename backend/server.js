const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3003',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// MongoDB connection with retry logic
const connectWithRetry = () => {
  const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4  // Force IPv4
  };

  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pool_degen', mongoOptions)
    .then(() => {
      console.log('MongoDB connected successfully');
      if (process.env.NODE_ENV !== 'production') {
        mongoose.set('debug', true);
      }
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Error handling middleware
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

// Models
const userSchema = new mongoose.Schema({
    identifier: String,
    username: String,
    score: { type: Number, default: 0 },
    weekly_score: { type: Number, default: 0 },
    referral_code: String,
    referrer: String,
    referral_count: { type: Number, default: 0 },
    scores: [{
        score: Number,
        timestamp: Date
    }],
    referrals: [{
        referral_id: String,
        timestamp: Date
    }],
    chat_id: Number,
    created_at: { type: Date, default: Date.now }
}, { collection: 'user_scores' });

const User = mongoose.model('User', userSchema);

// API Routes
app.get('/api/user_scores', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: '$score' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const users = await User.find()
            .skip(skip)
            .limit(limit)
            .lean();

        const topPerformers = await User.find()
            .sort({ score: -1 })
            .limit(3)
            .lean();

        const statsData = stats[0] || { totalScore: 0, count: 0 };
        const averageScore = statsData.count > 0 ? statsData.totalScore / statsData.count : 0;

        res.json({
            users,
            stats: {
                totalScore: statsData.totalScore,
                averageScore,
                topPerformers
            }
        });
    } catch (error) {
        console.error('Error in /api/user_scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/user_scores/count', async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: '$score' },
                    count: { $sum: 1 },
                    avgScore: { $avg: '$score' }
                }
            }
        ]);

        const data = stats[0] || { count: 0, totalScore: 0, avgScore: 0 };
        res.json({
            count: data.count,
            stats: {
                totalScore: data.totalScore,
                averageScore: data.avgScore
            }
        });
    } catch (error) {
        console.error('Error in /api/user_scores/count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/user_scores/search', async (req, res) => {
    try {
        const username = req.query.username || '';
        const users = await User.find({
            username: { $regex: username, $options: 'i' }
        })
        .limit(100)
        .lean();

        const stats = await User.aggregate([
            {
                $match: {
                    username: { $regex: username, $options: 'i' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: '$score' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsData = stats[0] || { totalScore: 0, count: 0 };
        const averageScore = statsData.count > 0 ? statsData.totalScore / statsData.count : 0;
        const topPerformers = users.sort((a, b) => b.score - a.score).slice(0, 3);

        res.json({
            users,
            stats: {
                totalScore: statsData.totalScore,
                averageScore,
                topPerformers
            }
        });
    } catch (error) {
        console.error('Error in /api/user_scores/search:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/user_scores/referrals/:identifier', async (req, res) => {
    try {
        const referrals = await User.find({ referrer: req.params.identifier }).lean();
        res.json({ referrals });
    } catch (error) {
        console.error('Error in /api/user_scores/referrals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/user_scores/:id', async (req, res) => {
    try {
        const result = await User.updateOne(
            { _id: req.params.id },
            { $set: req.body }
        );
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error in PUT /api/user_scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/user_scores/:id', async (req, res) => {
    try {
        const result = await User.deleteOne({ _id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error in DELETE /api/user_scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  app.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
