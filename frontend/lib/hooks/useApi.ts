/**
 * useApi — custom hook that provides a token-authenticated API call helper
 */
"use client";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export function useApi() {
  const { getToken } = useAuth();

  const withToken = useCallback(
    async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return fn(token);
    },
    [getToken]
  );

  return { withToken, request: withToken };
}
