import express from "express";
import { getPublicStats } from "../utils/publicStats.js";

const router = express.Router();

router.get("/stats", async (_req, res) => {
  const stats = await getPublicStats();
  res.json(stats);
});

export default router;
