const express = require('express');
const router = express.Router();
const Winner = require('../models/Winner');
const auth = require('../middleware/auth');

// Get user's winning bids
router.get('/my-wins', auth, async (req, res) => {
  try {
    const winners = await Winner.find({ user: req.user.id })
      .populate('product')
      .sort({ winningDate: -1 });

    res.json(winners);
  } catch (error) {
    console.error('Error fetching winning bids:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const winner = await Winner.findOneAndUpdate(
      { product: req.body.productId, user: req.user.id },
      { paymentStatus: 'completed' },
      { new: true }
    );

    if (!winner) {
      return res.status(404).json({ message: 'Winner record not found' });
    }

    res.json(winner);
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;