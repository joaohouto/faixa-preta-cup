import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; bracketId: string }> }
) {
  try {
    const { bracketId } = await context.params;

    const nextMatch = await db.match.findFirst({
      where: {
        bracketId,
        isCompleted: false,
        akaId: { not: null },
        aoId: { not: null },
        isBye: false,
      },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });

    if (!nextMatch) {
      return new NextResponse("No pending matches", { status: 404 });
    }

    return NextResponse.json(nextMatch);
  } catch (error) {
    console.log("[NEXT_MATCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
