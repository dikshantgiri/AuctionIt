import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faClock, faLock, faDesktop, faBoxOpen, faChartLine, faUserCheck, faHistory, faUserPlus, faSearch, faCrown, faTruck } from '@fortawesome/free-solid-svg-icons';

function Home({ isAuthenticated }) {
  const [products, setProducts] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('bidUpdate', ({ productId, currentPrice }) => {
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product._id === productId
            ? { ...product, currentPrice }
            : product
        )
      );
    });

    return () => newSocket.close();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const [timers, setTimers] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      const updatedTimers = {};
      products.forEach(product => {
        updatedTimers[product._id] = calculateTimeLeft(product.endTime);
      });
      setTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(timer);
  }, [products]);

  const calculateTimeLeft = (endTime) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const timeLeft = end - now;

    if (timeLeft <= 0) return 'Auction ended';

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-primary text-white py-5 mb-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="display-4 fw-bold text-white">Welcome to Auction It!</h1>
              <p className="lead text-white">Your Ultimate Destination for Smart Bidding and Big Wins!</p>
              <p className="text-white">At Auction It, we bring together buyers and sellers in a vibrant online marketplace where every bid counts. Whether you're looking to grab a rare collectible, score an amazing deal, or auction your own items for top dollar, we've got you covered.</p>
              {!isAuthenticated && (
                <Link to="/register" className="btn btn-light btn-lg me-3">Get Started</Link>
              )}
            </div>
            <div className="col-md-6 text-center">
              <FontAwesomeIcon icon={faGavel} size="6x" className="ms-auto d-none d-md-block text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Live Auctions */}
      <div className="container mb-5">
        <h2 className="text-center mb-4">
          <FontAwesomeIcon icon={faGavel} className="me-2" />
          Live Auctions
        </h2>
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {products.map(product => (
            <div key={product._id} className="col">
              <div className="card h-100 shadow-sm hover-effect">
                {product.imageUrl && (
                  <div className="position-relative">
                    <img
                      src={product.imageUrl}
                      className="card-img-top"
                      alt={product.name}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className="badge bg-danger">
                        <FontAwesomeIcon icon={faClock} className="me-1" />
                        {timers[product._id] || calculateTimeLeft(product.endTime)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="card-body">
                  <h5 className="card-title">{product.name}</h5>
                  <p className="card-text text-muted">{product.description}</p>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-primary fw-bold fs-5">
                      {formatPrice(product.currentPrice)}
                    </span>
                  </div>
                  {isAuthenticated ? (
                    <Link
                      to={`/product/${product._id}`}
                      className="btn btn-primary w-100"
                    >
                      Place Bid
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="btn btn-outline-primary w-100"
                    >
                      Login to Bid
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container mb-5">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-4">🏠 Welcome to Auction It!</h2>
          <p className="lead mb-4">Your Ultimate Destination for Smart Bidding and Big Wins!</p>
          <p className="mb-5">At Auction It, we bring together buyers and sellers in a vibrant online marketplace where every bid counts. Whether you're looking to grab a rare collectible, score an amazing deal, or auction your own items for top dollar, we've got you covered.</p>
        </div>

        <div className="mb-5">
          <h3 className="text-center mb-4">💥 Why Choose Auction It?</h3>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faClock} className="text-primary me-3 mt-1" size="2x" />
                <div>
                  <h5>Real-Time Bidding</h5>
                  <p className="text-muted">Experience the thrill of live auctions from the comfort of your home.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faLock} className="text-success me-3 mt-1" size="2x" />
                <div>
                  <h5>Secure Transactions</h5>
                  <p className="text-muted">Safe payments powered by trusted payment gateways.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faDesktop} className="text-info me-3 mt-1" size="2x" />
                <div>
                  <h5>User-Friendly Interface</h5>
                  <p className="text-muted">Clean, responsive design across desktop and mobile.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faUserCheck} className="text-warning me-3 mt-1" size="2x" />
                <div>
                  <h5>Verified Users</h5>
                  <p className="text-muted">Only approved listings and trusted users.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faHistory} className="text-danger me-3 mt-1" size="2x" />
                <div>
                  <h5>Transparent History</h5>
                  <p className="text-muted">Stay informed with up-to-date bid tracking.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <h3 className="text-center mb-4">🎯 What Can You Do Here?</h3>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faUserPlus} className="text-primary me-3 mt-1" size="2x" />
                <div>
                  <h5>Register & Login</h5>
                  <p className="text-muted">Create your account in seconds and join the auction action.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faSearch} className="text-success me-3 mt-1" size="2x" />
                <div>
                  <h5>Explore Auctions</h5>
                  <p className="text-muted">Browse a wide range of categories and place your bids.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faCrown} className="text-warning me-3 mt-1" size="2x" />
                <div>
                  <h5>Win & Pay</h5>
                  <p className="text-muted">If you win, pay securely and get your item delivered.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h3 className="mb-4">🚀 Start Bidding Today!</h3>
          <p className="lead mb-4">Join thousands of bidders and sellers making exciting deals daily. The next big win could be just one bid away.</p>
          <p className="mb-4">Ready to get started?</p>
          <div className="d-flex justify-content-center gap-3">
            {!isAuthenticated && (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">Sign Up Now</Link>
                <Link to="/" className="btn btn-outline-primary btn-lg">Explore Auctions</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-light py-5">
        <div className="container text-center">
          <h3>Ready to Start Bidding?</h3>
          <p className="lead mb-4">Join our community of bidders and find unique items at great prices!</p>
          {!isAuthenticated && (
            <Link to="/register" className="btn btn-primary btn-lg">Sign Up Now</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;