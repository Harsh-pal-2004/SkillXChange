import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import API from "@/api/axios";

const tabs = ["All", "Pending", "Accepted", "Completed", "Rejected"];

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  completed: {
    label: "Completed",
    icon: ArrowLeftRight,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
};

export default function Exchanges() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingRatingId, setSubmittingRatingId] = useState("");

  useEffect(() => {
    const loadExchanges = async () => {
      try {
        const response = await API.get("/api/exchanges");
        setExchanges(response.data);
      } finally {
        setLoading(false);
      }
    };

    loadExchanges();
  }, []);

  const filteredExchanges = useMemo(() => {
    if (activeTab === "All") {
      return exchanges;
    }

    return exchanges.filter(
      (exchange) => exchange.status === activeTab.toLowerCase(),
    );
  }, [activeTab, exchanges]);

  const stats = useMemo(
    () => ({
      pending: exchanges.filter((exchange) => exchange.status === "pending")
        .length,
      accepted: exchanges.filter((exchange) => exchange.status === "accepted")
        .length,
      completed: exchanges.filter((exchange) => exchange.status === "completed")
        .length,
      rejected: exchanges.filter((exchange) => exchange.status === "rejected")
        .length,
    }),
    [exchanges],
  );

  const updateStatus = async (exchangeId, status) => {
    const response = await API.patch(`/api/exchanges/${exchangeId}`, {
      status,
    });
    setExchanges((current) =>
      current.map((exchange) =>
        exchange._id === exchangeId ? response.data : exchange,
      ),
    );
  };

  const submitRating = async (exchangeId, score) => {
    setSubmittingRatingId(exchangeId);
    try {
      const response = await API.post(`/api/exchanges/${exchangeId}/rating`, {
        score,
      });

      setExchanges((current) =>
        current.map((exchange) =>
          exchange._id === exchangeId ? response.data : exchange,
        ),
      );
    } finally {
      setSubmittingRatingId("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Exchanges</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review requests, accept matches, and move conversations forward.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Pending",
              value: stats.pending,
              color: "text-yellow-600",
            },
            {
              label: "Accepted",
              value: stats.accepted,
              color: "text-green-600",
            },
            {
              label: "Completed",
              value: stats.completed,
              color: "text-purple-600",
            },
            { label: "Rejected", value: stats.rejected, color: "text-red-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            Loading exchanges...
          </div>
        ) : filteredExchanges.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            No exchanges found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExchanges.map((exchange, index) => {
              const status = statusConfig[exchange.status];
              const StatusIcon = status.icon;
              const isRecipient = exchange.recipient?._id === user?._id;
              const otherUser = isRecipient
                ? exchange.requester
                : exchange.recipient;
              const ratings = Array.isArray(exchange.ratings)
                ? exchange.ratings
                : [];
              const myRating = ratings.find(
                (rating) =>
                  String(rating?.rater?._id || rating?.rater) ===
                  String(user?._id),
              );
              const canRate =
                exchange.status === "completed" &&
                Boolean(user?._id) &&
                !myRating;

              return (
                <motion.div
                  key={exchange._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={otherUser?.avatar}
                        alt={otherUser?.name}
                        className="h-11 w-11 rounded-full bg-purple-100 object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {otherUser?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(exchange.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                        {exchange.teachSkill}
                      </span>
                      <ArrowLeftRight size={14} className="text-gray-400" />
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                        {exchange.learnSkill}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.color} ${status.bg} ${status.border}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>

                      {exchange.status === "pending" && isRecipient ? (
                        <>
                          <button
                            onClick={() =>
                              updateStatus(exchange._id, "accepted")
                            }
                            className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              updateStatus(exchange._id, "rejected")
                            }
                            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {exchange.status === "accepted" && isRecipient ? (
                        <button
                          onClick={() =>
                            updateStatus(exchange._id, "completed")
                          }
                          className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Mark Complete
                        </button>
                      ) : null}

                      {exchange.status === "accepted" ||
                      exchange.status === "pending" ? (
                        <button
                          onClick={() =>
                            navigate(`/messages?user=${otherUser?._id}`)
                          }
                          className="rounded-full border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700"
                        >
                          Message
                        </button>
                      ) : null}

                      {otherUser?._id ? (
                        <button
                          onClick={() => navigate(`/profile/${otherUser._id}`)}
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
                        >
                          View Profile
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {exchange.message ? (
                    <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      {exchange.message}
                    </p>
                  ) : null}

                  {exchange.status === "completed" ? (
                    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                      {myRating ? (
                        <p className="text-sm text-gray-600">
                          You rated this exchange {myRating.score}/5.
                        </p>
                      ) : canRate ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-gray-700">
                            Rate your experience:
                          </p>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              onClick={() => submitRating(exchange._id, score)}
                              disabled={submittingRatingId === exchange._id}
                              className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-600 disabled:opacity-60"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Star size={12} />
                                {score}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
