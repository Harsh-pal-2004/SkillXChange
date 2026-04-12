import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Mail,
  BookOpen,
  Star,
  Send,
  MessageSquare,
} from "lucide-react";
import API from "@/api/axios";
import { useAuth } from "@/context/useAuth";

export default function PublicProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState({
    averageScore: 0,
    totalFeedback: 0,
  });
  const [feedbackForm, setFeedbackForm] = useState({
    score: 5,
    comment: "",
  });
  const [myFeedbackId, setMyFeedbackId] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");

  const resolveMyFeedback = (items = []) => {
    if (!user?._id) {
      return null;
    }

    return (
      items.find((item) => String(item?.sender?._id) === String(user._id)) ||
      null
    );
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      setFeedbackError("");
      setFeedbackNotice("");

      try {
        const profileResponse = await API.get(`/api/profile/${userId}`);
        setProfile(profileResponse.data);

        try {
          const feedbackResponse = await API.get(
            `/api/feedback/users/${userId}`,
          );
          const feedbackItems = feedbackResponse.data.feedback || [];
          setFeedback(feedbackItems);
          setFeedbackSummary(
            feedbackResponse.data.summary || {
              averageScore: 0,
              totalFeedback: 0,
            },
          );

          const existingFeedback = resolveMyFeedback(feedbackItems);
          if (existingFeedback) {
            setMyFeedbackId(existingFeedback._id);
            setFeedbackForm({
              score: existingFeedback.score || 5,
              comment: existingFeedback.comment || "",
            });
          } else {
            setMyFeedbackId(null);
            setFeedbackForm({ score: 5, comment: "" });
          }
        } catch {
          setFeedbackError("Feedback could not be loaded right now.");
        }
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message || "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, user?._id]);

  const submitFeedback = async () => {
    if (!user || !userId || String(user._id) === String(userId)) {
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackNotice("");

    try {
      const response = await API.post(`/api/feedback/users/${userId}`, {
        score: feedbackForm.score,
        comment: feedbackForm.comment,
      });

      const feedbackItems = response.data.feedback || [];
      setFeedback(feedbackItems);
      setFeedbackSummary(
        response.data.summary || {
          averageScore: 0,
          totalFeedback: 0,
        },
      );
      const existingFeedback = resolveMyFeedback(feedbackItems);
      setMyFeedbackId(
        existingFeedback?._id || response.data.userFeedbackId || null,
      );
      setFeedbackNotice(
        existingFeedback
          ? "Feedback updated successfully."
          : "Feedback saved successfully.",
      );
      setProfile((current) =>
        current
          ? {
              ...current,
              feedbackAverage:
                response.data.summary?.averageScore ?? current.feedbackAverage,
              feedbackCount:
                response.data.summary?.totalFeedback ?? current.feedbackCount,
            }
          : current,
      );
    } catch (requestError) {
      setFeedbackError(
        requestError?.response?.data?.message || "Failed to submit feedback.",
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const deleteFeedback = async () => {
    if (!user || !userId || !myFeedbackId) {
      return;
    }

    setDeletingFeedback(true);
    setFeedbackError("");
    setFeedbackNotice("");

    try {
      const response = await API.delete(`/api/feedback/users/${userId}`);
      const feedbackItems = response.data.feedback || [];
      setFeedback(feedbackItems);
      setFeedbackSummary(
        response.data.summary || {
          averageScore: 0,
          totalFeedback: 0,
        },
      );
      setMyFeedbackId(null);
      setFeedbackForm({ score: 5, comment: "" });
      setFeedbackNotice("Feedback deleted successfully.");
      setProfile((current) =>
        current
          ? {
              ...current,
              feedbackAverage:
                response.data.summary?.averageScore ?? current.feedbackAverage,
              feedbackCount:
                response.data.summary?.totalFeedback ?? current.feedbackCount,
            }
          : current,
      );
    } catch (requestError) {
      setFeedbackError(
        requestError?.response?.data?.message || "Failed to delete feedback.",
      );
    } finally {
      setDeletingFeedback(false);
    }
  };

  const handleStartChat = async () => {
    if (!user || !profile?._id || String(user._id) === String(profile._id)) {
      return;
    }

    try {
      const response = await API.post("/api/messages/conversations/direct", {
        targetUserId: profile._id,
      });

      navigate(`/messages?conversation=${response.data._id}`);
    } catch {
      setFeedbackError("Could not start chat right now.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-purple-600"
          >
            <ArrowLeft size={14} />
            Back to marketplace
          </Link>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
            {error || "Profile not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-sm font-medium text-purple-600"
        >
          <ArrowLeft size={14} />
          Back to marketplace
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-28 bg-gradient-to-r from-blue-500 to-purple-500" />

          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="-mt-10 mb-4 h-20 w-20 rounded-full border-4 border-white bg-purple-100 object-cover shadow-sm"
            />

            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {profile.headline || "Skill exchange member"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{profile.location || "Location not added"}</span>
              </div>
              <div className="flex items-center gap-2 text-amber-500">
                <Star size={14} />
                <span className="text-gray-500">
                  {profile.feedbackCount > 0
                    ? `${Number(profile.feedbackAverage || 0).toFixed(1)} (${profile.feedbackCount} feedback)`
                    : "No feedback yet"}
                </span>
              </div>
            </div>

            {user && String(user._id) !== String(userId) ? (
              <div className="mt-4">
                <button
                  onClick={handleStartChat}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 sm:w-auto"
                >
                  <MessageSquare size={15} />
                  Message
                </button>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Feedback
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {feedbackSummary.totalFeedback > 0
                      ? `${Number(feedbackSummary.averageScore || 0).toFixed(1)} average from ${feedbackSummary.totalFeedback} feedback entries`
                      : "No feedback has been shared yet."}
                  </p>
                </div>

                {user && String(user._id) !== String(userId) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {myFeedbackId ? (
                      <button
                        onClick={deleteFeedback}
                        disabled={deletingFeedback || submittingFeedback}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingFeedback ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}

                    <button
                      onClick={submitFeedback}
                      disabled={submittingFeedback || deletingFeedback}
                      className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send size={14} />
                      {submittingFeedback
                        ? "Saving..."
                        : myFeedbackId
                          ? "Update Feedback"
                          : "Save Feedback"}
                    </button>
                  </div>
                ) : null}
              </div>

              {user && String(user._id) !== String(userId) ? (
                <div className="mt-4 grid gap-3 md:grid-cols-[auto,1fr] md:items-start">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setFeedbackForm((current) => ({
                            ...current,
                            score,
                          }))
                        }
                        className={`rounded-full p-1 transition ${score <= feedbackForm.score ? "text-amber-500" : "text-gray-300"}`}
                        aria-label={`Rate ${score} star${score === 1 ? "" : "s"}`}
                      >
                        <Star
                          size={18}
                          fill={
                            score <= feedbackForm.score
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={feedbackForm.comment}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))
                    }
                    placeholder="Write a short feedback note..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              ) : null}

              {feedbackError ? (
                <p className="mt-3 text-sm text-red-600">{feedbackError}</p>
              ) : null}

              {feedbackNotice ? (
                <p className="mt-3 text-sm text-green-600">{feedbackNotice}</p>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {profile.bio || "This member has not added a bio yet."}
            </p>
          </div>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              key: "teachSkills",
              title: "Skills They Can Teach",
              color: "bg-green-50 text-green-700 border-green-200",
            },
            {
              key: "learnSkills",
              title: "Skills They Want to Learn",
              color: "bg-blue-50 text-blue-700 border-blue-200",
            },
          ].map((group) => (
            <motion.div
              key={group.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <BookOpen size={16} className="text-purple-600" />
                {group.title}
              </h3>

              <div className="flex flex-wrap gap-2">
                {(profile[group.key] || []).length === 0 ? (
                  <p className="text-sm text-gray-400">No skills added yet.</p>
                ) : (
                  (profile[group.key] || []).map((skill) => (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${group.color}`}
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Star size={16} className="text-purple-600" />
            Recent Feedback
          </h3>

          <div className="space-y-4">
            {feedback.length === 0 ? (
              <p className="text-sm text-gray-400">No feedback yet.</p>
            ) : (
              feedback.map((item) => (
                <div
                  key={item._id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.sender?.avatar || ""}
                        alt={item.sender?.name || "Sender"}
                        className="h-10 w-10 rounded-full bg-purple-100 object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.sender?.name || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.sender?.headline || "Community member"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          fill={index < item.score ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                  </div>

                  {item.comment ? (
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {item.comment}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
