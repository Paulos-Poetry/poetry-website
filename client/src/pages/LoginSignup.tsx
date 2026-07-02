import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginSignup.scss";
import { SupabaseService } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";

const LoginSignup: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [adminPasscode, setAdminPasscode] = useState("");
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { session, isLoggedIn, isAdmin, refreshProfile, loading } = useAuth();

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission for login or signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (isLogin) {
        await SupabaseService.signIn(formData.email, formData.password);
        navigate("/");
      } else {
        const { needsEmailConfirmation } = await SupabaseService.signUp(
          formData.username,
          formData.email,
          formData.password
        );
        if (needsEmailConfirmation) {
          setIsLogin(true);
          setSuccessMessage(
            "Account created! Check your email to confirm your address, then log in."
          );
        } else {
          setSuccessMessage("Account created — you are now logged in!");
        }
      }
    } catch (error) {
      const err = error as { message?: string };
      setErrorMessage(
        err?.message || "Authentication failed. Please check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle admin passcode verification
  const handleAdminVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = session?.user?.id;
    if (!userId) {
      setErrorMessage("You must be logged in to verify an admin passcode");
      return;
    }

    try {
      const result = await SupabaseService.verifyAdminPasscode(
        userId,
        adminPasscode
      );
      if (result.success) {
        await refreshProfile();
        setSuccessMessage("Admin privileges granted! Redirecting...");
        setErrorMessage("");
        setAdminPasscode("");
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
      } else {
        setErrorMessage(result.message || "Invalid passcode");
        setSuccessMessage("");
      }
    } catch (error) {
      const err = error as { message?: string };
      setErrorMessage(err.message || "Failed to verify passcode");
      setSuccessMessage("");
    }
  };

  // Toggle between login and signup modes
  const toggleFormMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage(""); // Clear error when toggling form
    setSuccessMessage("");
  };

  if (loading) {
    return (
      <div className="login-signup">
        <div className="form-container">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-signup">
      <div className="form-container">
        {!isLoggedIn ? (
          <>
            <h2>{isLogin ? "Login" : "Sign Up"}</h2>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && (
              <p className="success-message">{successMessage}</p>
            )}
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              {!isLogin && (
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              )}
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                minLength={6}
                required
              />
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? "Please wait…" : isLogin ? "Login" : "Sign Up"}
              </button>
            </form>
            <button className="toggle-button" onClick={toggleFormMode}>
              {isLogin ? "Switch to Signup" : "Switch to Login"}
            </button>
          </>
        ) : (
          <>
            <h2>Account</h2>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && (
              <p className="success-message">{successMessage}</p>
            )}
            <p className="logged-in-note">
              You are logged in as <strong>{session?.user?.email}</strong>.
            </p>

            {/* Admin Passcode Section - only for logged-in non-admin users */}
            {!isAdmin ? (
              <div className="admin-section">
                <button
                  className="admin-toggle-button"
                  onClick={() => setShowAdminInput(!showAdminInput)}
                >
                  {showAdminInput ? "Hide Admin Access" : "Have an Admin Passcode?"}
                </button>

                {showAdminInput && (
                  <form onSubmit={handleAdminVerification} className="admin-form">
                    <input
                      type="password"
                      placeholder="Enter Admin Passcode"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      required
                    />
                    <button type="submit" className="verify-button">
                      Verify Passcode
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <p className="admin-status">✓ You have admin privileges</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginSignup;
