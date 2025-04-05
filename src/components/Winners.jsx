import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';

function Winners() {
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/delivered-orders');
        const data = await response.json();
        setWinners(data);
      } catch (error) {
        console.error('Error fetching winners:', error);
      }
    };

    fetchWinners();
  }, []);

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
      day: 'numeric'
    });
  };

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4">
        <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
        Auction Winners
      </h2>
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>Product</th>
              <th>Winner</th>
              <th>Final Price</th>
              <th>End Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((winner) => (
              <tr key={winner._id}>
                <td>
                  <div className="d-flex align-items-center">
                    {winner.imageUrl && (
                      <img
                        src={winner.imageUrl}
                        alt={winner.name}
                        className="me-2"
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                      />
                    )}
                    <span>{winner.name}</span>
                  </div>
                </td>
                <td>{winner.winner?.username}</td>
                <td>{formatPrice(winner.currentPrice)}</td>
                <td>{formatDate(winner.endTime)}</td>
                <td>
                  <span className="badge bg-success">Paid</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Winners;