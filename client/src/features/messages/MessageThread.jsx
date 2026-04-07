import { motion } from "framer-motion";
import { Maximize2, Minimize2, Send, Video } from "lucide-react";
import {
  formatMessageTime,
  getCallMessageLabel,
} from "@/features/messages/messageUtils";

export default function MessageThread({
  activeParticipant,
  callStatus,
  isCallFullscreen,
  loadingMessages,
  mediaError,
  message,
  messages,
  messagesEndRef,
  onMessageChange,
  onSend,
  onStartCall,
  onToggleCallLayout,
  selectedConversation,
  userId,
}) {
  if (!selectedConversation) {
    return (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
          Select a conversation to start messaging and launch video calls.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={activeParticipant?.avatar}
              alt={activeParticipant?.name}
              className="h-10 w-10 rounded-full bg-purple-100 object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {activeParticipant?.name}
              </p>
              <p className="text-xs text-gray-500">
                {selectedConversation.exchange?.status || "connected"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {callStatus !== "idle" ? (
              <button
                onClick={onToggleCallLayout}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700"
              >
                {isCallFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isCallFullscreen ? "Minimize" : "Open Call"}
              </button>
            ) : null}

            <button
              onClick={onStartCall}
              disabled={callStatus !== "idle"}
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-70"
            >
              <Video size={14} />
              Start Call
            </button>
          </div>
        </div>

        {mediaError ? (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {mediaError}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loadingMessages ? (
          <p className="text-sm text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((item) => {
              const sentByCurrentUser = item.sender?._id === userId;

              if (item.type === "call") {
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-center text-sm text-gray-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                        Video Call
                      </p>
                      <p className="mt-2 font-medium">{getCallMessageLabel(item)}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatMessageTime(item.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    sentByCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-md rounded-2xl px-4 py-3 text-sm ${
                      sentByCurrentUser
                        ? "rounded-br-sm bg-purple-600 text-white"
                        : "rounded-bl-sm bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p>{item.text}</p>
                    <p
                      className={`mt-1 text-xs ${
                        sentByCurrentUser ? "text-purple-200" : "text-gray-400"
                      }`}
                    >
                      {formatMessageTime(item.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSend();
              }
            }}
            className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            onClick={onSend}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
