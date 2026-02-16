import { Suspense } from "react";
import ChatClient from "./chatClient";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ChatClient />
    </Suspense>
  );
}
