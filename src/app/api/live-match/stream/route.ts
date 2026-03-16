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
      let lastData: string | null = null;

      const sendUpdate = async () => {
        try {
          const liveMatch = await db.liveMatch.findUnique({
            where: { tournamentId },
          });

          const data = liveMatch
            ? `data: ${JSON.stringify(liveMatch)}\n\n`
            : `data: null\n\n`;

          // Only emit when data actually changed
          if (data !== lastData) {
            lastData = data;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          console.error("SSE Error:", error);
        }
      };

      // Send current state immediately on connection (don't wait for first tick)
      await sendUpdate();

      // Then keep polling for changes
      const intervalId = setInterval(sendUpdate, 2000);

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
