import { Phone, X } from "lucide-react";

export default function IncomingCallModal({
  activeParticipant,
  isOpen,
  onAnswer,
  onDecline,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl">
        <img
          src={activeParticipant?.avatar}
          alt={activeParticipant?.name}
          className="mx-auto h-20 w-20 rounded-full bg-purple-100 object-cover"
        />
        <p className="mt-4 text-xl font-semibold text-gray-900">
          {activeParticipant?.name || "Incoming call"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Video call incoming. Do you want to take the call?
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onDecline}
            className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700"
          >
            <X size={16} />
            Decline
          </button>
          <button
            onClick={onAnswer}
            className="inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white"
          >
            <Phone size={16} />
            Take Call
          </button>
        </div>
      </div>
    </div>
  );
}
