import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  ArrowLeftRight,
  MessageSquare,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import API from "@/api/axios";

const statCards = [
  { key: "connections", label: "Connections", icon: Users },
  { key: "skillsListed", label: "Skills Listed", icon: BookOpen },
  { key: "exchanges", label: "Exchanges", icon: ArrowLeftRight },
  { key: "completedExchanges", label: "Completed", icon: MessageSquare },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await API.get("/api/dashboard");
        setDashboard(response.data);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-purple-600">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{user?.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Manage your skill listings, exchange requests, and live
            conversations from one simple workspace.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <Icon size={18} className="text-purple-600" />
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {loading ? "..." : dashboard?.stats?.[key] ?? 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">{label}</p>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Suggested Skill Matches
                </h2>
                <p className="text-sm text-gray-500">
                  Recent listings you can connect with right now.
                </p>
              </div>
              <Link
                to="/marketplace"
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Open marketplace
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {(dashboard?.suggestedListings ?? []).length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-500">
                  No listings yet. Post your first skill in the marketplace to
                  start matching with others.
                </div>
              ) : (
                dashboard.suggestedListings.map((listing) => (
                  <div
                    key={listing._id}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {listing.owner?.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Teaches {listing.teachSkill} and wants {listing.learnSkill}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {listing.category} • {listing.level}
                      </p>
                    </div>
                    <Link
                      to="/marketplace"
                      className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white"
                    >
                      View
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Requests
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : dashboard?.pendingIncoming ?? 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    Incoming exchanges waiting for your response
                  </p>
                </div>
              </div>
              <Link
                to="/exchanges"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-purple-600"
              >
                Review exchanges
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Start
              </h2>
              <div className="mt-4 space-y-3">
                <Link
                  to="/profile"
                  className="block rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
                >
                  Update your profile and add the skills you teach
                </Link>
                <Link
                  to="/marketplace"
                  className="block rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
                >
                  Post a listing and request your first exchange
                </Link>
                <Link
                  to="/messages"
                  className="block rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
                >
                  Join live chat and video calls with connected learners
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
