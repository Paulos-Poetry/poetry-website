import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.scss";
import { useAuth } from "../contexts/AuthContext";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false); // State to control navbar visibility
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the navbar menu
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, signOut } = useAuth();

  // Toggle the menu visibility
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Handle logout and redirect to login page
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
    setIsOpen(false);
  };

  // Close the menu if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false); // Close the menu if clicked outside
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="navbar">
      {/* Hamburger Icon */}
      <button className="navbar-toggle" onClick={toggleMenu}>
        ☰
      </button>

      {/* Navbar Menu (Sliding from left) */}
      <div className={`navbar-menu ${isOpen ? "open" : ""}`} ref={menuRef}>
        <ul>
          <li>
            <Link to="/" onClick={toggleMenu}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/poetry" onClick={toggleMenu}>
              Poetry
            </Link>
          </li>
          <li>
            <Link to="/translations" onClick={toggleMenu}>
              Translations
            </Link>
          </li>
        </ul>

        <div className="navbar-bottom">
          {/* Conditionally show the Admin Dashboard links if the user is an admin */}
          {isAdmin && (
            <>
              <li className="admin-subheader">Admin</li>
              <li>
                <Link to="/admin" onClick={toggleMenu}>
                  User Management
                </Link>
              </li>
              <li>
                <Link to="/admin/poems" onClick={toggleMenu}>
                  Poem Management
                </Link>
              </li>
              <li>
                <Link to="/admin/translations" onClick={toggleMenu}>
                  Translation Management
                </Link>
              </li>
            </>
          )}

          {/* Show Logout as a button */}
          {isLoggedIn ? (
            <li className="logout">
              <button onClick={handleLogout}>Logout</button>
            </li>
          ) : (
            <li>
              <Link to="/login" onClick={toggleMenu}>
                Login
              </Link>
            </li>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
