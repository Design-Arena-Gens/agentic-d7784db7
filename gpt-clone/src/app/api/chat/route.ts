import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NextResponse } from "next/server";

const SUPPORTED_MODELS = new Set(["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]);

const SYSTEM_PROMPT =
  "You are a versatile AI assistant that responds with clear, concise, and accurate answers. Always provide helpful context, cite assumptions, and format output for readability using markdown when appropriate.";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      {
        status: 500,
      }
    );
  }

  let body: unknown;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      {
        status: 400,
      }
    );
  }

  const { model, messages } = body as {
    model?: string;
    messages?: { role: string; content: string }[];
  };

  if (!model || !SUPPORTED_MODELS.has(model)) {
    return NextResponse.json(
      { error: "Unsupported or missing model. Please select a valid model." },
      {
        status: 400,
      }
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Message history is required." },
      {
        status: 400,
      }
    );
  }

  const sanitizedMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...messages
      .filter(
        (message): message is { role: "user" | "assistant"; content: string } =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      })),
  ];

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const completion = await client.chat.completions.create({
      model,
      messages: sanitizedMessages,
      stream: true,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of completion) {
            const content = part.choices[0]?.delta?.content ?? "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The model failed to generate a response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
