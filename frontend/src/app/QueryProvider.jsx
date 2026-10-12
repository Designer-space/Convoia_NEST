"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SocketProvider from "./SocketProvider";

export default function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SocketProvider>
        {children}
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      </SocketProvider>
    </QueryClientProvider>
  );
}
