import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Mail, BookOpen, Star } from "lucide-react";
import API from "@/api/axios";

export default function PublicProfile() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await API.get(`/api/profile/${userId}`);
        setProfile(response.data);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message || "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
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
    <div className="min-h-screen bg-gray-100 p-6">
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

          <div className="px-6 pb-6">
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
                  {profile.ratingCount > 0
                    ? `${Number(profile.ratingAverage || 0).toFixed(1)} (${profile.ratingCount} ratings)`
                    : "No ratings yet"}
                </span>
              </div>
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
      </div>
    </div>
  );
}
