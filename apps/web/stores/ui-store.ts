import { create } from "zustand"

interface UIStore {
  sidebarOpen: boolean
  setSidebarOpen: (value: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
}))
