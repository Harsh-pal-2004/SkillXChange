import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit,
  Plus,
  X,
  MapPin,
  Mail,
  Save,
  BookOpen,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import API from "@/api/axios";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "",
    avatar: "",
    headline: "",
    bio: "",
    location: "",
    teachSkills: [],
    learnSkills: [],
    ratingAverage: 0,
    ratingCount: 0,
  });
  const [newTeach, setNewTeach] = useState("");
  const [newLearn, setNewLearn] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await API.get("/api/profile/me");
        setProfile({
          name: response.data.name || "",
          avatar: response.data.avatar || "",
          headline: response.data.headline || "",
          bio: response.data.bio || "",
          location: response.data.location || "",
          teachSkills: response.data.teachSkills || [],
          learnSkills: response.data.learnSkills || [],
          ratingAverage: response.data.ratingAverage || 0,
          ratingCount: response.data.ratingCount || 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const addSkill = (type, value, setter) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setProfile((current) => ({
      ...current,
      [type]: current[type].includes(trimmed)
        ? current[type]
        : [...current[type], trimmed],
    }));
    setter("");
  };

  const removeSkill = (type, skill) => {
    setProfile((current) => ({
      ...current,
      [type]: current[type].filter((item) => item !== skill),
    }));
  };

  const handleSave = async () => {
    const response = await API.patch("/api/profile/me", profile);
    setProfile({
      name: response.data.name || "",
      avatar: response.data.avatar || "",
      headline: response.data.headline || "",
      bio: response.data.bio || "",
      location: response.data.location || "",
      teachSkills: response.data.teachSkills || [],
      learnSkills: response.data.learnSkills || [],
      ratingAverage: response.data.ratingAverage || 0,
      ratingCount: response.data.ratingCount || 0,
    });
    setEditing(false);
    refreshUser();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-28 bg-gradient-to-r from-purple-500 to-indigo-500" />

          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <img
              src={profile.avatar || user?.avatar}
              alt={user?.name}
              className="-mt-10 mb-4 h-20 w-20 rounded-full border-4 border-white bg-purple-100 object-cover shadow-sm"
            />

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="flex-1">
                {editing ? (
                  <input
                    value={profile.name}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full max-w-sm rounded-xl border border-gray-200 px-3 py-2 text-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.name}
                  </h1>
                )}

                {editing ? (
                  <div className="mt-3 w-full max-w-md">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      Profile Image URL
                    </label>
                    <input
                      value={profile.avatar}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          avatar: event.target.value,
                        }))
                      }
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                ) : null}

                {editing ? (
                  <input
                    value={profile.headline}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        headline: event.target.value,
                      }))
                    }
                    className="mt-3 w-full max-w-md rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    {profile.headline}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    {editing ? (
                      <input
                        value={profile.location}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            location: event.target.value,
                          }))
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    ) : (
                      <span>{profile.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-amber-500">
                    <Star size={14} />
                    <span className="text-gray-500">
                      {profile.ratingCount > 0
                        ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount} ratings)`
                        : "No ratings yet"}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {editing ? (
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          bio: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-gray-600">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={editing ? handleSave : () => setEditing(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  editing
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "border border-purple-500 text-purple-600 hover:bg-purple-50"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {editing ? <Save size={14} /> : <Edit size={14} />}
                  {editing ? "Save Profile" : "Edit Profile"}
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              key: "teachSkills",
              title: "Skills I Can Teach",
              color: "bg-green-50 text-green-700 border-green-200",
              value: newTeach,
              setter: setNewTeach,
            },
            {
              key: "learnSkills",
              title: "Skills I Want to Learn",
              color: "bg-blue-50 text-blue-700 border-blue-200",
              value: newLearn,
              setter: setNewLearn,
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

              <div className="mb-4 flex flex-wrap gap-2">
                {profile[group.key].length === 0 ? (
                  <p className="text-sm text-gray-400">No skills added yet.</p>
                ) : (
                  profile[group.key].map((skill) => (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${group.color}`}
                    >
                      {skill}
                      {editing ? (
                        <button
                          onClick={() => removeSkill(group.key, skill)}
                          className="text-current"
                        >
                          <X size={10} />
                        </button>
                      ) : null}
                    </span>
                  ))
                )}
              </div>

              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={group.value}
                    onChange={(event) => group.setter(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        addSkill(group.key, group.value, group.setter);
                      }
                    }}
                    placeholder="Add a skill"
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button
                    onClick={() =>
                      addSkill(group.key, group.value, group.setter)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
