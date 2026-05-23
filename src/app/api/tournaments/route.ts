import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const tournament = await db.tournament.create({
      data: {
        name: body.name,
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    console.log("[TOURNAMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const tournaments = await db.tournament.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.log("[TOURNAMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
