import { create } from "zustand"

interface SessionUser {
  id: string
  name: string
  role: "SUPERADMIN" | "ADMIN"
}

interface SessionStore {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
