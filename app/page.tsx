"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import SingleEliminationData from "@/data/single_elimination.json";
import DoubleEliminationData from "@/data/double_elimination.json";
import PoolPlayData from "@/data/pool_play.json";
import RoundRobinData from "@/data/round_robin.json";
import SwissData from "@/data/swiss.json";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  totalFrames?: number;
  framesWon?: number;
  winningCondition?: string;
};
type BracketsViewerMatch = {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  /** 0=Locked 1=Waiting 2=Ready 3=Running 4=Completed 5=Archived */
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
type BracketsViewerGroup = { id: number; number: number; stage_id: number };
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
type CleanedData = {
  stage: BracketsViewerStage[];
  group: BracketsViewerGroup[];
  round: BracketsViewerRound[];
  match: BracketsViewerMatch[];
  match_game: never[];
  participant: BracketsViewerParticipant[];
};

// Match status labels
const STATUS_LABEL: Record<number, string> = {
  0: "Locked",
  1: "Waiting",
  2: "Ready",
  3: "Running",
  4: "Completed",
  5: "Archived / Cancelled",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanViewerData(data: BracketsViewerData): CleanedData {
  const match = (data.match ?? []).filter(
    (m): m is BracketsViewerMatch =>
      m != null && typeof (m as { id?: number }).id === "number",
  );
  const round = (data.round ?? []).filter(
    (r): r is BracketsViewerRound =>
      r != null &&
      typeof (r as { id?: number }).id === "number" &&
      "stage_id" in r &&
      "group_id" in r,
  );
  const group = (data.group ?? []).filter(
    (g): g is BracketsViewerGroup =>
      g != null &&
      typeof (g as { id?: number }).id === "number" &&
      "stage_id" in g,
  );
  return {
    stage: data.stage ?? [],
    group,
    round,
    match,
    match_game: [],
    participant: data.participant ?? [],
  };
}

// ─── CSS Injection ────────────────────────────────────────────────────────────

const DARK_CSS = `
  .brackets-viewer {
    --bv-font-family: 'DM Mono', 'Fira Code', monospace;
    --bv-match-border-radius: 8px;
    --bv-match-border-width: 1px;
    --bv-opponent-border-radius: 6px;

    /* Backgrounds */
    --bv-match-background: #111827;
    --bv-match-border-color: #1f2937;
    --bv-opponent-background: #0f172a;
    --bv-opponent-border-color: #1e3a5f;

    /* Text */
    --bv-opponent-name-color: #e2e8f0;
    --bv-opponent-score-color: #38bdf8;
    --bv-match-label-color: #64748b;

    /* States */
    --bv-win-background: #0c2337;
    --bv-win-border-color: #0ea5e9;
    --bv-win-name-color: #7dd3fc;
    --bv-win-score-color: #38bdf8;

    --bv-loss-background: #1f1215;
    --bv-loss-border-color: #3f1827;
    --bv-loss-name-color: #6b7280;
    --bv-loss-score-color: #4b5563;

    --bv-forfeit-background: #1c1917;
    --bv-forfeit-border-color: #292524;
    --bv-forfeit-name-color: #44403c;
    --bv-forfeit-score-color: #292524;

    /* Connector lines */
    --bv-connector-color: #1e3a5f;
    --bv-connector-width: 2px;

    /* Round header */
    --bv-round-header-background: #0f172a;
    --bv-round-header-color: #38bdf8;
    --bv-round-header-border-color: #1e3a5f;

    /* Rank table */
    --bv-table-background: #0f172a;
    --bv-table-border-color: #1e3a5f;
    --bv-table-header-background: #0c1524;
    --bv-table-header-color: #38bdf8;
    --bv-table-row-color: #cbd5e1;
    --bv-table-row-hover-background: #172033;
  }
`;

const LIGHT_CSS = `
  .brackets-viewer {
    --bv-font-family: 'DM Mono', 'Fira Code', monospace;
    --bv-match-border-radius: 8px;
    --bv-match-border-width: 1px;
    --bv-opponent-border-radius: 6px;

    --bv-match-background: #ffffff;
    --bv-match-border-color: #e2e8f0;
    --bv-opponent-background: #f8fafc;
    --bv-opponent-border-color: #bfdbfe;

    --bv-opponent-name-color: #1e293b;
    --bv-opponent-score-color: #2563eb;
    --bv-match-label-color: #94a3b8;

    --bv-win-background: #eff6ff;
    --bv-win-border-color: #3b82f6;
    --bv-win-name-color: #1d4ed8;
    --bv-win-score-color: #2563eb;

    --bv-loss-background: #fafafa;
    --bv-loss-border-color: #e2e8f0;
    --bv-loss-name-color: #94a3b8;
    --bv-loss-score-color: #cbd5e1;

    --bv-forfeit-background: #fafafa;
    --bv-forfeit-border-color: #e2e8f0;
    --bv-forfeit-name-color: #cbd5e1;
    --bv-forfeit-score-color: #e2e8f0;

    --bv-connector-color: #bfdbfe;
    --bv-connector-width: 2px;

    --bv-round-header-background: #eff6ff;
    --bv-round-header-color: #1d4ed8;
    --bv-round-header-border-color: #bfdbfe;

    --bv-table-background: #f8fafc;
    --bv-table-border-color: #e2e8f0;
    --bv-table-header-background: #eff6ff;
    --bv-table-header-color: #1d4ed8;
    --bv-table-row-color: #334155;
    --bv-table-row-hover-background: #f0f9ff;
  }
`;

// Extra CSS that applies regardless of theme
const EXTRA_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

  /* Match number badge */
  .brackets-viewer .match-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.05em;
    opacity: 0.7;
  }

  /* Clickable matches */
  .brackets-viewer .match[data-clickable="true"] {
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .brackets-viewer .match[data-clickable="true"]:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.15);
  }

  /* Disabled / completed / cancelled matches */
  .brackets-viewer .match[data-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Status dot */
  .match-status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }

  /* Forfeit slot */
  .brackets-viewer .opponent[data-forfeit="true"] .participant-name::after {
    content: ' (BYE)';
    opacity: 0.45;
    font-size: 0.8em;
  }
`;

// ─── Match Info Panel ──────────────────────────────────────────────────────────

type MatchPanelProps = {
  match: BracketsViewerMatch | null;
  participants: BracketsViewerParticipant[];
  isDark: boolean;
  onClose: () => void;
};

function MatchPanel({ match, participants, isDark, onClose }: MatchPanelProps) {
  if (!match) return null;

  const findName = (id: number | null) =>
    id == null
      ? "TBD"
      : (participants.find((p) => p.id === id)?.name ?? `Player #${id}`);

  const statusLabel = STATUS_LABEL[match.status] ?? `Status ${match.status}`;
  const statusColor: Record<number, string> = {
    0: "#6b7280", // Locked – grey
    1: "#f59e0b", // Waiting – amber
    2: "#22c55e", // Ready – green
    3: "#3b82f6", // Running – blue
    4: "#a78bfa", // Completed – purple
    5: "#ef4444", // Archived – red
  };
  const dotColor = statusColor[match.status] ?? "#6b7280";

  const bg = isDark ? "#0f172a" : "#ffffff";
  const border = isDark ? "#1e3a5f" : "#bfdbfe";
  const text = isDark ? "#e2e8f0" : "#1e293b";
  const muted = isDark ? "#64748b" : "#94a3b8";
  const cardBg = isDark ? "#111827" : "#f8fafc";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        width: "340px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "14px",
        padding: "20px",
        boxShadow: isDark
          ? "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.08)"
          : "0 20px 40px rgba(0,0,0,0.12)",
        zIndex: 1000,
        fontFamily: "'DM Sans', sans-serif",
        color: text,
        animation: "slideUp 0.2s ease",
      }}
    >
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            color: muted,
            letterSpacing: "0.08em",
          }}
        >
          MATCH #{match.id} · ROUND {match.round_id}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: muted,
            fontSize: "18px",
            lineHeight: 1,
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: "16px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: `${dotColor}18`,
            border: `1px solid ${dotColor}40`,
            borderRadius: "999px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: dotColor,
            letterSpacing: "0.05em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dotColor,
              display: "inline-block",
            }}
          />
          {statusLabel.toUpperCase()}
        </span>
      </div>

      {/* Opponents */}
      {[match.opponent1, match.opponent2].map((opp, i) => {
        if (!opp) return null;
        const name = findName(opp.id);
        const isWin = opp.result === "win";
        const isLoss = opp.result === "loss";
        const isForfeit = opp.forfeit;
        const rowBg = isWin
          ? isDark
            ? "#0c2337"
            : "#eff6ff"
          : isLoss
            ? isDark
              ? "#1f1215"
              : "#fafafa"
            : cardBg;
        const rowBorder = isWin
          ? "#0ea5e9"
          : isLoss
            ? isDark
              ? "#3f1827"
              : "#e2e8f0"
            : border;
        const nameColor = isWin ? "#38bdf8" : isLoss ? muted : text;

        return (
          <div
            key={i}
            style={{
              background: rowBg,
              border: `1px solid ${rowBorder}`,
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  color: muted,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {i === 0 ? "P1" : "P2"}
              </span>
              <span
                style={{ fontWeight: 500, fontSize: "14px", color: nameColor }}
              >
                {isForfeit ? `${name} (BYE)` : name}
              </span>
              {(opp.totalFrames != null || opp.framesWon != null) && (
                <div
                  style={{
                    fontSize: "11px",
                    color: muted,
                    marginTop: 2,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {opp.framesWon ?? 0}/{opp.totalFrames ?? "?"} frames
                  {opp.winningCondition ? ` · ${opp.winningCondition}` : ""}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {opp.score != null && (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: isWin ? "#38bdf8" : muted,
                  }}
                >
                  {opp.score}
                </span>
              )}
              {isWin && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#22c55e",
                    fontWeight: 700,
                  }}
                >
                  W
                </span>
              )}
              {isLoss && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#ef4444",
                    fontWeight: 700,
                  }}
                >
                  L
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Meta */}
      <div
        style={{
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: `1px solid ${border}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {[
          ["Group", `#${match.group_id}`],
          ["Stage", `#${match.stage_id}`],
          ["Number", `${match.number}`],
          ["Child count", `${match.child_count}`],
        ].map(([label, val]) => (
          <div key={label}>
            <div
              style={{
                fontSize: "10px",
                color: muted,
                letterSpacing: "0.06em",
                marginBottom: "2px",
              }}
            >
              {label.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                color: text,
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { key: TournamentTabKey; label: string; icon: string }[] = [
  { key: "single", label: "Single Elim", icon: "⚔" },
  { key: "double", label: "Double Elim", icon: "⚡" },
  { key: "pool", label: "Pool Play", icon: "◈" },
  { key: "round_robin", label: "Round Robin", icon: "↻" },
  { key: "swiss", label: "Swiss", icon: "♟" },
];

// ─── Viewer Configs ───────────────────────────────────────────────────────────

const VIEWER_CONFIGS: Record<
  TournamentTabKey,
  {
    selector: string;
    showSlotsOrigin?: boolean;
    showLowerBracketSlotsOrigin?: boolean;
    showRankingTable?: boolean;
  }
> = {
  single: { selector: "#single-elim-viewer", showSlotsOrigin: true },
  double: {
    selector: "#double-elim-viewer",
    showSlotsOrigin: true,
    showLowerBracketSlotsOrigin: true,
  },
  pool: { selector: "#pool-viewer", showRankingTable: true },
  round_robin: { selector: "#round-robin-viewer", showRankingTable: true },
  swiss: { selector: "#swiss-viewer", showRankingTable: true },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<TournamentTabKey>("single");
  const [isDark, setIsDark] = useState(true);
  const [selectedMatch, setSelectedMatch] =
    useState<BracketsViewerMatch | null>(null);
  const styleTagRef = useRef<HTMLStyleElement | null>(null);

  // ── Data memos ──────────────────────────────────────────────────────────────

  const dataMap = useMemo<Record<TournamentTabKey, CleanedData>>(
    () => ({
      single: cleanViewerData(
        SingleEliminationData as unknown as BracketsViewerData,
      ),
      double: cleanViewerData(
        DoubleEliminationData as unknown as BracketsViewerData,
      ),
      pool: cleanViewerData(PoolPlayData as unknown as BracketsViewerData),
      round_robin: cleanViewerData(
        RoundRobinData as unknown as BracketsViewerData,
      ),
      swiss: cleanViewerData(SwissData as unknown as BracketsViewerData),
    }),
    [],
  );

  // ── Inject / update CSS variables ──────────────────────────────────────────

  useEffect(() => {
    if (!styleTagRef.current) {
      const tag = document.createElement("style");
      tag.id = "bv-theme";
      document.head.appendChild(tag);
      styleTagRef.current = tag;
    }
    styleTagRef.current.textContent =
      (isDark ? DARK_CSS : LIGHT_CSS) + EXTRA_CSS;
  }, [isDark]);

  // ── Render bracket ─────────────────────────────────────────────────────────

  const renderBracket = useCallback(
    (tab: TournamentTabKey) => {
      const w = window as unknown as {
        bracketsViewer?: {
          render: (data: unknown, config?: unknown) => void;
          onMatchClicked?: (callback: (match: unknown) => void) => void;
        };
      };
      if (!w.bracketsViewer) return;

      const cleaned = dataMap[tab];
      const cfg = VIEWER_CONFIGS[tab];

      // Set up click callback BEFORE render
      if (w.bracketsViewer.onMatchClicked) {
        w.bracketsViewer.onMatchClicked((match) => {
          const m = match as BracketsViewerMatch;
          setSelectedMatch(m);
          console.log("[Match Clicked]", m);
        });
      }

      w.bracketsViewer.render(
        {
          stages: cleaned.stage,
          groups: cleaned.group,
          rounds: cleaned.round,
          matches: cleaned.match,
          matchGames: cleaned.match_game,
          participants: cleaned.participant,
        },
        {
          ...cfg,
          clear: true,
          participantOriginPlacement: "before",
          onMatchClick: (match: unknown) => {
            const m = match as BracketsViewerMatch;
            if (m.status === 2 || m.status === 3) {
              setSelectedMatch(m);
              console.log("[Match Clicked]", m);
            }
          },
        },
      );

      // Post-process DOM: add data attributes for styling
      setTimeout(() => {
        const container = document.querySelector(cfg.selector);
        if (!container) return;
        container.querySelectorAll<HTMLElement>(".match").forEach((el) => {
          const matchIdAttr =
            el.getAttribute("data-match-id") ??
            el.closest("[data-match-id]")?.getAttribute("data-match-id");
          if (!matchIdAttr) return;
          const mid = parseInt(matchIdAttr, 10);
          const match = cleaned.match.find((m) => m.id === mid);
          if (!match) return;

          const isDisabled =
            match.status === 0 ||
            match.status === 1 ||
            match.status === 4 ||
            match.status === 5;
          const isClickable = match.status === 2 || match.status === 3;

          el.setAttribute("data-disabled", String(isDisabled));
          el.setAttribute("data-clickable", String(isClickable));

          // Status tooltip
          el.setAttribute(
            "title",
            `Match #${match.id} · ${STATUS_LABEL[match.status] ?? "Unknown"}`,
          );
        });
      }, 150);
    },
    [dataMap],
  );

  useEffect(() => {
    // Small delay to ensure DOM + bracketsViewer script is loaded
    const t = setTimeout(() => renderBracket(activeTab), 80);
    return () => clearTimeout(t);
  }, [activeTab, renderBracket, isDark]);

  // ── Theme-derived styles ───────────────────────────────────────────────────

  const th = isDark
    ? {
        pageBg:
          "linear-gradient(135deg, #020817 0%, #0a1628 50%, #020c1b 100%)",
        cardBg: "rgba(15,23,42,0.95)",
        cardBorder: "#1e3a5f",
        tabBar: "rgba(9,18,35,0.8)",
        tabActive: { bg: "#0ea5e9", color: "#fff" },
        tabInactive: { bg: "transparent", color: "#64748b" },
        text: "#e2e8f0",
        subText: "#475569",
        accent: "#38bdf8",
        toggleBg: "#0f172a",
        toggleBorder: "#1e3a5f",
        sectionBg: "rgba(9,18,35,0.6)",
        sectionBorder: "#1e3a5f",
        glowA: "rgba(14,165,233,0.12)",
        glowB: "rgba(56,189,248,0.06)",
      }
    : {
        pageBg:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%)",
        cardBg: "rgba(255,255,255,0.98)",
        cardBorder: "#bfdbfe",
        tabBar: "rgba(240,249,255,0.9)",
        tabActive: { bg: "#2563eb", color: "#fff" },
        tabInactive: { bg: "transparent", color: "#94a3b8" },
        text: "#0f172a",
        subText: "#64748b",
        accent: "#2563eb",
        toggleBg: "#fff",
        toggleBorder: "#bfdbfe",
        sectionBg: "rgba(248,250,252,0.8)",
        sectionBorder: "#bfdbfe",
        glowA: "rgba(37,99,235,0.08)",
        glowB: "rgba(14,165,233,0.05)",
      };

  const currentData = dataMap[activeTab];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: th.pageBg,
        fontFamily: "'DM Sans', sans-serif",
        color: th.text,
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* Ambient glow orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: th.glowA,
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            right: "-60px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: th.glowB,
            filter: "blur(60px)",
          }}
        />
      </div>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "22px" }}>🏆</span>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(20px, 3vw, 28px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: th.text,
                }}
              >
                Tournament Brackets
              </h1>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: th.subText,
                maxWidth: "480px",
                lineHeight: 1.5,
              }}
            >
              Powered by{" "}
              <code
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: th.accent,
                  fontSize: "12px",
                }}
              >
                brackets-viewer
              </code>{" "}
              · Click{" "}
              <span style={{ color: "#22c55e", fontWeight: 600 }}>Ready</span>{" "}
              or{" "}
              <span style={{ color: "#3b82f6", fontWeight: 600 }}>Running</span>{" "}
              matches to inspect them.
            </p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark((d) => !d)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: th.toggleBg,
              border: `1px solid ${th.toggleBorder}`,
              borderRadius: "999px",
              cursor: "pointer",
              color: th.text,
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s ease",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: "16px" }}>{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </header>

        {/* ── Legend ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "1.5rem",
            padding: "12px 16px",
            background: th.cardBg,
            border: `1px solid ${th.cardBorder}`,
            borderRadius: "12px",
          }}
        >
          {[
            { color: "#6b7280", label: "Locked" },
            { color: "#f59e0b", label: "Waiting" },
            { color: "#22c55e", label: "Ready (clickable)" },
            { color: "#3b82f6", label: "Running (clickable)" },
            { color: "#a78bfa", label: "Completed" },
            { color: "#ef4444", label: "Cancelled" },
          ].map(({ color, label }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: th.subText,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            background: th.tabBar,
            border: `1px solid ${th.cardBorder}`,
            borderRadius: "14px",
            padding: "6px",
            marginBottom: "1.5rem",
            backdropFilter: "blur(10px)",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedMatch(null);
                }}
                style={{
                  flex: "1 1 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? th.tabActive.bg : th.tabInactive.bg,
                  color: isActive ? th.tabActive.color : th.tabInactive.color,
                  transition: "all 0.18s ease",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ fontSize: "14px" }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ── Bracket section ── */}
        <section
          style={{
            background: th.sectionBg,
            border: `1px solid ${th.sectionBorder}`,
            borderRadius: "18px",
            padding: "20px",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          {/* Section header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>
                {TABS.find((t) => t.key === activeTab)?.icon}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 600,
                  color: th.text,
                }}
              >
                {TABS.find((t) => t.key === activeTab)?.label}
              </h2>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                fontSize: "12px",
                color: th.subText,
              }}
            >
              <span>
                <span
                  style={{
                    color: th.accent,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {currentData.participant.length}
                </span>{" "}
                players
              </span>
              <span>
                <span
                  style={{
                    color: th.accent,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {currentData.match.length}
                </span>{" "}
                matches
              </span>
              <span>
                <span
                  style={{
                    color: th.accent,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {currentData.round.length}
                </span>{" "}
                rounds
              </span>
            </div>
          </div>

          {/* Viewer containers — all rendered, only active one visible */}
          <div style={{ overflowX: "auto" }}>
            <div
              id="single-elim-viewer"
              className="brackets-viewer"
              style={{
                display: activeTab === "single" ? "block" : "none",
                minWidth: "600px",
              }}
            />
            <div
              id="double-elim-viewer"
              className="brackets-viewer"
              style={{
                display: activeTab === "double" ? "block" : "none",
                minWidth: "900px",
              }}
            />
            <div
              id="pool-viewer"
              className="brackets-viewer"
              style={{
                display: activeTab === "pool" ? "block" : "none",
                minWidth: "600px",
              }}
            />
            <div
              id="round-robin-viewer"
              className="brackets-viewer"
              style={{
                display: activeTab === "round_robin" ? "block" : "none",
                minWidth: "600px",
              }}
            />
            <div
              id="swiss-viewer"
              className="brackets-viewer"
              style={{
                display: activeTab === "swiss" ? "block" : "none",
                minWidth: "600px",
              }}
            />
          </div>
        </section>
      </main>

      {/* ── Match detail panel ── */}
      {selectedMatch && (
        <MatchPanel
          match={selectedMatch}
          participants={currentData.participant}
          isDark={isDark}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
