import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, X, MapPin, MessageSquare } from "lucide-react";
import API from "@/api/axios";
import { useAuth } from "@/context/useAuth";

const categories = [
  "All",
  "Technology",
  "Design",
  "Language",
  "Health",
  "Music",
  "Lifestyle",
  "Business",
];

const emptyForm = {
  teachSkill: "",
  learnSkill: "",
  category: "Technology",
  level: "Beginner",
  bio: "",
};

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [listings, setListings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestingId, setRequestingId] = useState("");
  const [requestedListingIds, setRequestedListingIds] = useState([]);
  const [exchangeNotice, setExchangeNotice] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const loadMarketplace = async () => {
      setLoading(true);

      try {
        const [listingsResponse, profilesResponse, exchangesResponse] = await Promise.all([
          API.get("/api/listings", {
            params: { excludeMine: true },
          }),
          API.get("/api/profile/discover"),
          API.get("/api/exchanges"),
        ]);

        setListings(listingsResponse.data);
        setProfiles(profilesResponse.data);
        setRequestedListingIds(
          exchangesResponse.data
            .filter(
              (exchange) =>
                exchange.requester?._id === user?._id &&
                ["pending", "accepted"].includes(exchange.status),
            )
            .map((exchange) => exchange.listing?._id)
            .filter(Boolean),
        );
      } finally {
        setLoading(false);
      }
    };

    loadMarketplace();
  }, [user?._id]);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const matchesSearch =
          !search.trim() ||
          [listing.teachSkill, listing.learnSkill, listing.bio, listing.owner?.name]
            .filter(Boolean)
            .some((value) =>
              value.toLowerCase().includes(search.trim().toLowerCase()),
            );

        const matchesCategory =
          selectedCategory === "All" || listing.category === selectedCategory;

        return matchesSearch && matchesCategory;
      }),
    [listings, search, selectedCategory],
  );

  const ownerIdsWithListings = useMemo(
    () => new Set(listings.map((listing) => listing.owner?._id).filter(Boolean)),
    [listings],
  );

  const requestedListingIdSet = useMemo(
    () => new Set(requestedListingIds),
    [requestedListingIds],
  );

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        if (ownerIdsWithListings.has(profile._id)) {
          return false;
        }

        if (!search.trim()) {
          return true;
        }

        return [
          profile.name,
          profile.username,
          profile.headline,
          profile.bio,
          profile.location,
          ...(profile.teachSkills || []),
          ...(profile.learnSkills || []),
        ]
          .filter(Boolean)
          .some((value) =>
            value.toLowerCase().includes(search.trim().toLowerCase()),
          );
      }),
    [ownerIdsWithListings, profiles, search],
  );

  const handleSubmitListing = async () => {
    if (!form.teachSkill.trim() || !form.learnSkill.trim() || !form.bio.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await API.post("/api/listings", {
        ...form,
        teachSkill: form.teachSkill.trim(),
        learnSkill: form.learnSkill.trim(),
        bio: form.bio.trim(),
      });

      setListings((current) => [response.data, ...current]);
      setForm(emptyForm);
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestExchange = async (listingId) => {
    if (requestedListingIdSet.has(listingId)) {
      setExchangeNotice({
        type: "info",
        message: "You have already sent a request for this listing.",
      });
      return;
    }

    setRequestingId(listingId);
    setExchangeNotice(null);

    try {
      await API.post("/api/exchanges", {
        listingId,
        message: "Hi, I would like to exchange skills with you.",
      });

      setRequestedListingIds((current) =>
        current.includes(listingId) ? current : [...current, listingId],
      );
      setExchangeNotice({
        type: "success",
        message: "Exchange request sent. You can track it from My Exchanges.",
      });
    } catch (error) {
      const apiMessage =
        error.response?.data?.message || "Could not send the exchange request.";

      if (apiMessage === "Exchange already requested") {
        setRequestedListingIds((current) =>
          current.includes(listingId) ? current : [...current, listingId],
        );
      }

      setExchangeNotice({
        type: apiMessage === "Exchange already requested" ? "info" : "error",
        message: apiMessage,
      });
    } finally {
      setRequestingId("");
    }
  };

  const handleStartChat = async (targetUserId) => {
    const response = await API.post("/api/messages/conversations/direct", {
      targetUserId,
    });

    navigate(`/messages?conversation=${response.data._id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse skill listings and discover member profiles by name or skill.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Plus size={16} />
            Post a Skill
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, user ID, or skill..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition-all focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {exchangeNotice ? (
          <div
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              exchangeNotice.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : exchangeNotice.type === "info"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            <span>{exchangeNotice.message}</span>
            {exchangeNotice.type !== "error" ? (
              <button
                onClick={() => navigate("/exchanges")}
                className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
              >
                View Exchanges
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-purple-600 text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            Loading marketplace...
          </div>
        ) : filteredListings.length === 0 && filteredProfiles.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            No people or listings match your search yet.
          </div>
        ) : (
          <div className="space-y-8">
            {filteredListings.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    Live Listings
                  </span>
                  <p className="text-sm text-gray-500">
                    Members ready for an exchange right now.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredListings.map((listing, index) => (
                    <motion.div
                      key={listing._id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-purple-200 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <img
                          src={listing.owner?.avatar}
                          alt={listing.owner?.name}
                          className="h-11 w-11 rounded-full bg-purple-100 object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {listing.owner?.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {listing.owner?.headline || "Skill exchange member"}
                          </p>
                        </div>
                      </div>

                      <p className="mb-4 text-sm leading-relaxed text-gray-600">
                        {listing.bio}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            Teaches
                          </span>
                          <span className="text-gray-700">{listing.teachSkill}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Wants
                          </span>
                          <span className="text-gray-700">{listing.learnSkill}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {listing.category} • {listing.level}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartChat(listing.owner?._id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-200 text-purple-700 transition-colors hover:bg-purple-50"
                            title={`Chat with ${listing.owner?.name}`}
                          >
                            <MessageSquare size={15} />
                          </button>
                          <button
                            onClick={() => handleRequestExchange(listing._id)}
                            disabled={
                              requestingId === listing._id ||
                              requestedListingIdSet.has(listing._id)
                            }
                            className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-70"
                          >
                            {requestingId === listing._id
                              ? "Requesting..."
                              : requestedListingIdSet.has(listing._id)
                                ? "Requested"
                                : "Request Exchange"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ) : null}

            {filteredProfiles.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Member Profiles
                  </span>
                  <p className="text-sm text-gray-500">
                    Searchable profiles, even before a user posts a skill listing.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProfiles.map((profile, index) => (
                    <motion.div
                      key={profile._id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="h-11 w-11 rounded-full bg-purple-100 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {profile.name}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            @{profile.username || "member"}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-gray-700">
                        {profile.headline || "Skill exchange member"}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {profile.bio || "This member is still setting up the profile."}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                        <MapPin size={13} />
                        <span>{profile.location || "Location not added yet"}</span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Can teach
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(profile.teachSkills || []).length > 0 ? (
                              profile.teachSkills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">
                                No teaching skills added yet
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Wants to learn
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(profile.learnSkills || []).length > 0 ? (
                              profile.learnSkills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">
                                No learning goals added yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                        <span>
                          Start a direct conversation even if this user has not posted
                          a listing yet.
                        </span>
                        <button
                          onClick={() => handleStartChat(profile._id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700"
                          title={`Chat with ${profile.name}`}
                        >
                          <MessageSquare size={15} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Post a Skill</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={form.teachSkill}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    teachSkill: event.target.value,
                  }))
                }
                placeholder="Skill you can teach"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
              />
              <input
                value={form.learnSkill}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    learnSkill: event.target.value,
                  }))
                }
                placeholder="Skill you want to learn"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
                >
                  {categories
                    .filter((category) => category !== "All")
                    .map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                </select>
                <select
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      level: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
                >
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                placeholder="Describe what you can teach and how you like to learn."
                className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={handleSubmitListing}
                disabled={submitting}
                className="w-full rounded-full bg-purple-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-70"
              >
                {submitting ? "Posting..." : "Publish Listing"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
