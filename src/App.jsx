import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import ProductDetails from './components/ProductDetails';
import MyWins from './components/MyWins';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = (token, adminStatus) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setIsAdmin(adminStatus);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <Router>
      <div className="App min-vh-100 d-flex flex-column">
        <Navbar isAuthenticated={isAuthenticated} isAdmin={isAdmin} onLogout={handleLogout} />
        <div className="container-fluid flex-grow-1 py-4">
          <Routes>
            <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
            <Route 
              path="/login" 
              element={
                !isAuthenticated ? 
                <Login onLogin={handleLogin} /> : 
                <Navigate to="/" />
              } 
            />
            <Route 
              path="/register" 
              element={
                !isAuthenticated ? 
                <Register /> : 
                <Navigate to="/" />
              } 
            />
            <Route 
              path="/admin" 
              element={
                isAuthenticated && isAdmin ? 
                <AdminPanel /> : 
                <Navigate to="/" />
              } 
            />
            <Route 
              path="/product/:id" 
              element={
                isAuthenticated ? 
                <ProductDetails /> : 
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="/my-wins" 
              element={
                isAuthenticated ? 
                <MyWins /> : 
                <Navigate to="/login" />
              } 
            />
          </Routes>
        </div>
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

export default App;
