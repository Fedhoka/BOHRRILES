import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let refreshing: Promise<string> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  const clientId = useAuthStore.getState().activeClientId;
  if (clientId && config.headers) config.headers["X-Client-Id"] = clientId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      if (!refreshing) {
        refreshing = axios
          .post<{ accessToken: string }>(
            `${import.meta.env.VITE_API_URL ?? ""}/auth/refresh`,
            {},
            { withCredentials: true },
          )
          .then((r) => {
            useAuthStore.getState().setAccessToken(r.data.accessToken);
            return r.data.accessToken;
          })
          .catch(() => {
            useAuthStore.getState().clear();
            window.location.href = "/login";
            return "";
          })
          .finally(() => { refreshing = null; });
      }
      const token = await refreshing;
      if (token && original.headers) original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    return Promise.reject(err);
  },
);
