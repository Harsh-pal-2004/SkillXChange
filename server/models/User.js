import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true, select: false },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar: { type: String, default: "" },
    passwordHash: { type: String, select: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    bio: {
      type: String,
      default: "Open to learning and sharing practical skills.",
    },
    location: { type: String, default: "India" },
    headline: { type: String, default: "Skill exchange enthusiast" },
    teachSkills: { type: [String], default: [] },
    learnSkills: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
