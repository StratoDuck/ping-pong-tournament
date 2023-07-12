import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 0;

export async function GET(request: Request) {
  const result = await prisma.player.findMany();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const player = await prisma.player.create({
    data: await request.json(),
  });

  return NextResponse.json(player);
}
