import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const participant = await prisma.participant.create({
    data: await request.json(),
  });

  return NextResponse.json(participant);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const participant = await prisma.participant.updateMany({
    where: { AND: [{ matchId: body.matchId }, { playerId: body.playerId }] },
    data: { score: body.score },
  });

  return NextResponse.json(participant);
}
