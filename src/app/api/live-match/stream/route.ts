import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tournamentId = searchParams.get("tournamentId");

  if (!tournamentId) {
    return new Response("Tournament ID required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Polling interval
      const intervalId = setInterval(async () => {
        try {
          const liveMatch = await db.liveMatch.findUnique({
            where: { tournamentId },
          });

          const data = liveMatch
            ? `data: ${JSON.stringify(liveMatch)}\n\n`
            : `data: null\n\n`;

          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("SSE Error:", error);
        }
      }, 200); // Atualização a cada 200ms

      // Cleanup
      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
