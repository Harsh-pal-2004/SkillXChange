import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import API from "@/api/axios";
import { useAuth } from "@/context/useAuth";
import CallOverlay from "@/features/messages/CallOverlay";
import ConversationList from "@/features/messages/ConversationList";
import IncomingCallModal from "@/features/messages/IncomingCallModal";
import MessageThread from "@/features/messages/MessageThread";
import {
  normalizeMessage,
  sortConversations,
} from "@/features/messages/messageUtils";
import { connectSocket, disconnectSocket, socket } from "@/socket";

const rtcConfig = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [callStatus, setCallStatus] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [isCallFullscreen, setIsCallFullscreen] = useState(true);
  const [callTimerSeconds, setCallTimerSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const messagesEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const conversationsRef = useRef([]);
  const queuedCandidatesRef = useRef([]);
  const joinedConversationIdsRef = useRef(new Set());
  const activeCallConversationIdRef = useRef("");
  const callConnectedAtRef = useRef(null);
  const callSummaryLoggedRef = useRef(false);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation._id === selectedId) ||
      null,
    [conversations, selectedId],
  );

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const otherParticipant = conversation.participants.find(
          (participant) => participant._id !== user?._id,
        );

        return (
          !search.trim() ||
          otherParticipant?.name
            ?.toLowerCase()
            .includes(search.trim().toLowerCase())
        );
      }),
    [conversations, search, user?._id],
  );

  const activeParticipant = useMemo(
    () =>
      selectedConversation?.participants.find(
        (participant) => participant._id !== user?._id,
      ) || null,
    [selectedConversation, user?._id],
  );

  const callHeadline = mediaError
    ? mediaError
    : callStatus === "incoming"
      ? `${activeParticipant?.name || "Someone"} is calling you`
      : callStatus === "calling"
        ? `Calling ${activeParticipant?.name || "participant"}`
        : `Connected with ${activeParticipant?.name || "participant"}`;

  const callSubline =
    callStatus === "active" && callConnectedAtRef.current
      ? `Started ${new Date(callConnectedAtRef.current).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : callStatus === "incoming"
        ? "Choose whether to take the call or decline it."
        : callStatus === "calling"
          ? "Waiting for the other person to answer."
          : "Preparing the video call.";

  const markConversationRead = useCallback(async (conversationId) => {
    if (!conversationId) return;

    setConversations((current) =>
      current.map((conversation) =>
        conversation._id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );

    try {
      await API.post(`/api/messages/conversations/${conversationId}/read`);
    } catch {
      // Keep the optimistic unread reset even if the sync request fails.
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    const response = await API.get("/api/messages/conversations");
    const nextConversations = sortConversations(response.data);
    setConversations(nextConversations);

    const conversationFromQuery = searchParams.get("conversation");
    const userFromQuery = searchParams.get("user");

    const nextConversation =
      nextConversations.find(
        (conversation) => conversation._id === conversationFromQuery,
      ) ||
      nextConversations.find((conversation) =>
        conversation.participants.some(
          (participant) => participant._id === userFromQuery,
        ),
      ) ||
      nextConversations.find(
        (conversation) =>
          conversation._id === selectedConversationRef.current?._id,
      ) ||
      nextConversations[0];

    if (nextConversation) {
      setSelectedId(nextConversation._id);
    }
  }, [searchParams]);

  const cleanupCall = (stopTracks = true) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (stopTracks && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    activeCallConversationIdRef.current = "";
    callConnectedAtRef.current = null;
    callSummaryLoggedRef.current = false;
    queuedCandidatesRef.current = [];
    setIncomingCall(null);
    setCallStatus("idle");
    setIsCallFullscreen(true);
    setCallTimerSeconds(0);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setMediaError("");
  };

  const ensureLocalStream = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMuted;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !isCameraOff;
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  const toggleMic = () => {
    const nextMuted = !isMicMuted;

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    setIsMicMuted(nextMuted);
  };

  const toggleCamera = () => {
    const nextCameraOff = !isCameraOff;

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextCameraOff;
      });
    }

    setIsCameraOff(nextCameraOff);
  };

  const createPeerConnection = (conversationId) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteStreamRef.current = remoteStream;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:ice-candidate", {
          conversationId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const appendLocalMessage = (savedMessage) => {
    const normalizedMessage = normalizeMessage(savedMessage);

    setMessages((current) =>
      current.some((item) => item._id === normalizedMessage._id)
        ? current
        : [...current, normalizedMessage],
    );

    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation._id === normalizedMessage.conversationId
            ? {
                ...conversation,
                lastMessage: normalizedMessage.text,
                lastMessageAt: normalizedMessage.createdAt,
                unreadCount: 0,
              }
            : conversation,
        ),
      ),
    );
  };

  const createCallSummaryMessage = async ({
    conversationId,
    startedAt,
    outcome = "completed",
  }) => {
    if (!conversationId || callSummaryLoggedRef.current) {
      return;
    }

    callSummaryLoggedRef.current = true;

    try {
      const endedAt = new Date().toISOString();
      const durationSeconds = Math.max(
        0,
        Math.round((new Date(endedAt) - new Date(startedAt)) / 1000),
      );

      const response = await API.post(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          type: "call",
          metadata: {
            startedAt: startedAt || null,
            endedAt: startedAt ? endedAt : null,
            durationSeconds: startedAt ? durationSeconds : null,
            outcome,
          },
        },
      );

      appendLocalMessage(response.data);
    } catch {
      callSummaryLoggedRef.current = false;
    }
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || !selectedId) {
      return;
    }

    const response = await API.post(
      `/api/messages/conversations/${selectedId}/messages`,
      { text: trimmedMessage },
    );

    appendLocalMessage(response.data);
    setMessage("");
  };

  const startCall = async () => {
    if (!selectedConversation) {
      return;
    }

    try {
      setMediaError("");
      setCallStatus("calling");
      setIsCallFullscreen(true);
      activeCallConversationIdRef.current = selectedConversation._id;
      callSummaryLoggedRef.current = false;

      const stream = await ensureLocalStream();
      const peerConnection = createPeerConnection(selectedConversation._id);

      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

      socket.emit("call:start", { conversationId: selectedConversation._id });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("call:offer", {
        conversationId: selectedConversation._id,
        offer,
      });
    } catch {
      setMediaError("Camera or microphone access was denied.");
      cleanupCall();
    }
  };

  const answerCall = async () => {
    const conversationId =
      incomingCall?.conversationId || selectedConversationRef.current?._id;

    if (!incomingCall?.offer || !conversationId) {
      return;
    }

    try {
      setMediaError("");
      setIsCallFullscreen(true);
      activeCallConversationIdRef.current = conversationId;

      const stream = await ensureLocalStream();
      const peerConnection = createPeerConnection(conversationId);

      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      const connectedAt = new Date().toISOString();
      callConnectedAtRef.current = connectedAt;

      socket.emit("call:answer", { conversationId, answer, connectedAt });
      setIncomingCall(null);
      setCallStatus("active");

      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch {
      setMediaError("Could not answer the incoming call.");
      cleanupCall();
    }
  };

  const endCall = async () => {
    const conversationId =
      activeCallConversationIdRef.current ||
      selectedConversationRef.current?._id;
    const startedAt = callConnectedAtRef.current;
    const outcome =
      callStatus === "incoming"
        ? "declined"
        : callStatus === "calling"
          ? "canceled"
          : "completed";
    const shouldLogSummary =
      Boolean(conversationId) &&
      (outcome !== "completed" ||
        (callStatus === "active" && Boolean(startedAt)));

    if (conversationId) {
      socket.emit("call:end", { conversationId });
    }

    cleanupCall();

    if (shouldLogSummary) {
      await createCallSummaryMessage({
        conversationId,
        startedAt,
        outcome,
      });
    }
  };

  const handleSelectConversation = (conversationId) => {
    if (callStatus !== "idle" && activeCallConversationIdRef.current) {
      setSelectedId(activeCallConversationIdRef.current);
      setIsCallFullscreen(true);
      return;
    }

    setSelectedId(conversationId);
  };

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current || null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current || null;
    }
  }, [callStatus, isCallFullscreen]);

  useEffect(() => {
    if (callStatus !== "active" || !callConnectedAtRef.current) {
      setCallTimerSeconds(0);
      return undefined;
    }

    const tick = () => {
      const startedAt = new Date(callConnectedAtRef.current).getTime();
      setCallTimerSeconds(
        Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
      );
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [callStatus]);

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    const loadConversations = async () => {
      try {
        await refreshConversations();
      } finally {
        setLoadingConversations(false);
      }
    };

    loadConversations();
  }, [refreshConversations, user?._id]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);

      try {
        const response = await API.get(
          `/api/messages/conversations/${selectedId}/messages`,
        );
        setMessages(response.data.map(normalizeMessage));
        await markConversationRead(selectedId);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [markConversationRead, selectedId]);

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    connectSocket(user._id);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleIncomingMessage = (incomingMessage) => {
      const normalizedMessage = normalizeMessage(incomingMessage);
      const isSelectedConversation =
        normalizedMessage.conversationId ===
        selectedConversationRef.current?._id;
      const sentByCurrentUser = normalizedMessage.sender?._id === user?._id;
      const conversationExists = conversationsRef.current.some(
        (conversation) => conversation._id === normalizedMessage.conversationId,
      );

      if (!conversationExists) {
        refreshConversations();
      }

      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation._id === normalizedMessage.conversationId
              ? {
                  ...conversation,
                  lastMessage: normalizedMessage.text,
                  lastMessageAt: normalizedMessage.createdAt,
                  unreadCount: isSelectedConversation
                    ? 0
                    : (normalizedMessage.unreadCounts?.[user?._id] ??
                      conversation.unreadCount ??
                      0),
                }
              : conversation,
          ),
        ),
      );

      if (isSelectedConversation) {
        setMessages((current) => {
          if (current.some((item) => item._id === normalizedMessage._id)) {
            return current;
          }

          return [...current, normalizedMessage];
        });

        if (!sentByCurrentUser) {
          markConversationRead(normalizedMessage.conversationId);
        }
      }
    };

    const handleCallInvite = (payload) => {
      if (
        !conversationsRef.current.some(
          (conversation) => conversation._id === payload.conversationId,
        )
      ) {
        refreshConversations();
      }

      activeCallConversationIdRef.current = payload.conversationId;
      setSelectedId(payload.conversationId);
      setIncomingCall((current) => ({ ...current, ...payload }));
      setCallStatus("incoming");
    };

    const handleCallAnswer = async (payload) => {
      if (!peerConnectionRef.current) {
        return;
      }

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(payload.answer),
      );

      activeCallConversationIdRef.current = payload.conversationId;
      callConnectedAtRef.current =
        payload.connectedAt || new Date().toISOString();
      setCallStatus("active");

      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
    };

    const handleIceCandidate = async (payload) => {
      if (!payload.candidate) {
        return;
      }

      if (!peerConnectionRef.current?.remoteDescription) {
        queuedCandidatesRef.current.push(payload.candidate);
        return;
      }

      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(payload.candidate),
      );
    };

    const handleCallEnd = () => {
      cleanupCall();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat:message", handleIncomingMessage);
    socket.on("call:start", handleCallInvite);
    socket.on("call:offer", handleCallInvite);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleCallEnd);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:message", handleIncomingMessage);
      socket.off("call:start", handleCallInvite);
      socket.off("call:offer", handleCallInvite);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleCallEnd);
      cleanupCall();
      disconnectSocket();
    };
  }, [markConversationRead, refreshConversations, user?._id]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const previousJoined = joinedConversationIdsRef.current;
    const nextJoined = new Set(
      conversations.map((conversation) => conversation._id),
    );

    nextJoined.forEach((conversationId) => {
      if (!previousJoined.has(conversationId)) {
        socket.emit("conversation:join", conversationId);
      }
    });

    previousJoined.forEach((conversationId) => {
      if (!nextJoined.has(conversationId)) {
        socket.emit("conversation:leave", conversationId);
      }
    });

    joinedConversationIdsRef.current = nextJoined;
  }, [conversations, isConnected]);

  const callControls = (
    <>
      <button
        onClick={toggleMic}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
          isMicMuted ? "bg-amber-500 text-white" : "bg-white/10 text-white"
        }`}
      >
        {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
        {isMicMuted ? "Unmute" : "Mute"}
      </button>

      <button
        onClick={toggleCamera}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
          isCameraOff ? "bg-amber-500 text-white" : "bg-white/10 text-white"
        }`}
      >
        {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
        {isCameraOff ? "Camera On" : "Camera Off"}
      </button>

      <button
        onClick={endCall}
        className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white"
      >
        <PhoneOff size={16} />
        {callStatus === "calling" ? "Cancel Call" : "End Call"}
      </button>
    </>
  );

  return (
    <div className="h-screen bg-gray-100 p-3 sm:p-4">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 lg:flex-row lg:gap-4">
        <ConversationList
          filteredConversations={filteredConversations}
          isConnected={isConnected}
          loadingConversations={loadingConversations}
          onSearchChange={setSearch}
          onSelectConversation={handleSelectConversation}
          search={search}
          selectedId={selectedId}
          userId={user?._id}
        />

        <MessageThread
          activeParticipant={activeParticipant}
          callStatus={callStatus}
          isCallFullscreen={isCallFullscreen}
          loadingMessages={loadingMessages}
          mediaError={mediaError}
          message={message}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onMessageChange={setMessage}
          onSend={handleSend}
          onStartCall={startCall}
          onToggleCallLayout={() => setIsCallFullscreen((current) => !current)}
          selectedConversation={selectedConversation}
          userId={user?._id}
        />
      </div>

      <IncomingCallModal
        activeParticipant={activeParticipant}
        isOpen={callStatus === "incoming" && Boolean(incomingCall)}
        onAnswer={answerCall}
        onDecline={endCall}
      />

      <CallOverlay
        activeParticipant={activeParticipant}
        callHeadline={callHeadline}
        callStatus={callStatus}
        callSubline={callSubline}
        callTimerSeconds={callTimerSeconds}
        controls={callControls}
        isFullscreen={isCallFullscreen}
        isOpen={callStatus !== "idle" && callStatus !== "incoming"}
        localStream={localStreamRef.current}
        localVideoRef={localVideoRef}
        onExpand={() => setIsCallFullscreen(true)}
        onMinimize={() => setIsCallFullscreen(false)}
        remoteStream={remoteStreamRef.current}
        remoteVideoRef={remoteVideoRef}
      />
    </div>
  );
}
