import { NextRequest, NextResponse } from "next/server";
import { runAgentsInParallel, streamAgentResponse, GENEALOGY_SYSTEM_PROMPT, AgentTask } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, message, tasks } = body as {
    mode: "chat" | "parallel";
    message?: string;
    tasks?: AgentTask[];
  };

  if (mode === "parallel" && Array.isArray(tasks)) {
    const results = await runAgentsInParallel(tasks);
    return NextResponse.json({ results });
  }

  if (mode === "chat" && message) {
    const stream = await streamAgentResponse(GENEALOGY_SYSTEM_PROMPT, message);

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ error: "mode invalide" }, { status: 400 });
}
