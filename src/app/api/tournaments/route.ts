import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler("TOURNAMENTS_POST", async (req: Request) => {
  const body = await req.json();

  const tournament = await db.tournament.create({
    data: {
      name: body.name,
    },
  });

  return NextResponse.json(tournament);
});

export const GET = withApiHandler("TOURNAMENTS_GET", async () => {
  const tournaments = await db.tournament.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(tournaments);
});
