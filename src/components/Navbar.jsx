import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faUser, faSignOutAlt, faTrophy } from '@fortawesome/free-solid-svg-icons';

function Navbar({ isAuthenticated, isAdmin, onLogout }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm w-100">
      <div className="container-fluid px-4">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <FontAwesomeIcon icon={faGavel} className="me-2" />
          Auction It
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            {!isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link px-3" to="/">
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link px-3" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link px-3" to="/register">
                    Register
                  </Link>
                </li>
              </>
            ) : isAdmin ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link px-3" to="/admin">
                    <FontAwesomeIcon icon={faUser} className="me-1" />
                    Admin Panel
                  </Link>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-link px-3"
                    onClick={onLogout}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link px-3" to="/">
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link px-3" to="/my-wins">
                    <FontAwesomeIcon icon={faTrophy} className="me-1" />
                    My Wins
                  </Link>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-link px-3"
                    onClick={onLogout}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;