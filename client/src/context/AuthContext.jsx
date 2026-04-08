import { useEffect, useState } from "react";
import API from "@/api/axios";
import AuthContext from "@/context/auth-context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reads the active login session from the backend.
  const refreshUser = async () => {
    try {
      const response = await API.get("/auth/me");
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // On app load, check if user is already logged in.
    setLoading(true);
    refreshUser();
  }, []);

  const logout = async () => {
    try {
      await API.get("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
