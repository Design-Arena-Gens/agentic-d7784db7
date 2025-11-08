import { create } from "zustand";
import { nanoid } from "nanoid";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type ChatModel = "gpt-4o-mini" | "gpt-4o" | "gpt-3.5-turbo";

type ChatState = {
  messages: ChatMessage[];
  model: ChatModel;
  addMessage: (message: Omit<ChatMessage, "id" | "createdAt"> & { id?: string }) => string;
  updateMessage: (id: string, updater: (content: string) => string) => void;
  replaceMessage: (id: string, message: Partial<ChatMessage>) => void;
  clear: () => void;
  setModel: (model: ChatModel) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  model: "gpt-4o-mini",
  addMessage: (message) => {
    const id = message.id ?? nanoid();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: message.role,
          content: message.content,
          createdAt: Date.now(),
        },
      ],
    }));
    return id;
  },
  updateMessage: (id, updater) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              content: updater(msg.content),
            }
          : msg
      ),
    })),
  replaceMessage: (id, message) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              ...message,
            }
          : msg
      ),
    })),
  clear: () => set({ messages: [] }),
  setModel: (model) => set({ model }),
}));

export const addUserMessage = (content: string) => {
  return useChatStore.getState().addMessage({ role: "user", content });
};

export const addAssistantMessage = (content = "") => {
  return useChatStore.getState().addMessage({ role: "assistant", content });
};
