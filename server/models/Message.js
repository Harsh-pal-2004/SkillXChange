import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["text", "call"],
      default: "text",
    },
    metadata: {
      startedAt: { type: Date, default: null },
      endedAt: { type: Date, default: null },
      durationSeconds: { type: Number, default: null },
      outcome: {
        type: String,
        enum: ["completed", "declined", "missed", "canceled"],
        default: "completed",
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Message", messageSchema);
