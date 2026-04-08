import { useEffect, useState } from "react";
import API from "@/api/axios";
import AuthContext from "@/context/auth-context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const extractUserFromResponse = (payload) => payload?.data?.data || null;

  // Reads the active login session from the backend.
  const refreshUser = async ({ silent = false } = {}) => {
    try {
      const response = await API.get("/auth/me");
      const resolvedUser = extractUserFromResponse(response);
      setUser(resolvedUser);
      return {
        success: true,
        user: resolvedUser,
        message: response?.data?.message || "Authenticated",
      };
    } catch (error) {
      const statusCode = error?.response?.status;
      if (statusCode === 401) {
        setUser(null);
      }

      const message =
        error?.response?.data?.message || "Unable to verify current session.";

      return { success: false, user: null, message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // On app load, check if user is already logged in.
    setLoading(true);
    refreshUser({ silent: true });
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
