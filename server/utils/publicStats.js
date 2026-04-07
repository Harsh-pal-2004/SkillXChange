import User from "../models/User.js";
import Exchange from "../models/Exchange.js";

export const getPublicStats = async () => {
  const [totalUsers, totalExchanges, ratingRows] = await Promise.all([
    User.countDocuments(),
    Exchange.countDocuments(),
    User.find({ ratingCount: { $gt: 0 } }).select("ratingAverage ratingCount"),
  ]);

  const totalRatingVotes = ratingRows.reduce(
    (sum, user) => sum + (user.ratingCount || 0),
    0,
  );

  const weightedRatingTotal = ratingRows.reduce(
    (sum, user) => sum + (user.ratingAverage || 0) * (user.ratingCount || 0),
    0,
  );

  return {
    totalUsers,
    totalExchanges,
    averageRating:
      totalRatingVotes > 0 ? weightedRatingTotal / totalRatingVotes : null,
    totalRatingVotes,
  };
};

export const broadcastPublicStats = async (io) => {
  if (!io) return;

  const stats = await getPublicStats();
  io.to("public:stats").emit("public:stats", stats);
};
