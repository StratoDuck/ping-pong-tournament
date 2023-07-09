import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const result = await prisma.match.findMany({
    include: { participants: { include: { player: true } } },
  });

  return NextResponse.json(result);
}
