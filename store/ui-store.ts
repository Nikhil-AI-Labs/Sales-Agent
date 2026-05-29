import { create } from "zustand";
import type { ViewKey } from "@/lib/data";

type UIState = {
  activeView: ViewKey;
  activeCustomerId: string;
  collapsed: boolean;
  setActiveView: (view: ViewKey) => void;
  setActiveCustomerId: (id: string) => void;
  toggleCollapsed: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  activeView: "chats",
  activeCustomerId: "bio-green",
  collapsed: false,
  setActiveView: (activeView) => set({ activeView }),
  setActiveCustomerId: (activeCustomerId) => set({ activeCustomerId, activeView: "chats" }),
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
}));
