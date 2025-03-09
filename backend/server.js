const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const auctionRoutes = require('./routes/auctionRoutes');

const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/auctionDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use('/auth', authRoutes);
app.use('/auction', auctionRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
