import { Search } from "lucide-react";
import { formatMessageTime } from "@/features/messages/messageUtils";

export default function ConversationList({
  filteredConversations,
  isConnected,
  loadingConversations,
  onSearchChange,
  onSelectConversation,
  search,
  selectedId,
  userId,
}) {
  return (
    <div className="flex w-80 shrink-0 flex-col rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          <span
            className={`text-xs font-medium ${
              isConnected ? "text-green-600" : "text-gray-400"
            }`}
          >
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>

        <div className="relative mt-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search conversations"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-full bg-gray-100 py-2 pl-8 pr-3 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <div className="p-4 text-sm text-gray-500">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            No conversations yet. Start a chat from the marketplace.
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(
              (participant) => participant._id !== userId,
            );

            return (
              <button
                key={conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
                className={`flex w-full items-center gap-3 border-b border-gray-50 p-4 text-left transition-colors ${
                  selectedId === conversation._id
                    ? "bg-purple-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="relative">
                  <img
                    src={otherParticipant?.avatar}
                    alt={otherParticipant?.name}
                    className="h-10 w-10 rounded-full bg-purple-100 object-cover"
                  />
                  {conversation.unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {conversation.unreadCount > 99
                        ? "99+"
                        : conversation.unreadCount}
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {otherParticipant?.name}
                    </p>
                    <span className="text-xs text-gray-400">
                      {conversation.lastMessageAt
                        ? formatMessageTime(conversation.lastMessageAt)
                        : ""}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 truncate text-xs ${
                      conversation.unreadCount > 0
                        ? "font-semibold text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {conversation.lastMessage || "Start the conversation"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
