import { create } from "zustand";

export type Role = "admin_studio" | "accountant" | "client_readonly";

export interface ClientLink {
  clientId: string;
  role: Role;
  legalName: string;
  cuit: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  clients: ClientLink[];
  activeClientId: string | null;
  setLogin: (token: string, user: AuthUser, clients: ClientLink[]) => void;
  setAccessToken: (token: string) => void;
  setActiveClient: (clientId: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  clients: [],
  activeClientId: null,

  setLogin: (token, user, clients) =>
    set({
      accessToken: token,
      user,
      clients,
      activeClientId: clients[0]?.clientId ?? null,
    }),

  setAccessToken: (token) => set({ accessToken: token }),

  setActiveClient: (clientId) => set({ activeClientId: clientId }),

  clear: () => set({ accessToken: null, user: null, clients: [], activeClientId: null }),
}));
