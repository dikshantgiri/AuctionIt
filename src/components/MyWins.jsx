import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCreditCard, faCheck, faUser, faClock } from '@fortawesome/free-solid-svg-icons';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

function PaymentForm({ winningBid, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: winningBid.product._id
        })
      });

      const { clientSecret } = await response.json();
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: localStorage.getItem('username')
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        await fetch('http://localhost:3000/api/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: winningBid.product._id
          })
        });
        
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error) {
      toast.error('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <CardElement className="p-3 border rounded" />
      <button
        type="submit"
        className="btn btn-primary mt-3 w-100"
        disabled={!stripe || loading}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

function MyWins() {
  const [winningBids, setWinningBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    fetchWinningBids();
  }, []);

  const fetchWinningBids = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/my-wins', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch winning bids');
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setWinningBids(data);
      } else {
        setWinningBids([]);
        toast.warning('No winning bids found');
      }
    } catch (error) {
      console.error('Error fetching winning bids:', error);
      toast.error(error.message || 'Error fetching winning bids');
      setWinningBids([]);
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  return (
    <div className="container py-4">
      <h2 className="text-center mb-4 display-6">
        <FontAwesomeIcon icon={faTrophy} className="me-2" />
        My Winning Bids
      </h2>

      {winningBids.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">You haven't won any auctions yet.</p>
        </div>
      ) : (
        <div className="row">
          {winningBids.map((bid) => (
            <div key={bid._id} className="col-12 col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                {bid.product?.imageUrl && (
                  <img
                    src={bid.product.imageUrl}
                    className="card-img-top"
                    alt={bid.productName}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}
                <div className="card-body">
                  <h5 className="card-title">{bid.productName}</h5>
                  <div className="mb-2">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    <small className="text-muted">Winner: {bid.username}</small>
                  </div>
                  <div className="mb-2">
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    <small className="text-muted">Won on: {formatDate(bid.winningDate)}</small>
                  </div>
                  <p className="card-text">
                    Final Bid: {formatPrice(bid.finalBidAmount)}
                  </p>
                  <div className="mt-3">
                    {bid.paymentStatus === 'pending' ? (
                      <div>
                        <button
                          className="btn btn-primary w-100"
                          onClick={() => setSelectedBid(bid)}
                        >
                          <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                          Pay Now
                        </button>
                        {selectedBid?._id === bid._id && (
                          <Elements stripe={stripePromise}>
                            <PaymentForm
                              winningBid={bid}
                              onSuccess={() => {
                                setSelectedBid(null);
                                fetchWinningBids();
                              }}
                            />
                          </Elements>
                        )}
                      </div>
                    ) : (
                      <div className="text-success">
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        Payment Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyWins;