export const sortConversations = (items) =>
  [...items].sort(
    (first, second) =>
      new Date(second.lastMessageAt || 0) - new Date(first.lastMessageAt || 0),
  );

export const formatMessageTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatCallDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

export const normalizeMessage = (item) => ({
  _id: item._id,
  conversationId: item.conversationId || item.conversation,
  sender: item.sender,
  text: item.text,
  type: item.type || "text",
  metadata: item.metadata || null,
  unreadCounts: item.unreadCounts || null,
  createdAt: item.createdAt,
});

export const getCallMessageLabel = (item) => {
  const outcome = item.metadata?.outcome;

  if (outcome === "declined") {
    return "Call declined";
  }

  if (outcome === "missed") {
    return "Missed call";
  }

  if (outcome === "canceled") {
    return "Call canceled";
  }

  const parts = [];

  if (item.metadata?.startedAt) {
    parts.push(`Started ${formatMessageTime(item.metadata.startedAt)}`);
  }

  if (item.metadata?.durationSeconds !== undefined) {
    parts.push(`Duration ${formatCallDuration(item.metadata.durationSeconds)}`);
  }

  return parts.join(" | ") || item.text;
};
