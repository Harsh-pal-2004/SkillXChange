import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["ringing", "active", "ended", "missed"],
      default: "ringing",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
      index: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ conversation: 1, createdAt: -1 });
sessionSchema.index({ participants: 1, createdAt: -1 });

export default mongoose.model("Session", sessionSchema, "session");
