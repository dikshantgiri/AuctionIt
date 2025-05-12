const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('./config/cloudinary');
const stripe = require('./config/stripe');
const { sendVictoryEmail } = require('./config/email');
const dotenv = require('dotenv');

dotenv.config();

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Configure cookie settings
app.use((req, res, next) => {
  res.cookie('m', '', {
    sameSite: 'none',
    secure: true,
    partitioned: true
  });
  next();
});
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/bidding_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  phoneNumber: { type: String },
  address: { type: String },
  isBlocked: { type: Boolean, default: false }
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  startingPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  endTime: { type: Date, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  imageUrl: { type: String },
  paid: { type: Boolean, default: false },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Bid Schema
const bidSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Bid = mongoose.model('Bid', bidSchema);
const WinningBid = require('./models/WinningBid');

// Create default admin user
async function createDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('1234', 10);
      await User.create({
        username: 'admin',
        email: 'auctionplatformcsit@gmail.com',
        password: hashedPassword,
        isAdmin: true
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

createDefaultAdmin();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth Routes
// Upload image route
// Payment Routes
app.post('/api/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.paid) {
      return res.status(400).json({ message: 'Product already paid for' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(product.currentPrice * 100),
      currency: 'usd',
      metadata: { productId }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
});

app.post('/api/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.paid = true;
    product.winner = req.user.id;
    await product.save();

    // Update winning bid payment status
    await WinningBid.findOneAndUpdate(
      { product: productId, user: req.user.id },
      { paymentStatus: 'completed' }
    );

    // Send payment confirmation email
    const { sendPaymentConfirmationEmail } = require('./config/email');
    await sendPaymentConfirmationEmail(req.user, product);

    res.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
});

// Delete product endpoint
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    // Check admin privileges
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only administrators can delete products'
      });
    }

    // Validate product ID format
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid product ID format'
      });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found'
      });
    }

    // Check if product has active bids
    if (product.status === 'active') {
      const activeBids = await Bid.countDocuments({ product: productId });
      if (activeBids > 0) {
        return res.status(400).json({
          error: 'ACTIVE_BIDS',
          message: 'Cannot delete product with active bids'
        });
      }
    }

    // Delete associated bids
    await Bid.deleteMany({ product: productId });
    
    // Delete associated winning bids
    await WinningBid.deleteMany({ product: productId });
    
    // Delete the product
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      throw new Error('Product deletion failed');
    }

    res.status(200).json({
      message: 'Product and associated data deleted successfully',
      productId: productId
    });

  } catch (error) {
    console.error('Error in product deletion:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while deleting the product',
      details: error.message
    });
  }
});

// Handle auction end and create winning bid
app.post('/api/products/:id/end-auction', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.status === 'ended') {
      return res.status(400).json({ message: 'Auction has already ended' });
    }

    // Get the highest bid for this product
    const highestBid = await Bid.findOne({ product: product._id })
      .sort({ amount: -1 })
      .populate('bidder');

    if (highestBid) {
      // Create winning bid record
      const winningBid = new WinningBid({
        user: highestBid.bidder._id,
        username: highestBid.bidder.username,
        product: product._id,
        productName: product.name,
        finalBidAmount: highestBid.amount,
        winningDate: new Date()
      });

      await winningBid.save();

      // Update product status
      product.status = 'ended';
      product.winner = highestBid.bidder._id;
      await product.save();

      // Send victory email to the winner
      const winner = await User.findById(highestBid.bidder._id);
      if (winner && winner.email) {
        await sendVictoryEmail(winner, product);
      }

      res.json({ winner: highestBid.bidder.username });
    } else {
      product.status = 'ended';
      await product.save();
      res.json({ message: 'Auction ended with no bids' });
    }
  } catch (error) {
    console.error('Error ending auction:', error);
    res.status(500).json({ message: 'Error ending auction' });
  }
});

 // Get user's winning bids
app.get('/api/my-wins', authenticateToken, async (req, res) => {
  try {
    const winningBids = await WinningBid.find({ user: req.user.id })
      .populate({
        path: 'product',
        select: 'name imageUrl endTime seller paid'
      })
      .sort({ winningDate: -1 });

    res.json(winningBids);
  } catch (error) {
    console.error('Error fetching winning bids:', error);
    res.status(500).json({ message: 'Error fetching winning bids' });
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert buffer to base64
    const fileStr = req.file.buffer.toString('base64');
    const fileType = req.file.mimetype;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(
      `data:${fileType};base64,${fileStr}`,
      {
        folder: 'bidding_app_products',
        resource_type: 'auto'
      }
    );

    res.json({
      message: 'Upload successful',
      imageUrl: uploadResponse.secure_url
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, 'your_jwt_secret');
    res.json({ token, isAdmin: user.isAdmin });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// User Management Routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { username, phoneNumber, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, phoneNumber, address },
      { new: true, select: '-password' }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/users/:id/toggle-block', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Product Routes
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admin can create products' });
    }

    const { name, description, startingPrice, currentPrice, endTime, imageUrl } = req.body;
    
    // Validate required fields
    if (!name || !startingPrice || !endTime) {
      return res.status(400).json({ message: 'Name, starting price, and end time are required' });
    }

    const product = await Product.create({
      name,
      description,
      startingPrice,
      currentPrice,
      endTime,
      imageUrl,
      seller: req.user.id
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: error.message || 'Error creating product' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { status } = req.query;
    const now = new Date();
    let query = {};

    // Validate status parameter
    if (status && !['active', 'past'].includes(status)) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'Status must be either "active" or "past"'
      });
    }

    if (status === 'active') {
      query = {
        status: 'active',
        endTime: { $gt: now }
      };
    } else if (status === 'past') {
      query = {
        $or: [
          { status: 'ended' },
          { endTime: { $lte: now } }
        ]
      };
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection error');
      return res.status(500).json({
        error: 'DB_CONNECTION_ERROR',
        message: 'Database connection error'
      });
    }

    const products = await Product.find(query)
      .populate('winner', 'username')
      .sort({ endTime: -1 })
      .catch(err => {
        console.error('Database query error:', err);
        throw new Error('Failed to fetch products');
      });

    if (!products) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'No products found'
      });
    }

    res.json(products);
  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while fetching products'
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Fetch bid history for the product
    const bids = await Bid.find({ product: req.params.id })
      .populate('bidder', 'username')
      .sort({ timestamp: -1 });
    
    res.json({ ...product.toObject(), bids });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/products/:id/bid', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.status !== 'active') {
      return res.status(400).json({ message: 'Auction has ended' });
    }

    const now = new Date();
    if (now > new Date(product.endTime)) {
      product.status = 'ended';
      
      // Get the highest bid
      const highestBid = await Bid.findOne({ product: product._id })
        .sort({ amount: -1 })
        .populate('bidder', 'username');

      if (highestBid) {
        product.winner = highestBid.bidder._id;
        await product.save();

        // Create winning bid record
        await WinningBid.create({
          user: highestBid.bidder._id,
          username: highestBid.bidder.username,
          product: product._id,
          productName: product.name,
          finalBidAmount: highestBid.amount,
          paymentStatus: 'pending'
        });
      }

      return res.status(400).json({ message: 'Auction has ended' });
    }

    const { amount } = req.body;
    if (amount <= product.currentPrice) {
      return res.status(400).json({ message: 'Bid must be higher than current price' });
    }

    product.currentPrice = amount;
    await product.save();

    const bid = await Bid.create({
      product: req.params.id,
      bidder: req.user.id,
      amount
    });

    const populatedBid = await bid.populate('bidder', 'username');
    io.emit('bidUpdate', {
      productId: req.params.id,
      currentPrice: amount,
      bid: {
        amount: populatedBid.amount,
        timestamp: populatedBid.timestamp,
        bidder: populatedBid.bidder
      }
    });
    res.status(201).json(populatedBid);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// Fetch user's winning bids
app.get('/api/delivered-orders', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const deliveredOrders = await Product.find({ paid: true })
      .populate('winner', 'username')
      .sort({ endTime: -1 });
    res.json(deliveredOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivered orders' });
  }
});

app.get('/api/my-wins', authenticateToken, async (req, res) => {
  try {
    const winningBids = await WinningBid.find({ user: req.user.id })
      .sort({ winningDate: -1 });
    res.json(winningBids);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching winning bids' });
  }
});

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('placeBid', async ({ productId, amount, userId }) => {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        socket.emit('bidError', { message: 'Product not found' });
        return;
      }

      if (product.status !== 'active') {
        socket.emit('bidError', { message: 'Auction has ended' });
        return;
      }

      const now = new Date();
      if (now > new Date(product.endTime)) {
        product.status = 'ended';
        await product.save();
        socket.emit('bidError', { message: 'Auction has ended' });
        return;
      }

      if (amount <= product.currentPrice) {
        socket.emit('bidError', { message: 'Bid must be higher than current price' });
        return;
      }

      product.currentPrice = amount;
      await product.save();
      
      await Bid.create({
        product: productId,
        bidder: userId,
        amount
      });
      
      const bid = await Bid.findOne({ product: productId })
        .sort({ timestamp: -1 })
        .populate('bidder', 'username');
      
      io.emit('bidUpdate', {
        productId,
        currentPrice: amount,
        bid: {
          amount: bid.amount,
          timestamp: bid.timestamp,
          bidder: bid.bidder
        }
      });
    } catch (error) {
      console.error('Error placing bid:', error);
      socket.emit('bidError', { message: 'Server error while placing bid' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});