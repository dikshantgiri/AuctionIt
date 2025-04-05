import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faClock, faDollarSign, faHistory } from '@fortawesome/free-solid-svg-icons';

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/products/${id}`);
        const data = await response.json();
        setProduct(data);
        setBids(data.bids || []);
        setBidAmount(data.currentPrice + 1); // Set initial bid amount
      } catch (error) {
        toast.error('Error fetching product details');
      }
    };

    fetchProduct();

    // Setup Socket.io connection
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Listen for bid updates and errors
    newSocket.on('bidUpdate', ({ productId, currentPrice, bid }) => {
      if (productId === id) {
        setProduct(prevProduct => ({
          ...prevProduct,
          currentPrice
        }));
        setBidAmount(currentPrice + 1);
        setBids(prevBids => [bid, ...prevBids]);
      }
    });

    newSocket.on('bidError', ({ message }) => {
      toast.error(message);
    });

    return () => newSocket.close();
  }, [id]);

  const handleBid = async (e) => {
    e.preventDefault();
    if (!bidAmount || bidAmount <= product.currentPrice) {
      toast.error('Bid amount must be higher than current price');
      return;
    }

    const now = new Date();
    if (now > new Date(product.endTime)) {
      toast.error('Auction has ended');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/products/${id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: bidAmount })
      });

      if (!response.ok) {
        throw new Error('Failed to place bid');
      }

      socket.emit('placeBid', {
        productId: id,
        amount: bidAmount,
        userId: localStorage.getItem('userId')
      });

      toast.success('Bid placed successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let timer;
    const updateTimer = async () => {
      if (!product?.endTime) return;

      const now = new Date().getTime();
      const end = new Date(product.endTime).getTime();
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeLeft('Auction ended');
        clearInterval(timer);
        
        // Only attempt to end auction if product status is still active
        if (product.status === 'active') {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/products/${id}/end-auction`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = 'Failed to end auction';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
              } catch (parseError) {
                console.error('Error parsing error response:', parseError);
              }
              throw new Error(errorMessage);
            }
            
            const data = await response.json();
            setProduct(prev => ({ ...prev, status: 'ended' }));
            if (data.winner) {
              toast.success(`Auction ended! Winner: ${data.winner}`);
            } else {
              toast.info('Auction ended with no bids');
            }
          } catch (error) {
            console.error('Error ending auction:', error);
            toast.error(error.message || 'Error ending auction');
          }
        }
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    timer = setInterval(updateTimer, 1000);
    updateTimer(); // Initial update

    return () => clearInterval(timer);
  }, [product?.endTime]);

  const calculateTimeLeft = () => {
    if (!product?.endTime) return 'Loading...';

    const now = new Date().getTime();
    const end = new Date(product.endTime).getTime();
    const remaining = end - now;

    if (remaining <= 0) return 'Auction ended';

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  if (!product) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card shadow">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                className="card-img-top"
                alt={product.name}
                style={{ height: '300px', objectFit: 'cover' }}
              />
            )}
            <div className="card-body p-4">
              <h2 className="card-title text-center mb-4 display-6">
                <FontAwesomeIcon icon={faGavel} className="me-2" />
                {product.name}
              </h2>
              <div className="mb-4">
                <p className="card-text lead">{product.description}</p>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                  <div className="text-primary fw-bold fs-3">
                    Current Bid: {formatPrice(product.currentPrice)}
                  </div>
                  <div className="text-muted fs-5">
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    {calculateTimeLeft(product.endTime)}
                  </div>
                </div>
              </div>
              <form onSubmit={handleBid} className="mt-4">
                <div className="mb-4">
                  <label htmlFor="bidAmount" className="form-label fw-medium fs-5">
                    Your Bid Amount
                  </label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text">
                      <FontAwesomeIcon icon={faDollarSign} />
                    </span>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      id="bidAmount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(Number(e.target.value))}
                      min={product.currentPrice + 1}
                      step="1"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100"
                  disabled={loading}
                >
                  {loading ? 'Placing Bid...' : 'Place Bid'}
                </button>
              </form>

              <div className="mt-4">
                <h4 className="mb-3">
                  <FontAwesomeIcon icon={faHistory} className="me-2" />
                  Highest Bids by User
                </h4>
                <div className="list-group">
                  {bids
                    .reduce((acc, bid) => {
                      const existingBid = acc.find(b => b.bidder.username === bid.bidder.username);
                      if (!existingBid || existingBid.amount < bid.amount) {
                        const filteredAcc = acc.filter(b => b.bidder.username !== bid.bidder.username);
                        return [...filteredAcc, bid];
                      }
                      return acc;
                    }, [])
                    .sort((a, b) => b.amount - a.amount)
                    .map((bid, index) => (
                      <div
                        key={bid.timestamp}
                        className={`list-group-item list-group-item-action ${index === 0 ? 'active' : ''}`}
                      >
                        <div className="d-flex w-100 justify-content-between align-items-center">
                          <h6 className="mb-1">{bid.bidder.username}</h6>
                          <small>{new Date(bid.timestamp).toLocaleString()}</small>
                        </div>
                        <p className="mb-1">{formatPrice(bid.amount)}</p>
                      </div>
                    ))}
                  {bids.length === 0 && (
                    <div className="text-center text-muted py-3">
                      No bids yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;