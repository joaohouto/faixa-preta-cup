import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  calculateAge,
  getKataCategory,
  getKumiteCategory,
} from "@/lib/utils/classification";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id } = params;

    const competitorData = {
      ...body,
      birthdate: new Date(body.birthdate),
    };

    const age = calculateAge(competitorData.birthdate);
    const kataCategory = competitorData.kata
      ? getKataCategory(age, competitorData.gender, competitorData.belt)
      : null;
    const kumiteCategory = competitorData.kumite
      ? getKumiteCategory(
          age,
          competitorData.gender,
          competitorData.weight,
          competitorData.belt
        )
      : null;

    const updatedCompetitor = await db.competitor.update({
      where: { id },
      data: {
        ...competitorData,
        age,
        kataCategory,
        kumiteCategory,
      },
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.log("[COMPETITOR_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;

    await db.competitor.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[COMPETITOR_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
