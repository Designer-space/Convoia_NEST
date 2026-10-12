"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Search, Send, User } from "lucide-react";
import { toast } from "react-toastify";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useMe } from "@/hooks/useMe";
import { useAccessToken } from "@/hooks/useAccessToken";
import { getChatSocket } from "@/lib/socket";
import { apiRequest } from "@/lib/api";

function getDisplayName(conversation) {
  if (conversation.type === "GROUP" && conversation.name) return conversation.name;
  return conversation.participants?.[0]?.name ?? "Unknown";
}

function getDisplayUsername(conversation) {
  if (conversation.type === "GROUP") return null;
  const username = conversation.participants?.[0]?.username;
  return username ? `@${username}` : null;
}

function getDisplayAvatar(conversation) {
  if (conversation.type === "GROUP") return null;
  return conversation.participants?.[0]?.avatar ?? null;
}

function newClientMsgId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAccessToken();
  const { data: me } = useMe();
  const { data: convData, isPending: loadingList, isError: listError } = useConversations();

  // Selection lives in the URL, so no state/effect is needed to keep it in sync.
  const selectedId = useMemo(() => {
    const raw = searchParams.get("c");
    const id = raw ? parseInt(raw, 10) : NaN;
    return Number.isInteger(id) ? id : null;
  }, [searchParams]);

  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const lastReportedRead = useRef(0);

  const handleSelectConversation = (id) => {
    router.replace(id != null ? `/chat?c=${id}` : "/chat", { scroll: false });
  };

  // Realtime: the server auto-joins every conversation room on connect, so we
  // only need to listen. Re-subscribe whenever a fresh access token arrives.
  useEffect(() => {
    if (!token) return;
    const socket = getChatSocket();
    if (!socket) return;

    const resync = () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("new_message", resync);
    socket.on("conversation:updated", resync);
    socket.on("connected", resync);
    socket.io.on("reconnect", resync);

    return () => {
      socket.off("new_message", resync);
      socket.off("conversation:updated", resync);
      socket.off("connected", resync);
      socket.io.off("reconnect", resync);
    };
  }, [token, queryClient]);

  const conversations = useMemo(() => convData?.conversations ?? [], [convData]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        getDisplayName(c).toLowerCase().includes(q) ||
        (c.lastMessagePreview ?? "").toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const canSendMessages = selected?.type !== "DM" || selected?.stillFriends !== false;

  const { data: messagesData, isPending: loadingMessages } = useMessages(selectedId);
  const messages = useMemo(
    () => [...(messagesData?.messages ?? [])].reverse(),
    [messagesData],
  );
  const sendMessage = useSendMessage(selectedId);

  // Mark the conversation read up to the newest message we have.
  useEffect(() => {
    if (!selectedId || !messagesData?.messages?.length) return;
    const maxSeq = Math.max(...messagesData.messages.map((m) => m.seq ?? 0));
    if (!maxSeq || maxSeq <= lastReportedRead.current) return;
    lastReportedRead.current = maxSeq;
    apiRequest({
      url: `/conversations/${selectedId}/read`,
      method: "POST",
      data: { lastReadSeq: maxSeq },
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => {});
  }, [selectedId, messagesData, queryClient]);

  const handleSend = () => {
    const text = messageText.trim();
    // Guard against double-submit (Enter twice, click + Enter).
    if (!text || !selectedId || !canSendMessages || sendMessage.isPending) return;
    const clientMsgId = newClientMsgId();
    setMessageText("");
    sendMessage.mutate(
      { content: text, clientMsgId },
      {
        onError: (error) => {
          setMessageText(text);
          toast.error(
            error?.response?.data?.message || error?.message || "Failed to send message",
          );
        },
      },
    );
  };

  if (loadingList) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-t-muted">
        Loading conversations…
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-red-500">
        Failed to load conversations
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background">
      <div className="flex w-[30%] min-w-[280px] max-w-[400px] flex-col border-r border-t-border bg-t-surface">
        <div className="border-b border-t-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-t-primary text-white">
              <MessageCircle size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">Messages</h2>
          </div>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t-muted"
              size={18}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
              className="w-full rounded-lg border border-t-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-t-muted focus:border-t-primary focus:ring-1 focus:ring-t-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-t-muted">
              No conversations yet. Start a chat from Friends.
            </p>
          ) : (
            <ul className="divide-y divide-t-border">
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const avatar = getDisplayAvatar(conv);
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        isSelected ? "bg-t-hover" : "hover:bg-t-hover"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-t-hover text-t-muted">
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User size={22} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-foreground">
                            {getDisplayName(conv)}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 rounded-full bg-t-primary px-2 py-0.5 text-xs font-semibold text-white">
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-t-muted">
                          {conv.lastMessagePreview || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-background">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-t-muted">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No conversation selected</p>
            <p className="text-sm">Choose a chat from the list or start one from Friends.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-t-border bg-t-surface px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-t-hover text-t-muted">
                {getDisplayAvatar(selected) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getDisplayAvatar(selected)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{getDisplayName(selected)}</p>
                {getDisplayUsername(selected) && (
                  <p className="text-sm text-t-muted">{getDisplayUsername(selected)}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
              {loadingMessages ? (
                <p className="text-center text-sm text-t-muted">Loading messages…</p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-t-muted">
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === me?.id;
                    return (
                      <li key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-t-primary text-white"
                              : "border border-t-border bg-t-surface text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-t-border bg-t-surface p-4">
              {!canSendMessages && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    You are no longer friends with this user. You can view messages but cannot
                    send new ones.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={canSendMessages ? "Type a message" : "Cannot send messages"}
                  value={messageText}
                  onChange={(e) => canSendMessages && setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!canSendMessages}
                  aria-label="Message"
                  className="flex-1 rounded-xl border border-t-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-t-muted focus:border-t-primary focus:ring-1 focus:ring-t-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending || !canSendMessages}
                  className="flex items-center gap-2 rounded-xl bg-t-primary px-4 py-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={18} />
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
