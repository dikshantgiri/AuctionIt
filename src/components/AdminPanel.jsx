import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faList, faGavel, faTrash, faRotate, faUsers, faBan, faUserSlash, faHistory, faCheck, faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('auctions');
  const [products, setProducts] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startingPrice: '',
    endTime: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showRepublishModal, setShowRepublishModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const users = await response.json();
      setUsers(users);
    } catch (error) {
      toast.error('Error fetching users');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await fetch('http://localhost:3000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to fetch products');
        } catch (parseError) {
          throw new Error(`Failed to fetch products: ${errorText || 'Unknown error'}`);
        }
      }

      const products = await response.json();

      if (!Array.isArray(products)) {
        console.error('Invalid products data:', products);
        throw new Error('Invalid products data: Expected an array');
      }

      const sortedProducts = products.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Error fetching data');
      setProducts([]);
      setDeliveredOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    setFormData(prevState => ({
      ...prevState,
      image: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      let imageUrl = null;
      if (formData.image) {
        const imageFormData = new FormData();
        imageFormData.append('image', formData.image);

        const uploadResponse = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: imageFormData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.imageUrl;
      }

      const response = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          startingPrice: Number(formData.startingPrice),
          currentPrice: Number(formData.startingPrice),
          imageUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      toast.success('Product created successfully!');
      setFormData({
        name: '',
        description: '',
        startingPrice: '',
        endTime: '',
        image: null
      });
      fetchProducts();
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

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this auction?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete auction');
        }

        toast.success('Auction deleted successfully!');
        fetchProducts();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete user');
        }

        toast.success('User deleted successfully!');
        fetchUsers();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  const handleRepublish = async (product) => {
    setSelectedProduct({
      ...product,
      endTime: '',
      startingPrice: product.currentPrice
    });
    setShowRepublishModal(true);
  };

  const handleRepublishSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedProduct.name,
          description: selectedProduct.description,
          startingPrice: Number(selectedProduct.startingPrice),
          currentPrice: Number(selectedProduct.startingPrice),
          endTime: selectedProduct.endTime,
          imageUrl: selectedProduct.imageUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to republish auction');
      }

      toast.success('Auction republished successfully!');
      setShowRepublishModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid h-100 py-4">
      <h2 className="text-center mb-4 display-6">
        <FontAwesomeIcon icon={faGavel} className="me-2" />
        Admin Panel
      </h2>
      
      <div className="d-flex justify-content-center mb-4">
        <div className="btn-group">
          <button
            className={`btn btn-lg ${activeTab !== 'users' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('auctions')}
          >
            <FontAwesomeIcon icon={faGavel} className="me-2" />
            All Auctions
          </button>
          <button
            className={`btn btn-lg ${activeTab === 'users' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('users')}
          >
            <FontAwesomeIcon icon={faUsers} className="me-2" />
            Manage Users
          </button>
        </div>
      </div>
      
      {activeTab !== 'users' ? (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow h-100">
              <div className="card-body p-4">
                <h3 className="card-title h4 mb-4">
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Create New Auction
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="name" className="form-label fw-medium">Product Name</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="description" className="form-label fw-medium">Description</label>
                    <textarea
                      className="form-control form-control-lg"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="4"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="startingPrice" className="form-label fw-medium">Starting Price ($)</label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      id="startingPrice"
                      name="startingPrice"
                      value={formData.startingPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="endTime" className="form-label fw-medium">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-control form-control-lg"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="image" className="form-label fw-medium">Product Image</label>
                    <input
                      type="file"
                      className="form-control form-control-lg"
                      id="image"
                      name="image"
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Auction'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow h-100">
              <div className="card-body p-4">
                <h3 className="card-title h4 mb-4">
                  <FontAwesomeIcon icon={faList} className="me-2" />
                  All Auctions
                </h3>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <p>No auctions available</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Current Price</th>
                          <th>End Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(product => {
                          const now = new Date();
                          const endTime = new Date(product.endTime);
                          const isActive = endTime > now;
                          return (
                            <tr key={product._id}>
                              <td>{product.name}</td>
                              <td>{formatPrice(product.currentPrice)}</td>
                              <td>{new Date(product.endTime).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>
                                  {isActive ? 'Active' : 'Ended'}
                                </span>
                                {product.paid && (
                                  <span className="badge bg-primary ms-2">Paid</span>
                                )}
                                {deliveredOrders.some(order => order.productId === product._id) && (
                                  <span className="badge bg-info ms-2">Delivered</span>
                                )}
                              </td>
                              <td>
                                {!isActive && !product.paid && (
                                  <button
                                    onClick={() => handleRepublish(product)}
                                    className="btn btn-sm btn-outline-primary me-2"
                                  >
                                    <FontAwesomeIcon icon={faRotate} className="me-1" />
                                    Republish
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(product._id)}
                                  className="btn btn-sm btn-outline-danger"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="me-1" />
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
) : (
        <div className="card shadow">
          <div className="card-body">
            <h3 className="card-title h4 mb-4">
              <FontAwesomeIcon icon={faUsers} className="me-2" />
              User Management
            </h3>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>
                        {editingUser?.username === user.username ? (
                          <input
                            type="text"
                            className="form-control"
                            value={editingUser.username}
                            onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                          />
                        ) : user.username}
                      </td>
                      <td>
                        {editingUser?.username === user.username ? (
                          <input
                            type="tel"
                            className="form-control"
                            value={editingUser.phoneNumber}
                            onChange={(e) => setEditingUser({...editingUser, phoneNumber: e.target.value})}
                          />
                        ) : user.phoneNumber}
                      </td>
                      <td>
                        {editingUser?.username === user.username ? (
                          <input
                            type="text"
                            className="form-control"
                            value={editingUser.address}
                            onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                          />
                        ) : user.address}
                      </td>
                      <td>
                        <span className={`badge ${user.isBlocked ? 'bg-danger' : 'bg-success'}`}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          {editingUser?.username === user.username ? (
                            <>
                              <button
                                className="btn btn-sm btn-success me-1"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`http://localhost:3000/api/users/${user._id}`, {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify(editingUser)
                                    });
                                    
                                    if (!response.ok) throw new Error('Failed to update user');
                                    toast.success('User updated successfully');
                                    setEditingUser(null);
                                    fetchUsers();
                                  } catch (error) {
                                    toast.error(error.message);
                                  }
                                }}
                              >
                                <FontAwesomeIcon icon={faCheck} className="me-1" />
                                Save
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setEditingUser(null)}
                              >
                                <FontAwesomeIcon icon={faTimes} className="me-1" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm btn-primary me-1"
                                onClick={() => setEditingUser(user)}
                              >
                                <FontAwesomeIcon icon={faEdit} className="me-1" />
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-warning me-1"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`http://localhost:3000/api/users/${user._id}/toggle-block`, {
                                      method: 'PUT',
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });

                                    if (!response.ok) throw new Error('Failed to toggle user block status');
                                    toast.success(`User ${user.isBlocked ? 'unblocked' : 'blocked'} successfully`);
                                    fetchUsers();
                                  } catch (error) {
                                    toast.error(error.message);
                                  }
                                }}
                              >
                                <FontAwesomeIcon icon={user.isBlocked ? faBan : faUserSlash} className="me-1" />
                                {user.isBlocked ? 'Unblock' : 'Block'}
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteUser(user._id)}
                              >
                                <FontAwesomeIcon icon={faTrash} className="me-1" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showRepublishModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Republish Auction</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowRepublishModal(false);
                    setSelectedProduct(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleRepublishSubmit}>
                  <div className="mb-3">
                    <label htmlFor="republishEndTime" className="form-label">New End Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      id="republishEndTime"
                      value={selectedProduct.endTime}
                      onChange={(e) => setSelectedProduct({...selectedProduct, endTime: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="republishStartingPrice" className="form-label">New Starting Price ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      id="republishStartingPrice"
                      value={selectedProduct.startingPrice}
                      onChange={(e) => setSelectedProduct({...selectedProduct, startingPrice: e.target.value})}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowRepublishModal(false);
                        setSelectedProduct(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Republishing...' : 'Republish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;