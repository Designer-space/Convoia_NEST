import { Suspense } from "react";
import ChatWithFriendClient from "./ChatWithFriendClient"

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Opening conversation...</div>}>
      <ChatWithFriendClient />
    </Suspense>
  );
}
