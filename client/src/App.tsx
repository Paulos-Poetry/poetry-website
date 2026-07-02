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
import TranslationsLanding from "./pages/TranslationsLanding.tsx";
import TranslationsDetailPage from "./pages/TranslationsDetailPage.tsx";
import PoemDashboard from "./pages/PoemDashboard";
import TranslationDashboard from "./pages/TranslationDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Only admins (verified through Supabase Auth + profile) may enter
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <p style={{ textAlign: "center", marginTop: "6rem" }}>Loading…</p>;
  return isAdmin ? children : <Navigate to="/" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          {/* Include the Navbar on all pages */}
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/poetry" element={<PoetryLanding />} />
            <Route path="/poetry/:id" element={<PoemDetail />} />
            <Route path="/login" element={<LoginSignup />} />
            <Route path="/translations" element={<TranslationsLanding />} />
            <Route
              path="/translations/:id"
              element={<TranslationsDetailPage />}
            />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/poems"
              element={
                <ProtectedAdminRoute>
                  <PoemDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/translations"
              element={
                <ProtectedAdminRoute>
                  <TranslationDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
