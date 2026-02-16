"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useMe } from "@/hooks/useMe";
import { getChatSocket } from "@/lib/socket";
import { toast } from "react-toastify";
import {
  MessageCircle,
  Search,
  Send,
  User,
} from "lucide-react";
export const dynamic = "force-dynamic";

function getDisplayName(conversation) {
  if (conversation.type === "GROUP" && conversation.name) {
    return conversation.name;
  }
  const other = conversation.participants?.[0];
  return other?.name ?? "Unknown";
}

function getDisplayUsername(conversation) {
  if (conversation.type === "GROUP") return null;
  const other = conversation.participants?.[0];
  return other?.username ? `@${other.username}` : null;
}

function getDisplayAvatar(conversation) {
  if (conversation.type === "GROUP") return null;
  const other = conversation.participants?.[0];
  return other?.avatar ?? null;
}

export default function ChatClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: convData, isPending: loadingList, isError: listError } = useConversations();
  const [selectedId, setSelectedId] = useState(() => {
    const c = searchParams.get("c");
    return c ? parseInt(c, 10) : null;
  });
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const c = searchParams.get("c");
    const id = c ? parseInt(c, 10) : null;
    if (id != null) setSelectedId(id);
  }, [searchParams]);

  const handleSelectConversation = (id) => {
    setSelectedId(id);
    const url = id != null ? `/chat?c=${id}` : "/chat";
    router.replace(url, { scroll: false });
  };

  /** Real-time: join chat room when a conversation is selected; listen for new_message */
  useEffect(() => {
    if (!me?.id || !selectedId) return;

    const socket = getChatSocket();
    if (!socket) return;

    socket.emit("join_conversation", { conversationId: selectedId });

    const onNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.emit("leave_conversation", { conversationId: selectedId });
    };
  }, [me?.id, selectedId, queryClient]);

  const conversations = convData?.conversations ?? [];
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const name = getDisplayName(c).toLowerCase();
      const preview = (c.lastMessagePreview ?? "").toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, search]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  /** Check if users are still friends (for DM conversations) */
  const canSendMessages = selected?.type !== 'DM' || selected?.stillFriends !== false;

  const { data: messagesData, isPending: loadingMessages } = useMessages(selectedId);
  const rawMessages = messagesData?.messages ?? [];
  /** Show oldest at top, newest at bottom (reverse of API order) */
  const messages = useMemo(() => [...rawMessages].reverse(), [rawMessages]);
  const sendMessage = useSendMessage(selectedId);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !selectedId || !canSendMessages) return;
    sendMessage.mutate(text, {
      onSuccess: () => setMessageText(""),
      onError: (error) => {
        const message = error?.response?.data?.message || error?.message || "Failed to send message";
        if (message.includes("unfriended") || message.includes("Cannot send messages")) {
          toast.error("Cannot send messages to unfriended users");
        } else {
          toast.error(message);
        }
      },
    });
  };

  if (loadingList) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-gray-500">Loading conversations...</p>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-red-500">Failed to load conversations</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-0px)] w-full bg-white dark:bg-zinc-950">
      {/* Left: Conversation list — 30% */}
      <div className="flex w-[30%] min-w-[280px] max-w-[400px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MessageCircle size={20} />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Messages
            </h2>
          </div>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-100 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-zinc-500">
              No conversations yet. Start a chat from Friends.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const displayName = getDisplayName(conv);
                const avatar = getDisplayAvatar(conv);
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User size={22} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-zinc-900 dark:text-white">
                          {displayName}
                        </p>
                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
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

      {/* Right: Active conversation — 70% */}
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No conversation selected</p>
            <p className="text-sm">Choose a chat from the list or start one from Friends.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                {getDisplayAvatar(selected) ? (
                  <img
                    src={getDisplayAvatar(selected)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {getDisplayName(selected)}
                </p>
                {getDisplayUsername(selected) && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {getDisplayUsername(selected)}
                  </p>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages ? (
                <p className="text-center text-sm text-zinc-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === me?.id;
                    return (
                      <li
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-blue-600 text-white"
                              : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap wrap-break-word">
                            {msg.content}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {!canSendMessages && (
                <div className="mb-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-3 py-2">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    You are no longer friends with this user. You can view messages but cannot send new ones.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={canSendMessages ? "Type a message" : "Cannot send messages to unfriended users"}
                  value={messageText}
                  onChange={(e) => canSendMessages && setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && canSendMessages) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!canSendMessages}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending || !canSendMessages}
                  className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
