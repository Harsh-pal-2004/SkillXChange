import express from "express";
import { getPublicStats } from "../utils/publicStats.js";

const router = express.Router();

router.get("/stats", async (_req, res) => {
  try {
    const stats = await getPublicStats();
    res.json(stats);
  } catch (error) {
    console.error("Failed to fetch public stats:", error);
    res.status(200).json({
      totalUsers: 0,
      totalExchanges: 0,
      averageRating: null,
      totalRatingVotes: 0,
    });
  }
});

export default router;
