import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

feedbackSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
feedbackSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema, "feedback");
