import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(
  "NEXT_MATCH_GET",
  async (
    req: Request,
    context: { params: Promise<{ id: string; bracketId: string }> }
  ) => {
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
      return apiError("No pending matches", 404);
    }

    return NextResponse.json(nextMatch);
  }
);
