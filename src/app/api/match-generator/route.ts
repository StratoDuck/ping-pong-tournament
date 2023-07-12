import { NextResponse } from "next/server";
// @ts-ignore
import Duel from "duel";
import _ from "lodash";
import { PrismaClient, Match } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 0;

type RawMatch = {
  id: {
    s: number;
    r: number;
    m: number;
  };
  p: number[];
  m?: number[];
};

export async function POST(request: Request) {
  let finalMatches: Match[] = [];
  const players = _.shuffle(await prisma.player.findMany());

  const tournament = new Duel(players.length, { short: true });

  const numOfRounds = _.maxBy(
    tournament.matches,
    (match: RawMatch) => match.id.r
  )?.id.r!;

  const namedFirstRoundForDB = tournament.matches
    .filter((match: RawMatch) => match.id.r === 1)
    .map((match: RawMatch) => ({
      name: match.id.toString(),
      participants: {
        createMany: {
          data: match.p
            .map((playerIdx: number) =>
              players[playerIdx - 1]
                ? {
                    playerId: players[playerIdx - 1]?.id,
                  }
                : undefined
            )
            .filter(Boolean),
        },
      },
    }));

  const writeFirstRound = await Promise.all(
    namedFirstRoundForDB.map((record: Match) =>
      prisma.match.create({
        data: record,
        include: {
          participants: true,
        },
      })
    )
  );

  finalMatches = [...writeFirstRound];

  let previousRoundInDB = writeFirstRound;

  for (let round = 2; round <= numOfRounds; round++) {
    const currentRound = tournament.matches
      .filter((match: RawMatch) => match.id.r === round)
      .map((match: RawMatch) => ({
        name: match.id.toString(),
      }));

    const currentRoundResults: Match[] = [];

    for (const [idx, match] of currentRound.entries()) {
      const previousMatches = [
        previousRoundInDB[idx * 2],
        previousRoundInDB[idx * 2 + 1],
      ];
      const participants =
        round === 2
          ? previousMatches
              .map((previousMatch) =>
                previousMatch.participants?.length === 1
                  ? previousMatch.participants[0]
                  : undefined
              )
              .filter(Boolean)
          : [];

      const writeMatchToDB = await prisma.match.create({
        data: {
          ...match,
          participants: participants.length
            ? {
                createMany: {
                  data: participants.map((participant) => ({
                    playerId: participant.playerId,
                  })),
                },
              }
            : undefined,
        },
        include: {
          participants: true,
        },
      });
      currentRoundResults.push(writeMatchToDB);

      await Promise.all(
        previousMatches.map((previousMatch) =>
          prisma.match.update({
            where: {
              id: previousMatch.id,
            },
            data: {
              nextMatchId: writeMatchToDB.id,
            },
          })
        )
      );
    }

    previousRoundInDB = currentRoundResults;
    finalMatches = [...finalMatches, ...currentRoundResults];
  }

  return NextResponse.json(finalMatches);
}
