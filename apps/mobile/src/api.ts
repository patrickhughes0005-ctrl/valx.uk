import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "valx.beta.session";
const defaultApiUrl =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("valx.uk")
    ? "https://api.valx.uk"
    : "http://localhost:4000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code);
  }
}

const browserSession = {
  get: async () =>
    typeof sessionStorage === "undefined"
      ? null
      : sessionStorage.getItem(SESSION_KEY),
  set: async (token: string) => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, token);
    }
  },
  clear: async () => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
};

export const session =
  Platform.OS === "web"
    ? browserSession
    : {
        get: () => SecureStore.getItemAsync(SESSION_KEY),
        set: (token: string) => SecureStore.setItemAsync(SESSION_KEY, token),
        clear: () => SecureStore.deleteItemAsync(SESSION_KEY)
      };

export async function api<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.authenticated !== false) {
    const token = await session.get();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, result?.error ?? "request_failed");
  }
  return result as T;
}

export async function uploadDetailerDocument<T>(input: {
  uri: string;
  fileName: string;
  mimeType: string;
  type: "identity" | "public_liability_insurance" | "motor_insurance";
  expiresAt?: string;
}): Promise<T> {
  const token = await session.get();
  if (!token) throw new ApiError(401, "authentication_required");
  const source = await fetch(input.uri);
  const body = await source.blob();
  const query = new URLSearchParams({
    type: input.type,
    fileName: input.fileName
  });
  if (input.expiresAt) query.set("expiresAt", input.expiresAt);
  const response = await fetch(
    `${API_URL}/v1/detailer/onboarding/documents?${query.toString()}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": input.mimeType
      },
      body
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, result?.error ?? "request_failed");
  }
  return result as T;
}
