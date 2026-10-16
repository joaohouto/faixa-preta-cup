import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { withApiHandler } from "@/lib/api-handler";

const LOCK_DURATION_MS = 15_000; // 15 segundos de validade

export const GET = withApiHandler(
  "REFEREE_LOCK_GET",
  async (
    req: Request,
    context: { params: Promise<{ id: string; bracketId: string }> }
  ) => {
    const { bracketId } = await context.params;
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const lock = await db.refereeLock.findUnique({
      where: { bracketId },
    });

    const now = new Date();
    if (lock && now < lock.expiresAt) {
      const isOwner = lock.clientId === clientId;
      return NextResponse.json({
        isLocked: true,
        isOwner,
        lock: {
          clientId: lock.clientId,
          deviceInfo: lock.deviceInfo,
          matchId: lock.matchId,
          acquiredAt: lock.acquiredAt,
          lastHeartbeat: lock.lastHeartbeat,
          expiresAt: lock.expiresAt,
        },
      });
    }

    // Se existia mas expirou, limpa de forma silenciosa
    if (lock && now >= lock.expiresAt) {
      await db.refereeLock.deleteMany({
        where: { bracketId, expiresAt: { lte: now } },
      });
    }

    return NextResponse.json({
      isLocked: false,
      isOwner: false,
      lock: null,
    });
  }
);

export const POST = withApiHandler(
  "REFEREE_LOCK_POST",
  async (
    req: Request,
    context: { params: Promise<{ id: string; bracketId: string }> }
  ) => {
    const { id: tournamentId, bracketId } = await context.params;
    const body = await req.json();
    const { action, clientId, deviceInfo, matchId, force } = body;

    if (!clientId) {
      return apiError("clientId is required", 400);
    }

    const now = new Date();

    if (action === "acquire") {
      // Bloqueio rigoroso: nunca permitir arbitrar chave ou luta já concluída
      const bracket = await db.bracket.findUnique({
        where: { id: bracketId },
        select: { status: true },
      });

      if (!bracket) {
        return apiError("Chave não encontrada", 404);
      }

      if (bracket.status === "COMPLETED") {
        return apiError("Esta chave já foi concluída e não pode ser arbitrada", 400);
      }

      if (matchId) {
        const match = await db.match.findUnique({
          where: { id: matchId },
          select: { isCompleted: true },
        });

        if (match?.isCompleted) {
          return apiError("Esta luta já foi finalizada e não pode ser arbitrada", 400);
        }
      }

      const existing = await db.refereeLock.findUnique({
        where: { bracketId },
      });

      const isCurrentlyActive = existing && now < existing.expiresAt;

      // Se já está travado por outro cliente e não foi forçado
      if (isCurrentlyActive && existing.clientId !== clientId && !force) {
        return NextResponse.json(
          {
            success: false,
            lockedByOther: true,
            lock: {
              clientId: existing.clientId,
              deviceInfo: existing.deviceInfo,
              matchId: existing.matchId,
              acquiredAt: existing.acquiredAt,
              lastHeartbeat: existing.lastHeartbeat,
              expiresAt: existing.expiresAt,
            },
          },
          { status: 423 }
        );
      }

      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

      const lock = await db.refereeLock.upsert({
        where: { bracketId },
        create: {
          bracketId,
          tournamentId,
          matchId: matchId || null,
          clientId,
          deviceInfo: deviceInfo || null,
          acquiredAt: now,
          lastHeartbeat: now,
          expiresAt,
        },
        update: {
          clientId,
          matchId: matchId || existing?.matchId || null,
          deviceInfo: deviceInfo || existing?.deviceInfo || null,
          lastHeartbeat: now,
          expiresAt,
        },
      });

      return NextResponse.json({
        success: true,
        isOwner: true,
        lock,
      });
    }

    if (action === "heartbeat") {
      const existing = await db.refereeLock.findUnique({
        where: { bracketId },
      });

      // Se não existe ou foi roubado/assumido por outro cliente
      if (!existing || existing.clientId !== clientId) {
        return NextResponse.json(
          { success: false, reason: "LOST_LOCK" },
          { status: 409 }
        );
      }

      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

      await db.refereeLock.update({
        where: { bracketId },
        data: {
          lastHeartbeat: now,
          expiresAt,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "release") {
      const existing = await db.refereeLock.findUnique({
        where: { bracketId },
      });

      if (existing && (existing.clientId === clientId || force)) {
        await db.refereeLock.delete({
          where: { bracketId },
        });
      }

      return NextResponse.json({ success: true });
    }

    return apiError("Invalid action", 400);
  }
);

export const DELETE = withApiHandler(
  "REFEREE_LOCK_DELETE",
  async (
    req: Request,
    context: { params: Promise<{ id: string; bracketId: string }> }
  ) => {
    const { bracketId } = await context.params;
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const force = searchParams.get("force") === "true";

    const existing = await db.refereeLock.findUnique({
      where: { bracketId },
    });

    if (existing && (existing.clientId === clientId || force)) {
      await db.refereeLock.delete({
        where: { bracketId },
      });
    }

    return new NextResponse(null, { status: 204 });
  }
);
