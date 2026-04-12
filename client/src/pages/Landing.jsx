import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import API from "@/api/axios";
import { connectPublicSocket, disconnectSocket, socket } from "@/socket";
import {
  ArrowRight,
  Users,
  Zap,
  Shield,
  MessageSquare,
  Star,
  ArrowLeftRight,
  Trophy,
  X,
  Mail,
  User,
  Lock,
} from "lucide-react";

const initialForm = {
  name: "",
  username: "",
  email: "",
  identifier: "",
  password: "",
};

export default function Landing() {
  const { user, refreshUser, setUser } = useAuth();
  const navigate = useNavigate();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingApprovalId, setPendingApprovalId] = useState("");
  const [liveStats, setLiveStats] = useState({
    totalUsers: 0,
    totalExchanges: 0,
    averageRating: null,
    totalRatingVotes: 0,
  });

  const formattedStats = useMemo(
    () => [
      {
        icon: Users,
        value: new Intl.NumberFormat("en-US").format(liveStats.totalUsers),
        label: "Users",
      },
      {
        icon: ArrowLeftRight,
        value: new Intl.NumberFormat("en-US").format(liveStats.totalExchanges),
        label: "Exchanges",
      },
      {
        icon: Star,
        value:
          liveStats.averageRating === null
            ? "New"
            : liveStats.averageRating.toFixed(1),
        label: "Rating",
      },
    ],
    [liveStats],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const authToken = url.searchParams.get("authToken");
    const authError = url.searchParams.get("authError");

    if (!authToken && !authError) {
      return;
    }

    // Clear one-time callback params immediately to avoid duplicate processing.
    url.searchParams.delete("authToken");
    url.searchParams.delete("authProvider");
    url.searchParams.delete("authError");
    window.history.replaceState({}, "", url.toString());

    if (authToken) {
      localStorage.setItem("token", authToken);
      refreshUser({ silent: true }).then((result) => {
        if (result?.success) {
          setIsAuthOpen(false);
          navigate("/dashboard", { replace: true });
          return;
        }

        localStorage.removeItem("token");
        setMode("login");
        setError("Google login failed while validating your session.");
        setIsAuthOpen(true);
      });
      return;
    }

    if (authError === "google_not_configured") {
      setMode("login");
      setError(
        "Google login is currently unavailable. Please complete GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.",
      );
      setIsAuthOpen(true);
      return;
    }

    if (authError === "google_session_conflict") {
      const shouldTakeover = window.confirm(
        "This account is already logged in on another device. Press OK to continue and sign out the previous session.",
      );

      if (shouldTakeover) {
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google?forceNewSession=true`;
        return;
      }

      setMode("login");
      setError("Google login was cancelled because another device is active.");
      setIsAuthOpen(true);
      return;
    }

    setMode("login");
    setError("Google login failed. Please try again.");
    setIsAuthOpen(true);
  }, [navigate, refreshUser]);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const response = await API.get("/api/public/stats");
        if (isMounted) {
          setLiveStats(response.data);
        }
      } catch {
        // Keep landing page usable even if public stats are temporarily unavailable.
      }
    };

    const handlePublicStats = (stats) => {
      if (isMounted) {
        setLiveStats(stats);
      }
    };

    loadStats();
    connectPublicSocket();
    socket.on("public:stats", handlePublicStats);
    socket.emit("public:stats:subscribe");

    return () => {
      isMounted = false;
      socket.emit("public:stats:unsubscribe");
      socket.off("public:stats", handlePublicStats);
      disconnectSocket();
    };
  }, []);

  const openAuth = (nextMode) => {
    if (user) {
      navigate("/dashboard");
      return;
    }

    setMode(nextMode);
    setError("");
    setIsAuthOpen(true);
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
    setError("");
    setForm(initialForm);
  };

  const handleGoogleAuth = ({ forceNewSession = false } = {}) => {
    if (user) {
      navigate("/dashboard");
      return;
    }

    const suffix = forceNewSession ? "?forceNewSession=true" : "";
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google${suffix}`;
  };

  const resolveApiMessage = (requestError, fallbackMessage) => {
    const apiMessage = requestError?.response?.data?.message;
    return apiMessage || fallbackMessage;
  };

  const handleLogoClick = (event) => {
    event.preventDefault();

    if (user) {
      navigate("/dashboard");
      return;
    }

    const heroSection = document.getElementById("hero");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLocalAuth = async () => {
    setSubmitting(true);
    setError("");

    try {
      let response;

      if (mode === "login") {
        const payload = {
          identifier: form.identifier,
          password: form.password,
        };

        if (pendingApprovalId) {
          payload.approvalId = pendingApprovalId;
        }

        response = await API.post("/auth/login", payload);
      } else {
        response = await API.post("/auth/register", {
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
        });
      }

      const authenticatedUser = response?.data?.data || null;

      const token = response?.data?.token;
      if (token) {
        localStorage.setItem("token", token);
      }

      if (!response?.data?.success || !authenticatedUser) {
        throw new Error(response?.data?.message || "Authentication failed.");
      }

      setUser(authenticatedUser);
      setPendingApprovalId("");
      await refreshUser({ silent: true });
      closeAuth();
      navigate("/dashboard");
    } catch (requestError) {
      const isSessionConflict =
        requestError?.response?.status === 409 &&
        requestError?.response?.data?.code === "SESSION_CONFLICT";

      if (isSessionConflict && mode === "login") {
        const approvalIdFromServer =
          requestError?.response?.data?.data?.approvalId || "";

        const shouldTakeover = window.confirm(
          "This account is active on another device. Press OK to sign out the previous session now. Press Cancel to approve from the existing session, then click Login again here.",
        );

        if (shouldTakeover) {
          const takeoverResponse = await API.post("/auth/login", {
            identifier: form.identifier,
            password: form.password,
            forceNewSession: true,
          });

          const takeoverUser = takeoverResponse?.data?.data || null;
          const takeoverToken = takeoverResponse?.data?.token;

          if (
            !takeoverResponse?.data?.success ||
            !takeoverUser ||
            !takeoverToken
          ) {
            throw new Error(
              takeoverResponse?.data?.message || "Session takeover failed.",
            );
          }

          localStorage.setItem("token", takeoverToken);
          setUser(takeoverUser);
          setPendingApprovalId("");
          await refreshUser({ silent: true });
          closeAuth();
          navigate("/dashboard");
          return;
        }

        setPendingApprovalId(approvalIdFromServer);
        setError(
          "Approval request sent to your active session. Approve it there, then click Login again.",
        );
        return;
      }

      setError(
        resolveApiMessage(
          requestError,
          "Authentication failed. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4 lg:px-8">
        <a
          href="#hero"
          onClick={handleLogoClick}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
            <ArrowLeftRight size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 sm:text-lg">
            SkillXchange
          </span>
        </a>

        <div className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          <a
            href="#features"
            className="transition-colors hover:text-purple-600"
          >
            Features
          </a>
          <a href="#how" className="transition-colors hover:text-purple-600">
            How It Works
          </a>
          <a href="#about" className="transition-colors hover:text-purple-600">
            About
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => openAuth("login")}
            className="text-xs font-medium text-purple-600 transition-colors hover:text-purple-700 sm:text-sm"
          >
            Login
          </button>
          <button
            onClick={() => openAuth("register")}
            className="flex items-center gap-1.5 rounded-full bg-purple-600 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-purple-700 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Get Started
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <section
        id="hero"
        className="bg-gradient-to-b from-purple-50/50 to-white px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-32 sm:pb-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-xs font-medium text-purple-700">
            <Zap size={12} />
            The future of collaborative learning
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl md:text-7xl">
            Exchange Skills,{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Not Money
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-base text-gray-500 sm:text-lg md:text-xl">
            Join a thriving community where people teach what they know and
            learn what they love. No fees, no barriers, just pure knowledge
            exchange.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={() => openAuth("register")}
              className="flex items-center justify-center gap-2 rounded-full bg-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-purple-200 transition-all duration-200 hover:scale-105 hover:bg-purple-700"
            >
              Start Exchanging
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() =>
                user ? navigate("/marketplace") : openAuth("login")
              }
              className="flex items-center justify-center gap-2 rounded-full border border-gray-200 px-8 py-4 text-base font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
            >
              Browse Skills
            </button>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            {formattedStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <stat.icon size={16} className="text-gray-400" />
                <span>{`${stat.value} ${stat.label}`}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="how" className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">How it works</h2>
          <p className="mb-16 text-gray-500">
            Three simple steps to start exchanging skills.
          </p>

          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create Your Profile",
                desc: "List the skills you can teach and want to learn.",
              },
              {
                step: "02",
                title: "Find a Match",
                desc: "Browse the marketplace or let our system find perfect matches.",
              },
              {
                step: "03",
                title: "Exchange Skills",
                desc: "Connect, schedule, and start learning from each other.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <p className="mb-4 text-6xl font-bold text-purple-100">
                  {item.step}
                </p>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-gray-50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">
            Everything you need to learn and grow
          </h2>
          <p className="mb-16 text-gray-500">
            A platform designed to make skill exchange seamless, fun, and
            rewarding.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ArrowLeftRight,
                title: "Skill Exchange",
                desc: "Trade your expertise for new knowledge with no money involved.",
              },
              {
                icon: Zap,
                title: "Smart Matching",
                desc: "Find people who can teach what you want and want what you know.",
              },
              {
                icon: MessageSquare,
                title: "Real-Time Chat",
                desc: "Communicate instantly and move from request to session quickly.",
              },
              {
                icon: Star,
                title: "Ratings and Reviews",
                desc: "Build a trusted reputation through community feedback.",
              },
              {
                icon: Trophy,
                title: "Achievements",
                desc: "Celebrate completed exchanges and learning milestones.",
              },
              {
                icon: Shield,
                title: "Safe and Secure",
                desc: "Use Gmail or your own user ID and password to access your account.",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl border border-gray-100 bg-white p-6 text-left transition-all duration-300 hover:border-purple-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                  <feature.icon size={22} className="text-purple-600" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-purple-600 px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="mb-8 text-purple-200">
            Join thousands of learners exchanging skills every day.
          </p>
          <button
            onClick={() => openAuth("register")}
            className="rounded-full bg-white px-8 py-4 text-base font-semibold text-purple-600 transition-all duration-200 hover:scale-105 hover:bg-purple-50"
          >
            Create Free Account
          </button>
        </motion.div>
      </section>

      <footer className="bg-gray-900 px-4 py-14 text-gray-400 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-10 md:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
                  <ArrowLeftRight size={16} className="text-white" />
                </div>
                <span className="font-bold text-white">SkillXChange</span>
              </div>
              <p className="text-sm leading-relaxed">
                Empowering collaborative learning through peer-to-peer skill
                exchange.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-purple-400"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how"
                    className="transition-colors hover:text-purple-400"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => openAuth("register")}
                    className="transition-colors hover:text-purple-400"
                  >
                    Create Account
                  </button>
                </li>
              </ul>
            </div>

            <div id="about">
              <h4 className="mb-4 font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>SkillXChange BCA Project</li>
                <li>Focused on collaborative learning</li>
                <li>Built with MERN, Socket.IO and WebRTC</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Access</h4>
              <ul className="space-y-2 text-sm">
                <li>Sign in with Gmail</li>
                <li>Or use user ID and password</li>
                <li>Protected private dashboard</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2026 SkillXChange. A BCA Project by Harsh Pal.</p>
          </div>
        </div>
      </footer>

      {isAuthOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/55 px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-500">
                  SkillXChange
                </p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Use Gmail or continue with your own user ID and password.
                </p>
              </div>
              <button
                onClick={closeAuth}
                className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-full bg-gray-100 p-1">
              {[
                { id: "login", label: "Login" },
                { id: "register", label: "Create Account" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setMode(option.id);
                    setError("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    mode === option.id
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGoogleAuth}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Mail size={16} className="text-red-500" />
              Continue with Gmail
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs uppercase tracking-[0.22em] text-gray-400">
                Or use form
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-4">
              {mode === "register" ? (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Full Name
                    </span>
                    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                      <User size={16} className="text-gray-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Your full name"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      User ID
                    </span>
                    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                      <User size={16} className="text-gray-400" />
                      <input
                        type="text"
                        value={form.username}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            username: event.target.value,
                          }))
                        }
                        placeholder="Choose a user ID"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email
                    </span>
                    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                      <Mail size={16} className="text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="your@email.com"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </label>
                </>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    User ID or Email
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                    <User size={16} className="text-gray-400" />
                    <input
                      type="text"
                      value={form.identifier}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          identifier: event.target.value,
                        }))
                      }
                      placeholder="Enter your user ID or email"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                  <Lock size={16} className="text-gray-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder={
                      mode === "login"
                        ? "Enter your password"
                        : "Create a password"
                    }
                    className="w-full bg-transparent text-sm outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleLocalAuth();
                      }
                    }}
                  />
                </div>
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <button
              onClick={handleLocalAuth}
              disabled={submitting}
              className="mt-5 w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-70"
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Login with User ID and Password"
                  : "Create Account"}
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
