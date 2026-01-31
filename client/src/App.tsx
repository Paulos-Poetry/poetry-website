import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import PoetryLanding from "./pages/PoetryLanding";
import LoginSignup from "./pages/LoginSignup";
import AdminDashboard from "./pages/AdminDashboard";
import "./styles/theme.scss";
import PoemDetail from "./components/PoetryDetail.tsx";
import Navbar from "./components/Navbar";
import { BASE_URL } from "./constants.ts";
import TranslationsLanding from "./pages/TranslationsLanding.tsx";
import TranslationsDetailPage from "./pages/TranslationsDetailPage.tsx";
import PoemDashboard from "./pages/PoemDashboard";
import TranslationDashboard from "./pages/TranslationDashboard";

// Function to check if the user is an admin
const isAdmin = () => {
  return localStorage.getItem("isAdmin") === "true"; // Check admin flag from localStorage
};

// Component to protect the admin route
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  return isAdmin() ? children : <Navigate to={BASE_URL} />; // Redirect if not an admin
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
          {/* Include the Navbar on all pages */}
          <Navbar />
          <Routes>
            <Route path={"/"} element={<Home />} />
            <Route path={"/poetry"} element={<PoetryLanding />} />
            <Route path={"/poetry/:id"} element={<PoemDetail />} />
            <Route path={"/login"} element={<LoginSignup />} />
            <Route path={"/translations"} element={<TranslationsLanding />} />
            <Route
              path={"/translations/:id"}
              element={<TranslationsDetailPage />}
            />
            <Route
              path={"/admin"}
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path={"/admin/poems"}
              element={
                <ProtectedAdminRoute>
                  <PoemDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path={"/admin/translations"}
              element={
                <ProtectedAdminRoute>
                  <TranslationDashboard />
                </ProtectedAdminRoute>
              }
            />
          </Routes>
        </div>
      </Router>
  );
};

export default App;
