import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/LoginSignup.scss";
import { useBackend } from "../contexts/BackendContext";
import { SupabaseService } from "../services/apiService";

const URL = import.meta.env.VITE_ADDRESS;

// Create Axios instance with baseURL
const axiosInstance = axios.create({
  baseURL: URL,
});


const LoginSignup: React.FC = () => {
  const { currentBackend } = useBackend();
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const navigate = useNavigate(); // React Router v6 hook to navigate

  // Check if the user is already logged in when they visit the page
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setShowModal(true); // Show modal if user is already logged in
      setTimeout(() => {
        navigate("/"); // Redirect to main page after showing modal for 2 seconds
      }, 2000);
    }
  }, [navigate]);

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission for login or signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentBackend === 'supabase') {
        if (isLogin) {
          // Direct Supabase authentication using poetry_users table
          const user = await SupabaseService.signIn(formData.email, formData.password);
          // Generate a simple token (in production, use proper JWT)
          const token = btoa(JSON.stringify({ id: user.id, email: user.email, timestamp: Date.now() }));
          localStorage.setItem('token', token);
          localStorage.setItem('isAdmin', String(user.is_admin || false));
          localStorage.setItem('userId', user.id);
          navigate('/');
        } else {
          // Signup using Supabase
          await SupabaseService.signUp(formData.username, formData.email, formData.password);
          setIsLogin(true);
          setErrorMessage("Account created successfully! Please log in.");
        }
      } else {
        // fallback to existing heroku API
        if (isLogin) {
          // Login request - try email first, then username
          const loginData = formData.email 
            ? { email: formData.email, password: formData.password }
            : { username: formData.username, password: formData.password };
          
          const resp = await axiosInstance.post<{ token: string; isAdmin: boolean }>("/login", loginData);
          console.log("Login Success:", resp.data);
          localStorage.setItem("token", resp.data.token);
          localStorage.setItem("isAdmin", String(resp.data.isAdmin));

          navigate("/"); // Redirect to main page after successful login
        } else {
          // Signup request
          const resp = await axiosInstance.post("/signup", formData);
          console.log("Signup Success:", resp.data);
          setIsLogin(true); // Switch to login form after signup
        }
      }

      setErrorMessage(""); // Clear error message on success
    } catch (error) {
      // Narrow the error to expected axios-like shape or fallback
      const err = error as unknown as { response?: { data?: { msg?: string } }; message?: string };
      const errorMsg = err?.response?.data?.msg || err?.message || "Authentication failed. Please check your credentials.";
      setErrorMessage(errorMsg);
    }
  };

  // Toggle between login and signup modes
  const toggleFormMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage(""); // Clear error when toggling form
  };

  return (
    <div className="login-signup">
      <div className="form-container">
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>
        <p className="backend-indicator">Using: {currentBackend}</p>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          {/* Show email for signup, or for Supabase login */}
          {(!isLogin || currentBackend === 'supabase') && (
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          )}
          {/* Show username for signup, or for Heroku login */}
          {(!isLogin || currentBackend === 'heroku') && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleInputChange}
              required={!isLogin || currentBackend === 'heroku'}
            />
          )}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          <button type="submit" className="submit-button">
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <button className="toggle-button" onClick={toggleFormMode}>
          {isLogin ? "Switch to Signup" : "Switch to Login"}
        </button>
      </div>

      {/* Modal popup for already logged in */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <p>You are already logged in! Redirecting to the main page...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginSignup;
