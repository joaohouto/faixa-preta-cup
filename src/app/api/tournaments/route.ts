import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const tournament = await db.tournament.create({
      data: {
        name: body.name,
        organizerId: session.user.id,
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
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tournaments = await db.tournament.findMany({
      where: {
        organizerId: session.user.id,
      },
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
