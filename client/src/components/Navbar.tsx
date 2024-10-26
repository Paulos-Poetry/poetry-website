import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.scss"; // Assuming your styles are in this file
import { BASE_URL } from "../constants";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false); // State to control navbar visibility
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the navbar menu
  const navigate = useNavigate();

  // Toggle the menu visibility
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Handle logout and redirect to login page
  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    sessionStorage.removeItem("isAdmin");
    navigate("/login"); // Redirect to login page after logout
    setIsOpen(false); // Close the menu after logout
  };

  // Check if the user is logged in and if the user is an admin
  const isLoggedIn =
    !!localStorage.getItem("token") || !!sessionStorage.getItem("token");
  const isAdmin =
    localStorage.getItem("isAdmin") === "true" ||
    sessionStorage.getItem("isAdmin") === "true";

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
            <Link to={BASE_URL + "/"} onClick={toggleMenu}>
              Home
            </Link>
          </li>
          <li>
            <Link to={BASE_URL + "/poetry"} onClick={toggleMenu}>
              Poetry
            </Link>
          </li>
          <li>
            <Link to={BASE_URL + "/translations"} onClick={toggleMenu}>
              Translations
            </Link>
          </li>
        </ul>

        <div className="navbar-bottom">
          {/* Conditionally show the Admin Dashboard link if the user is an admin */}
          {isAdmin && (
            <li>
              <Link to={BASE_URL + "/admin"} onClick={toggleMenu}>
                Admin Dashboard
              </Link>
            </li>
          )}

          {/* Conditionally show the Translation Dashboard link if the user is an admin */}
          {isAdmin && (
              <li>
                <Link to={BASE_URL + "/translation/admin"} onClick={toggleMenu}>
                  Translation Dashboard
                </Link>
              </li>
          )}

          {/* Show Logout as a button */}
          {isLoggedIn ? (
            <li className="logout">
              <button onClick={handleLogout}>Logout</button>
            </li>
          ) : (
            <li>
              <Link to={BASE_URL + "/login"} onClick={toggleMenu}>
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
