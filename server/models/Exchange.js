import mongoose from "mongoose";

const exchangeSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillListing",
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teachSkill: { type: String, required: true, trim: true },
    learnSkill: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed"],
      default: "pending",
    },
    ratings: {
      type: [
        {
          rater: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          ratedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          score: { type: Number, required: true, min: 1, max: 5 },
          comment: { type: String, default: "", trim: true, maxlength: 500 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Exchange", exchangeSchema);
