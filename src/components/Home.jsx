import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faClock, faFire, faTag, faGem } from '@fortawesome/free-solid-svg-icons';

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
              <h1 className="display-4 fw-bold">Live Auction Platform</h1>
              <p className="lead">Discover unique items and bid in real-time. Join our exciting auctions today!</p>
              {!isAuthenticated && (
                <Link to="/register" className="btn btn-light btn-lg me-3">Get Started</Link>
              )}
            </div>
            <div className="col-md-6 text-center">
              <FontAwesomeIcon icon={faGavel} size="6x" className="ms-auto d-none d-md-block" />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Categories */}
      <div className="container mb-5">
        <h2 className="text-center mb-4">Popular Categories</h2>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card text-center h-100">
              <div className="card-body">
                <FontAwesomeIcon icon={faGem} size="3x" className="text-primary mb-3" />
                <h5 className="card-title">Jewelry & Watches</h5>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card text-center h-100">
              <div className="card-body">
                <FontAwesomeIcon icon={faTag} size="3x" className="text-success mb-3" />
                <h5 className="card-title">Collectibles</h5>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card text-center h-100">
              <div className="card-body">
                <FontAwesomeIcon icon={faFire} size="3x" className="text-danger mb-3" />
                <h5 className="card-title">Hot Items</h5>
              </div>
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