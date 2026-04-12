import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Store,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";

const navLinks = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/marketplace", label: "Marketplace", icon: Store },
  { path: "/exchanges", label: "Exchanges", icon: ArrowLeftRight },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/profile", label: "Profile", icon: User },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userInitials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SX";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white shadow-sm md:flex">
        <div className="border-b border-gray-100 p-6">
          <Link to="/dashboard" className="text-xl font-bold text-gray-900">
            Skill<span className="text-purple-600">Xchange</span>
          </Link>
          <p className="mt-1 text-xs text-gray-400">Share. Learn. Grow.</p>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navLinks.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;

            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
              {userInitials}
            </div>

            <div>
              <p className="w-32 truncate text-sm font-medium text-gray-900">
                {user?.name}
              </p>
              <p className="w-32 truncate text-xs text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-red-500"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <Link to="/dashboard" className="text-lg font-bold text-gray-900">
          Skill<span className="text-purple-600">Xchange</span>
        </Link>

        <button
          onClick={() => setMobileOpen((current) => !current)}
          className="text-gray-500"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-white px-4 pt-16 md:hidden">
          <nav className="space-y-2">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-500 hover:bg-purple-50 hover:text-purple-600"
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-400"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
