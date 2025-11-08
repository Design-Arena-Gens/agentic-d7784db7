import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex w-full gap-3 rounded-2xl border border-transparent p-4 transition-colors",
        isAssistant ? "bg-zinc-100/60 dark:bg-zinc-800/60" : "bg-transparent"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
          isAssistant ? "bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900" : "bg-blue-500"
        )}
      >
        {isAssistant ? <Bot size={20} /> : <User size={20} />}
      </div>
      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <ReactMarkdown>{content || "…"}</ReactMarkdown>
      </div>
    </div>
  );
}
