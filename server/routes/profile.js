import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/discover", requireAuth, async (req, res) => {
  const { search = "" } = req.query;
  const query = {
    _id: { $ne: req.user._id },
  };

  if (search.trim()) {
    const pattern = new RegExp(search.trim(), "i");
    query.$or = [
      { name: pattern },
      { username: pattern },
      { headline: pattern },
      { bio: pattern },
      { location: pattern },
      { teachSkills: pattern },
      { learnSkills: pattern },
    ];
  }

  const users = await User.find(query)
    .select(
      "name username email avatar headline bio location teachSkills learnSkills ratingAverage ratingCount createdAt",
    )
    .sort({ createdAt: -1 });

  res.json(users);
});

router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

router.patch("/me", requireAuth, async (req, res) => {
  const {
    name,
    headline,
    bio,
    location,
    teachSkills = [],
    learnSkills = [],
  } = req.body;

  req.user.name = name?.trim() || req.user.name;
  req.user.headline = headline?.trim() || "";
  req.user.bio = bio?.trim() || "";
  req.user.location = location?.trim() || "";
  req.user.teachSkills = teachSkills.filter(Boolean);
  req.user.learnSkills = learnSkills.filter(Boolean);

  await req.user.save();
  res.json(req.user);
});

export default router;
