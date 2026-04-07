import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";

// Pages
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Marketplace from "@/pages/Marketplace";
import Exchanges from "@/pages/Exchanges";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";

// Layout
import AppLayout from "@/components/layout/AppLayout";

// If user is not logged in, send them to landing page
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-purple-400">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Landing />} />

      {/* Protected routes - only for logged in users */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/exchanges" element={<Exchanges />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
