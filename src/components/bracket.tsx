"use client";

import dynamic from "next/dynamic";
import _ from "lodash";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Match, Participant, Player } from "@prisma/client";
import { createTheme } from "@g-loot/react-tournament-brackets";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { set } from "lodash";

const SingleEliminationBracket = dynamic(
  () =>
    import("@g-loot/react-tournament-brackets").then(
      (mod) => mod.SingleEliminationBracket
    ),
  { ssr: false }
);

const MatchComponent = dynamic(
  () => import("@g-loot/react-tournament-brackets").then((mod) => mod.Match),
  { ssr: false }
);

const SVGViewer = dynamic(
  () =>
    import("@g-loot/react-tournament-brackets").then((mod) => mod.SVGViewer),
  { ssr: false }
);

type UIParticipant = {
  id: string | number;
  isWinner?: boolean;
  name?: string;
  status?: "PLAYED" | "NO_SHOW" | "WALK_OVER" | "NO_PARTY" | string | null;
  resultText?: string | null;
  [key: string]: any;
};

type UIMatch = {
  id: number | string;
  href?: string;
  name?: string;
  nextMatchId: number | string | null;
  nextLooserMatchId?: number | string;
  tournamentRoundText?: string;
  startTime: string;
  state: "PLAYED" | "NO_SHOW" | "WALK_OVER" | "NO_PARTY" | string;
  participants: UIParticipant[];
  [key: string]: any;
};

const GlootTheme = createTheme({
  textColor: { main: "#000000", highlighted: "#F4F2FE", dark: "#707582" },
  matchBackground: { wonColor: "#2D2D59", lostColor: "#1B1D2D" },
  score: {
    background: {
      wonColor: `#10131C`,
      lostColor: "#10131C",
    },
    text: { highlightedWonColor: "#7BF59D", highlightedLostColor: "#FB7E94" },
  },
  border: {
    color: "#292B43",
    highlightedColor: "RGBA(152,82,242,0.4)",
  },
  roundHeader: { backgroundColor: "#3B3F73", fontColor: "#F4F2FE" },
  connectorColor: "#3B3F73",
  connectorColorHighlight: "RGBA(152,82,242,0.4)",
  svgBackground: "#0F121C",
});

const Bracket = () => {
  const getWindowSize = () => {
    if (typeof window !== "undefined") {
      return {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight,
      };
    }
    return { width: 0, height: 0 };
  };

  const [windowSize, setWindowSize] = useState(getWindowSize());
  const [matches, setMatches] = useState<
    (Match & { participants?: (Participant & { player: Player })[] })[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [modalMatch, setModalMatch] = useState<UIMatch | null>(null);
  const [scores, setScores] = useState<
    [number | undefined, number | undefined]
  >([undefined, undefined]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getWindowSize());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const finalWidth = Math.max(windowSize.width - 50, 500);
  const finalHeight = Math.max(windowSize.height - 200, 500);

  const fetchMatches = async () => {
    setIsLoading(true);
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
          ? "https://" + process.env.NEXT_PUBLIC_VERCEL_URL
          : "http://localhost:3000"
      }/api/match`,
      {
        next: { revalidate: 0 },
        cache: "no-store",
      }
    );
    const data = await res.json();
    setMatches(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const uiMatches: UIMatch[] = matches.map((match) => ({
    id: match.id,
    nextMatchId: match.nextMatchId,
    state:
      match.participants?.length === 1 && match.name.includes("R1")
        ? "WALK_OVER"
        : "",
    tournamentRoundText: match.name.split(" ")[1],
    participants:
      match.participants?.map((participant) => ({
        id: "" + participant.matchId + participant.playerId,
        name: participant.player?.name,
        status: !_.isNil(participant.score)
          ? "PLAYED"
          : match.participants?.length === 1 && match.name.includes("R1")
          ? "WALK_OVER"
          : "",
        isWinner:
          participant.score === _.maxBy(match.participants, "score")?.score,
        resultText: participant.score?.toString(),
        matchId: participant.matchId,
        playerId: participant.playerId,
      })) || [],
    startTime: "",
  }));

  const handleModalToggle = (event?: any) => {
    if (event && event.match.participants.length < 2) {
      return;
    }
    if (isScoreModalOpen) {
      setModalMatch(null);
      setScores([undefined, undefined]);
    } else {
      console.log(event.match);
      setModalMatch(event.match);
    }
    setIsScoreModalOpen(!isScoreModalOpen);
  };

  const ClickableMatchComponent = (props: any) => (
    <MatchComponent {...props} onMatchClick={handleModalToggle} />
  );

  const saveMatchResult = async () => {
    if (_.isNil(scores[0]) || _.isNil(scores[1])) {
      return;
    }
    setIsSaving(true);
    const winnerIdx = scores[0] > scores[1] ? 0 : 1;
    await Promise.all([
      ...(modalMatch?.participants.map((participant, idx) =>
        fetch(
          `${
            process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
              ? "https://" + process.env.NEXT_PUBLIC_VERCEL_URL
              : "http://localhost:3000"
          }/api/participant`,
          {
            method: "PATCH",
            body: JSON.stringify({
              matchId: participant.matchId,
              playerId: participant.playerId,
              score: scores[idx],
            }),
            next: { revalidate: 0 },
            cache: "no-store",
          }
        )
      ) || []),
      fetch(
        `${
          process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
            ? "https://" + process.env.NEXT_PUBLIC_VERCEL_URL
            : "http://localhost:3000"
        }/api/participant`,
        {
          method: "POST",
          body: JSON.stringify({
            matchId: modalMatch?.nextMatchId,
            playerId: modalMatch?.participants[winnerIdx].playerId,
          }),
          next: { revalidate: 0 },
          cache: "no-store",
        }
      ),
    ]);
    setIsSaving(false);
    fetchMatches();
    handleModalToggle();
  };

  return (
    <div className="bg-black">
      <h1>
        Tournament Bracket
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      </h1>
      {!!matches.length && (
        <>
          <SingleEliminationBracket
            matches={uiMatches}
            matchComponent={ClickableMatchComponent}
            theme={GlootTheme}
            options={{
              style: {
                roundHeader: {
                  // @ts-ignore
                  backgroundColor: GlootTheme.roundHeader.backgroundColor,
                  // @ts-ignore
                  fontColor: GlootTheme.roundHeader.fontColor,
                },
                // @ts-ignore
                connectorColor: GlootTheme.connectorColor,
                // @ts-ignore
                connectorColorHighlight: GlootTheme.connectorColorHighlight,
              },
            }}
            svgWrapper={({ children, ...props }) => (
              // @ts-ignore
              <SVGViewer
                // @ts-ignore
                background={GlootTheme.svgBackground}
                // @ts-ignore
                SVGBackground={GlootTheme.svgBackground}
                width={finalWidth}
                height={finalHeight}
                {...props}
              >
                {children}
              </SVGViewer>
            )}
          />
          <Dialog open={isScoreModalOpen} onOpenChange={handleModalToggle}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit match {modalMatch?.id}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="participant1" className="text-right">
                    {modalMatch?.participants?.[0]?.name}
                  </Label>
                  <Input
                    id="participant1"
                    type="number"
                    value={scores[0]}
                    className="col-span-3"
                    onChange={(event) =>
                      setScores([+event.target.value, scores[1]])
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="participant2" className="text-right">
                    {modalMatch?.participants?.[1]?.name}
                  </Label>
                  <Input
                    id="participant2"
                    type="number"
                    value={scores[1]}
                    className="col-span-3"
                    onChange={(event) =>
                      setScores([scores[0], +event.target.value])
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveMatchResult} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Bracket;
