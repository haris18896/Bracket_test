"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import matchesData from "@/data/matches.json";

type DoubleEliminationModel = (typeof matchesData)["double_elimination"];

type TournamentTabKey = "single" | "double" | "pool" | "round_robin" | "swiss";

type BracketsViewerParticipant = {
  id: number;
  name: string;
  tournament_id: number;
};

type BracketsViewerMatchOpponent = {
  id: number | null;
  position?: number;
  result?: "win" | "loss" | "draw";
  score?: number;
  forfeit?: boolean;
};

type BracketsViewerMatch = {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  status: number;
  child_count: number;
  opponent1: BracketsViewerMatchOpponent | null;
  opponent2: BracketsViewerMatchOpponent | null;
};

type BracketsViewerRound = {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
};

type BracketsViewerGroup = {
  id: number;
  number: number;
  stage_id: number;
};

type BracketsViewerStage = {
  id: number;
  name: string;
  number: number;
  tournament_id: number;
  type: "single_elimination" | "double_elimination" | "round_robin";
  settings: Record<string, unknown>;
};

type BracketsViewerData = {
  stage: BracketsViewerStage[];
  group?: BracketsViewerGroup[];
  round?: BracketsViewerRound[];
  match: BracketsViewerMatch[];
  match_game?: never[];
  participant: BracketsViewerParticipant[];
};

const TABS: { key: TournamentTabKey; label: string }[] = [
  { key: "single", label: "Single Elimination" },
  { key: "double", label: "Double Elimination" },
  { key: "pool", label: "Pool Play (Round Robin)" },
  { key: "round_robin", label: "Full Round Robin" },
  { key: "swiss", label: "Swiss" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TournamentTabKey>("single");
  const singleViewerRef = useRef<HTMLDivElement | null>(null);
  const doubleViewerRef = useRef<HTMLDivElement | null>(null);
  const poolViewerRef = useRef<HTMLDivElement | null>(null);
  const roundRobinViewerRef = useRef<HTMLDivElement | null>(null);
  const swissViewerRef = useRef<HTMLDivElement | null>(null);

  const singleViewerData = useMemo(
    () => matchesData.single_elimination as unknown as BracketsViewerData,
    [],
  );

  const poolViewerData = useMemo(
    () => matchesData.Pool_play as unknown as BracketsViewerData,
    [],
  );

  const roundRobinViewerData = useMemo(
    () => matchesData.round_robin as unknown as BracketsViewerData,
    [],
  );

  const swissViewerData = useMemo(
    () => matchesData.Swiss as unknown as BracketsViewerData,
    [],
  );

  const doubleViewerData: DoubleEliminationModel & BracketsViewerData = useMemo(
    () => matchesData.double_elimination as DoubleEliminationModel & BracketsViewerData,
    [],
  );

  // Single elimination
  useEffect(() => {
    if (activeTab !== "single") return;
    if (!singleViewerRef.current) return;

    const w = window as unknown as { bracketsViewer?: { render: (data: unknown, config?: unknown) => unknown } };
    if (!w.bracketsViewer) return;

    w.bracketsViewer.render(
      {
        stages: singleViewerData.stage,
        groups: singleViewerData.group,
        rounds: singleViewerData.round,
        matches: singleViewerData.match,
        matchGames: singleViewerData.match_game ?? [],
        participants: singleViewerData.participant,
      },
      {
        selector: "#single-elim-viewer",
        clear: true,
        showSlotsOrigin: true,
      },
    );
  }, [activeTab, singleViewerData]);

  // Double elimination
  useEffect(() => {
    if (activeTab !== "double") return;
    if (!doubleViewerRef.current) return;

    const w = window as unknown as { bracketsViewer?: { render: (data: unknown, config?: unknown) => unknown } };
    if (!w.bracketsViewer) return;

    w.bracketsViewer.render(
      {
        stages: doubleViewerData.stage,
        groups: doubleViewerData.group,
        rounds: doubleViewerData.round,
        matches: doubleViewerData.match,
        matchGames: doubleViewerData.match_game ?? [],
        participants: doubleViewerData.participant,
      },
      {
        selector: "#double-elim-viewer",
        clear: true,
        showSlotsOrigin: true,
        showLowerBracketSlotsOrigin: true,
      },
    );
  }, [activeTab, doubleViewerData]);

  // Pool play (round robin with multiple groups)
  useEffect(() => {
    if (activeTab !== "pool") return;
    if (!poolViewerRef.current) return;

    const w = window as unknown as { bracketsViewer?: { render: (data: unknown, config?: unknown) => unknown } };
    if (!w.bracketsViewer) return;

    w.bracketsViewer.render(
      {
        stages: poolViewerData.stage,
        groups: poolViewerData.group,
        rounds: poolViewerData.round,
        matches: poolViewerData.match,
        matchGames: poolViewerData.match_game ?? [],
        participants: poolViewerData.participant,
      },
      {
        selector: "#pool-viewer",
        clear: true,
        showRankingTable: true,
      },
    );
  }, [activeTab, poolViewerData]);

  // Full round-robin
  useEffect(() => {
    if (activeTab !== "round_robin") return;
    if (!roundRobinViewerRef.current) return;

    const w = window as unknown as { bracketsViewer?: { render: (data: unknown, config?: unknown) => unknown } };
    if (!w.bracketsViewer) return;

    w.bracketsViewer.render(
      {
        stages: roundRobinViewerData.stage,
        groups: roundRobinViewerData.group,
        rounds: roundRobinViewerData.round,
        matches: roundRobinViewerData.match,
        matchGames: roundRobinViewerData.match_game ?? [],
        participants: roundRobinViewerData.participant,
      },
      {
        selector: "#round-robin-viewer",
        clear: true,
        showRankingTable: true,
      },
    );
  }, [activeTab, roundRobinViewerData]);

  // Swiss (modeled as round robin with a single group)
  useEffect(() => {
    if (activeTab !== "swiss") return;
    if (!swissViewerRef.current) return;

    const w = window as unknown as { bracketsViewer?: { render: (data: unknown, config?: unknown) => unknown } };
    if (!w.bracketsViewer) return;

    w.bracketsViewer.render(
      {
        stages: swissViewerData.stage,
        groups: swissViewerData.group,
        rounds: swissViewerData.round,
        matches: swissViewerData.match,
        matchGames: swissViewerData.match_game ?? [],
        participants: swissViewerData.participant,
      },
      {
        selector: "#swiss-viewer",
        clear: true,
        showRankingTable: true,
      },
    );
  }, [activeTab, swissViewerData]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 py-10 text-slate-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tournament Brackets
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Visualize different tournament formats side‑by‑side. All brackets are rendered with{" "}
              <span className="font-mono text-emerald-300">brackets-viewer</span> from the unified{" "}
              <span className="font-mono text-emerald-300">brackets-model</span> data in{" "}
              <span className="font-mono text-emerald-300">data/matches.json</span>.
            </p>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-2xl bg-slate-900/70 p-1 shadow-lg ring-1 ring-slate-800">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition sm:flex-none sm:px-4 sm:text-sm ${
                  isActive
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <section className="relative flex-1 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-2xl backdrop-blur">
          <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
            <div className="absolute -left-32 top-12 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          </div>

          <div className="relative">
            {activeTab === "single" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Single Elimination Bracket
                </h2>
                <div
                  id="single-elim-viewer"
                  ref={singleViewerRef}
                  className="brackets-viewer rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                />
              </div>
            )}

            {activeTab === "double" && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Double Elimination Bracket
                  </h2>
                  <div
                    id="double-elim-viewer"
                    ref={doubleViewerRef}
                    className="brackets-viewer rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                  />
                </div>
              </div>
            )}

            {activeTab === "pool" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Pool Play (Round Robin Groups)
                </h2>
                <div
                  id="pool-viewer"
                  ref={poolViewerRef}
                  className="brackets-viewer rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                />
              </div>
            )}

            {activeTab === "round_robin" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Full Round Robin
                </h2>
                <div
                  id="round-robin-viewer"
                  ref={roundRobinViewerRef}
                  className="brackets-viewer rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                />
              </div>
            )}

            {activeTab === "swiss" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Swiss (Round Robin Mode)
                </h2>
                <div
                  id="swiss-viewer"
                  ref={swissViewerRef}
                  className="brackets-viewer rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                />
              </div>
            )}
          </div>
        </section>

        {/* All formats now share the same viewer and data model. */}
      </main>
    </div>
  );
}
