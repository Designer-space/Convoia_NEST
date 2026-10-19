"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Search, Send, User } from "lucide-react";
import { toast } from "react-toastify";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useMe } from "@/hooks/useMe";
import { useAccessToken } from "@/hooks/useAccessToken";
import { getChatSocket } from "@/lib/socket";
import { apiRequest } from "@/lib/api";
import Avatar from "../components/Avatar";

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

// ── presentation helpers for the thread ─────────────────────────────────────
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "short",
});

const dayKey = (value) => new Date(value).toDateString();

function dayLabel(value) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const key = dayKey(value);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return DATE_FORMAT.format(new Date(value));
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

  // Grouping for presentation only: which bubbles close a run (and so carry the
  // time and the tail), where a day starts, and whose name to show in a group.
  const thread = useMemo(() => {
    const names = new Map(
      (selected?.participants ?? []).map((p) => [p.id, p.name]),
    );
    return messages.map((msg, index) => {
      const previous = messages[index - 1];
      const next = messages[index + 1];
      const mine = msg.senderId === me?.id;
      const endsRun = !next || next.senderId !== msg.senderId;
      return {
        ...msg,
        mine,
        endsRun,
        day: !previous || dayKey(previous.createdAt) !== dayKey(msg.createdAt)
          ? dayLabel(msg.createdAt)
          : null,
        sender:
          !mine && selected?.type === "GROUP" && (!previous || previous.senderId !== msg.senderId)
            ? names.get(msg.senderId) ?? null
            : null,
      };
    });
  }, [messages, me?.id, selected]);

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
      <div className="flex h-full items-center justify-center bg-background text-sm text-t-muted">
        Loading conversations…
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex h-full items-center justify-center bg-background px-6 text-center text-sm text-t-danger">
        We couldn&apos;t load your conversations. Reload the page to try again.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* List. One pane at a time on phones: hidden while a thread is open. */}
      <section
        aria-label="Conversations"
        className={`min-h-0 w-full flex-col border-t-border bg-t-surface md:flex md:w-80 md:shrink-0 md:border-r ${
          selected ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-t-border px-4 py-3">
          <h2 className="text-[15px] font-semibold text-foreground">Messages</h2>
          {conversations.length > 0 && (
            <span className="tnum rounded-full bg-t-hover px-2 py-0.5 text-[11px] font-medium text-t-muted">
              {conversations.length}
            </span>
          )}
        </div>

        <div className="border-b border-t-border p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t-muted"
              size={16}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
              className="w-full rounded-lg border border-t-border-strong bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-t-muted focus:border-t-primary"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                {search ? "No matches" : "No conversations yet"}
              </p>
              <p className="mt-1 text-[13px] text-t-muted">
                {search
                  ? "Try a different name or word."
                  : "Start one from your friends list."}
              </p>
            </div>
          ) : (
            <ul>
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const avatar = getDisplayAvatar(conv);
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-t-primary bg-t-hover"
                          : "border-transparent hover:bg-t-hover"
                      }`}
                    >
                      {avatar ? (
                        <Avatar src={avatar} size={44} />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-t-hover text-t-muted">
                          <User size={20} aria-hidden="true" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {getDisplayName(conv)}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="tnum shrink-0 rounded-full bg-t-primary px-1.5 py-0.5 text-[11px] font-semibold text-t-on-primary">
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-t-muted">
                          {conv.lastMessagePreview || "No messages yet"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Thread. */}
      <section
        aria-label="Conversation"
        className={`min-h-0 min-w-0 flex-1 flex-col bg-background ${
          selected ? "flex" : "hidden md:flex"
        }`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageCircle size={26} className="text-t-muted" aria-hidden="true" />
            <p className="font-display mt-4 text-2xl text-foreground">
              Pick a conversation
            </p>
            <p className="mt-2 max-w-xs text-sm text-t-muted">
              Choose a chat from the list, or start a new one from your friends.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-t-border bg-t-surface px-3 py-2.5 sm:px-4">
              <button
                type="button"
                onClick={() => handleSelectConversation(null)}
                aria-label="Back to conversations"
                className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-muted transition-colors hover:bg-t-hover hover:text-foreground md:hidden"
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              {getDisplayAvatar(selected) ? (
                <Avatar src={getDisplayAvatar(selected)} size={36} />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-t-hover text-t-muted">
                  <User size={18} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getDisplayName(selected)}
                </p>
                {selected.type === "GROUP" ? (
                  <p className="truncate text-xs text-t-muted">
                    {selected.participants?.length
                      ? `${selected.participants.length} others`
                      : "Group"}
                  </p>
                ) : (
                  getDisplayUsername(selected) && (
                    <p className="truncate text-xs text-t-muted">
                      {getDisplayUsername(selected)}
                    </p>
                  )
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
              {loadingMessages ? (
                <p className="py-6 text-center text-[13px] text-t-muted">
                  Loading messages…
                </p>
              ) : thread.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-2xl text-foreground">Nothing here yet</p>
                  <p className="mt-2 max-w-xs text-sm text-t-muted">
                    {canSendMessages
                      ? "Say hello — the first message is the hardest part."
                      : "This conversation has no messages."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {thread.map((msg) => (
                    <li key={msg.id} className="space-y-1.5">
                      {msg.day && (
                        <p className="py-2 text-center text-[11px] font-medium text-t-muted">
                          {msg.day}
                        </p>
                      )}
                      <div
                        className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[68ch] flex-col ${
                            msg.mine ? "items-end" : "items-start"
                          }`}
                        >
                          {msg.sender && (
                            <span className="mb-1 px-1 text-[11px] font-medium text-t-muted">
                              {msg.sender}
                            </span>
                          )}
                          <div
                            className={`px-3.5 py-2 text-[15px] leading-6 ${
                              msg.mine
                                ? `bg-t-bubble-out text-t-bubble-out-text ${
                                    msg.endsRun
                                      ? "rounded-2xl rounded-br-md neon-glow"
                                      : "rounded-2xl"
                                  }`
                                : `border border-t-border bg-t-bubble-in text-t-bubble-in-text ${
                                    msg.endsRun
                                      ? "rounded-2xl rounded-bl-md"
                                      : "rounded-2xl"
                                  }`
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          {msg.endsRun && msg.createdAt && (
                            <time
                              dateTime={msg.createdAt}
                              className="tnum mt-1 px-1 text-[11px] text-t-muted"
                            >
                              {TIME_FORMAT.format(new Date(msg.createdAt))}
                            </time>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-t-border bg-t-surface px-3 py-3 sm:px-4">
              {!canSendMessages && (
                <div className="mb-2.5 rounded-lg border border-t-warning bg-t-warning-surface px-3 py-2">
                  <p className="text-xs font-medium text-t-warning">
                    You are no longer friends with this user. You can read this
                    conversation but cannot send new messages.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={canSendMessages ? "Write a message" : "Cannot send messages"}
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
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-t-border-strong bg-background px-4 text-[15px] text-foreground outline-none placeholder:text-t-muted focus:border-t-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending || !canSendMessages}
                  aria-label="Send message"
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-t-primary px-4 text-sm font-semibold text-t-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={17} aria-hidden="true" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
