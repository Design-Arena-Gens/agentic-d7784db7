"use client";

import { ChatMessage as ChatMessageComponent } from "@/components/chat-message";
import {
  addAssistantMessage,
  addUserMessage,
  type ChatModel,
  useChatStore,
} from "@/store/chat-store";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Menu,
  MessageSquare,
  SendHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

type PromptForm = {
  prompt: string;
};

const SUGGESTED_PROMPTS = [
  "Explain quantum computing in simple terms.",
  "Write a concise product update email.",
  "Brainstorm marketing ideas for a weekend pop-up.",
  "Draft a coaching plan for improving public speaking.",
];

export default function Home() {
  const messages = useChatStore((state) => state.messages);
  const model = useChatStore((state) => state.model);
  const setModel = useChatStore((state) => state.setModel);
  const clear = useChatStore((state) => state.clear);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { register, handleSubmit, reset, setValue } = useForm<PromptForm>({
    defaultValues: { prompt: "" },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  const isEmpty = messages.length === 0;

  const modelOptions = useMemo(
    () =>
      [
        { value: "gpt-4o-mini", label: "GPT-4o Mini" },
        { value: "gpt-4o", label: "GPT-4o" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
      ] satisfies { value: ChatModel; label: string }[],
    []
  );

  const onSubmit = handleSubmit(async ({ prompt }) => {
    if (!prompt.trim()) {
      return;
    }

    setIsLoading(true);

    const history = useChatStore
      .getState()
      .messages.map(({ role, content }) => ({ role, content }));
    const payloadMessages = [...history, { role: "user" as const, content: prompt }];
    const userId = addUserMessage(prompt.trim());
    const assistantId = addAssistantMessage();
    reset({ prompt: "" });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(await response.text());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const { updateMessage } = useChatStore.getState();

      let result = "";
      let done = false;
      while (!done) {
        const { value, done: innerDone } = await reader.read();
        if (innerDone) {
          done = true;
          break;
        }
        result += decoder.decode(value, { stream: true });
        updateMessage(assistantId, () => result);
      }

      updateMessage(assistantId, () => result.trim());
    } catch (error) {
      const { replaceMessage } = useChatStore.getState();
      const message =
        error instanceof Error ? error.message : "Unexpected error. Please try again.";
      replaceMessage(assistantId, {
        content: `⚠️ ${message}`,
      });
    } finally {
      setIsLoading(false);

      const { updateMessage } = useChatStore.getState();
      updateMessage(userId, (content) => content.trim());
    }
  });

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-emerald-50 text-zinc-900">
      <aside
        className={cn(
          "hidden w-80 flex-col border-r border-zinc-200 bg-white/80 p-6 backdrop-blur lg:flex",
          !sidebarOpen && "w-20 px-4"
        )}
      >
        <button
          onClick={() => setSidebarOpen((value) => !value)}
          className="mb-6 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex flex-1 flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              <Sparkles size={16} />
              Quick Start
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {SUGGESTED_PROMPTS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setValue("prompt", suggestion);
                  }}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 shadow-sm transition hover:shadow-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Model
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {modelOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setModel(option.value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition",
                    model === option.value
                      ? "border-emerald-500/80 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800"
                  )}
                >
                  <span>{option.label}</span>
                  {model === option.value && <Sparkles size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => clear()}
          className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50"
        >
          <Trash2 size={16} />
          Clear Conversation
        </button>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/70 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                GPT Clone
              </h1>
              <p className="text-sm text-zinc-500">
                Conversational AI powered by OpenAI chat completions.
              </p>
            </div>
          </div>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Model · {modelOptions.find((option) => option.value === model)?.label}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto bg-white/60 px-6 pb-32 pt-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {isEmpty && (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-8 text-center text-zinc-600 shadow-sm">
                <h2 className="text-lg font-semibold text-emerald-700">
                  Start a new conversation
                </h2>
                <p className="mt-2 text-sm text-emerald-600">
                  Ask anything, brainstorm ideas, or get quick answers. Choose a model for
                  the tone and depth you need.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        </section>

        <section className="pointer-events-none sticky bottom-0 z-20 mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-8 pt-4">
          <form
            onSubmit={onSubmit}
            className="pointer-events-auto flex items-end gap-3 rounded-3xl border border-zinc-200 bg-white/90 p-4 shadow-lg backdrop-blur"
          >
            <textarea
              rows={1}
              {...register("prompt")}
              placeholder="Send a message..."
              className="max-h-40 w-full resize-none rounded-2xl border border-transparent bg-transparent p-3 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:bg-white focus:shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
              onInput={(event) => {
                const element = event.currentTarget;
                element.style.height = "auto";
                element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
              }}
              disabled={isLoading}
              autoFocus
            />

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <SendHorizontal size={18} />}
            </button>
          </form>
          <p className="pointer-events-auto text-center text-xs text-zinc-400">
            Built with Next.js · Your API key is securely stored on the server. Messages
            are not persisted.
          </p>
        </section>
      </main>
    </div>
  );
}
