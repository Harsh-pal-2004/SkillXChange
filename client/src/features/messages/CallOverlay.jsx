import { Maximize2, Minimize2 } from "lucide-react";
import { formatCallDuration } from "@/features/messages/messageUtils";

export default function CallOverlay({
  activeParticipant,
  callHeadline,
  callStatus,
  callSubline,
  callTimerSeconds,
  controls,
  isFullscreen,
  isOpen,
  localStream,
  localVideoRef,
  onExpand,
  onMinimize,
  remoteStream,
  remoteVideoRef,
}) {
  if (!isOpen) {
    return null;
  }

  if (!isFullscreen) {
    return (
      <div className="fixed bottom-4 right-4 z-40 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-white/10 bg-gray-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              {activeParticipant?.name || "Video call"}
            </p>
            <p className="text-xs text-white/65">
              {callStatus === "active"
                ? `Live ${formatCallDuration(callTimerSeconds)}`
                : callSubline}
            </p>
          </div>
          <button
            onClick={onExpand}
            className="rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/10"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />

          {!remoteStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-900 via-gray-950 to-black px-6 text-center">
              <img
                src={activeParticipant?.avatar}
                alt={activeParticipant?.name}
                className="h-16 w-16 rounded-full border border-white/10 object-cover"
              />
              <div>
                <p className="text-sm font-semibold">{callHeadline}</p>
                <p className="mt-1 text-xs text-white/60">{callSubline}</p>
              </div>
            </div>
          ) : null}

          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-16 right-3 h-20 w-16 rounded-2xl border border-white/15 bg-gray-900 object-cover shadow-lg sm:h-24 sm:w-20"
            />
          ) : null}
        </div>

        <div className="flex items-center justify-center px-4 py-4">{controls}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 h-[100dvh] w-full overflow-hidden bg-gray-950 text-white">
      <div className="relative h-full w-full overflow-hidden bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />

        {!remoteStream ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-950 via-black to-gray-950 px-6 text-center">
            <img
              src={activeParticipant?.avatar}
              alt={activeParticipant?.name}
              className="h-24 w-24 rounded-full border border-white/10 object-cover shadow-2xl"
            />
            <div>
              <p className="text-2xl font-semibold">{callHeadline}</p>
              <p className="mt-2 text-sm text-white/60">{callSubline}</p>
            </div>
          </div>
        ) : null}

        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold sm:text-xl">
                {activeParticipant?.name || "Video call"}
              </p>
              <p className="mt-1 text-sm text-white/70">{callHeadline}</p>
              <p className="text-xs text-white/50">
                {callStatus === "active"
                  ? `Live ${formatCallDuration(callTimerSeconds)}`
                  : callSubline}
              </p>
            </div>

            <button
              onClick={onMinimize}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-sm font-semibold text-white backdrop-blur"
            >
              <Minimize2 size={16} />
              <span className="hidden sm:inline">Minimize</span>
            </button>
          </div>
        </div>

        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-24 right-4 z-10 h-24 w-16 rounded-[22px] border border-white/20 bg-gray-900 object-cover shadow-2xl sm:bottom-28 sm:right-6 sm:h-32 sm:w-24 md:h-40 md:w-28"
          />
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-10 sm:px-6 sm:pb-6">
          <div className="flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/10 bg-black/45 px-4 py-3 backdrop-blur">
              {controls}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
