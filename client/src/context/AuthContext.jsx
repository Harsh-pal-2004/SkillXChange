import { useEffect, useState } from "react";
import API from "@/api/axios";
import AuthContext from "@/context/auth-context";
import { connectSocket, disconnectSocket, socket } from "@/socket";

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
        localStorage.removeItem("token");
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

  useEffect(() => {
    if (!user?._id) {
      disconnectSocket();
      return;
    }

    connectSocket(user._id);

    const handleSessionRevoked = () => {
      localStorage.removeItem("token");
      setUser(null);
    };

    const handleTakeoverRequest = async (payload = {}) => {
      const approvalId = payload?.approvalId;
      if (!approvalId) {
        return;
      }

      const approved = window.confirm(
        "A new login attempt was detected for your account. Press OK to allow it, or Cancel to deny.",
      );

      try {
        await API.post("/auth/session/approval", {
          approvalId,
          decision: approved ? "allow" : "deny",
        });
      } catch {
        // If this fails, the new login can still proceed with explicit force takeover.
      }
    };

    socket.on("session:revoked", handleSessionRevoked);
    socket.on("session:takeover-request", handleTakeoverRequest);

    return () => {
      socket.off("session:revoked", handleSessionRevoked);
      socket.off("session:takeover-request", handleTakeoverRequest);
    };
  }, [user?._id]);

  const logout = async () => {
    try {
      await API.get("/auth/logout");
    } finally {
      localStorage.removeItem("token");
      disconnectSocket();
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
