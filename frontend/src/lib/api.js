"use client";

import axios from "axios";

// Shared Axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://convoia-nest.onrender.com",
});

// Attach auth token from localStorage when in the browser
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Generic API requester.
 * @param {Object} options
 * @param {string} options.url - Relative or absolute URL.
 * @param {("GET"|"POST"|"PUT"|"PATCH"|"DELETE")} [options.method="GET"] - HTTP method.
 * @param {Object} [options.params] - Query params.
 * @param {Object|FormData} [options.data] - Request body.
 * @param {Object} [options.headers] - Extra headers.
 * @returns {Promise<any>} response data
 */
export async function apiRequest({
  url,
  method = "GET",
  params,
  data,
  headers,
}) {
  const response = await api.request({
    url,
    method: method.toUpperCase(),
    params,
    data,
    headers,
  });
  return response.data;
}

