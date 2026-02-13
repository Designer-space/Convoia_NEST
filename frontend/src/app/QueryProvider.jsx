"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SocketProvider from "./SocketProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function QueryProvider({ children }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><SocketProvider>{children} <ToastContainer
  position="top-right"
  autoClose={3000}
  theme="dark"
/></SocketProvider></QueryClientProvider>;
}