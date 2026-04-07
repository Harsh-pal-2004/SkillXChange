import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    exchange: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exchange",
      default: null,
    },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true },
);

export default mongoose.model("Conversation", conversationSchema);
