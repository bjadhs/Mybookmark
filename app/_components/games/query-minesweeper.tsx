"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";

const SIZE = 9;
const MINE_COUNT = 10;

type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Phase = "idle" | "playing" | "won" | "lost";

const NUMBER_COLORS: Record<number, string> = {
  1: "#00d4ff",
  2: "#1ed760",
  3: "#ff5f57",
  4: "#7c5cff",
  5: "#febc2e",
  6: "#00d4ff",
  7: "#ececf2",
  8: "#7a7a8b",
};

function indexOf(row: number, col: number): number {
  return row * SIZE + col;
}

function neighborsOf(row: number, col: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) out.push([r, c]);
    }
  }
  return out;
}

function emptyBoard(): CellState[] {
  return Array.from({ length: SIZE * SIZE }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
}

function placeMines(board: CellState[], avoidRow: number, avoidCol: number): CellState[] {
  const next = board.map((cell) => ({ ...cell }));
  const avoidIdx = indexOf(avoidRow, avoidCol);
  const candidates = next
    .map((_, i) => i)
    .filter((i) => i !== avoidIdx);

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  const mineSet = new Set(candidates.slice(0, MINE_COUNT));
  for (const idx of mineSet) {
    next[idx].mine = true;
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = next[indexOf(row, col)];
      if (cell.mine) continue;
      let count = 0;
      for (const [r, c] of neighborsOf(row, col)) {
        if (next[indexOf(r, c)].mine) count++;
      }
      cell.adjacent = count;
    }
  }

  return next;
}

function floodReveal(board: CellState[], row: number, col: number): CellState[] {
  const next = board.map((cell) => ({ ...cell }));
  const stack: [number, number][] = [[row, col]];
  const seen = new Set<number>();

  while (stack.length > 0) {
    const [r, c] = stack.pop() as [number, number];
    const idx = indexOf(r, c);
    if (seen.has(idx)) continue;
    seen.add(idx);

    const cell = next[idx];
    if (cell.flagged || cell.revealed) continue;
    cell.revealed = true;

    if (cell.adjacent === 0 && !cell.mine) {
      for (const [nr, nc] of neighborsOf(r, c)) {
        const nIdx = indexOf(nr, nc);
        if (!next[nIdx].revealed && !next[nIdx].flagged) {
          stack.push([nr, nc]);
        }
      }
    }
  }

  return next;
}

function revealAllMines(board: CellState[]): CellState[] {
  return board.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell));
}

function checkWin(board: CellState[]): boolean {
  return board.every((cell) => cell.mine || cell.revealed);
}

/**
 * "Query Minesweeper" — classic 9x9 / 10-mine minesweeper. The first click is
 * always safe: mines are placed only after that click, avoiding its cell.
 */
export default function QueryMinesweeperGame() {
  const [board, setBoard] = useState<CellState[]>(() => emptyBoard());
  const [phase, setPhase] = useState<Phase>("idle");
  const [flagMode, setFlagMode] = useState(false);

  const flagsUsed = useMemo(() => board.filter((c) => c.flagged).length, [board]);
  const minesRemaining = MINE_COUNT - flagsUsed;

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setPhase("idle");
    setFlagMode(false);
  }, []);

  const revealCell = useCallback(
    (row: number, col: number) => {
      if (phase === "won" || phase === "lost") return;
      const idx = indexOf(row, col);

      setBoard((prev) => {
        if (prev[idx].flagged || prev[idx].revealed) return prev;

        let working = prev;
        if (phase === "idle") {
          working = placeMines(prev, row, col);
        }

        const cell = working[idx];
        if (cell.mine) {
          setPhase("lost");
          return revealAllMines(working);
        }

        const revealedBoard = floodReveal(working, row, col);
        if (checkWin(revealedBoard)) {
          setPhase("won");
        } else {
          setPhase("playing");
        }
        return revealedBoard;
      });
    },
    [phase],
  );

  const toggleFlag = useCallback(
    (row: number, col: number) => {
      if (phase === "won" || phase === "lost") return;
      const idx = indexOf(row, col);
      setBoard((prev) => {
        if (prev[idx].revealed) return prev;
        const next = prev.map((cell, i) => (i === idx ? { ...cell, flagged: !cell.flagged } : cell));
        return next;
      });
    },
    [phase],
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (flagMode) {
        toggleFlag(row, col);
      } else {
        revealCell(row, col);
      }
    },
    [flagMode, revealCell, toggleFlag],
  );

  const handleCellContextMenu = useCallback(
    (e: MouseEvent, row: number, col: number) => {
      e.preventDefault();
      toggleFlag(row, col);
    },
    [toggleFlag],
  );

  const ended = phase === "won" || phase === "lost";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Query Minesweeper</div>
          <div className="text-[12px] text-glance-muted">
            Left-click to reveal, right-click (or Flag mode) to flag. Clear the grid without hitting a
            mine.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Mines left</div>
          <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">
            {minesRemaining}
          </div>
        </div>
      </div>

      <div className="relative w-full rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setFlagMode((f) => !f)}
            className={`px-3 py-1.5 rounded-[10px] border text-[12px] font-semibold cursor-pointer transition-colors ${
              flagMode
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "border-glance-border text-glance-muted hover:border-white/20 hover:bg-white/5"
            }`}
          >
            Flag mode: {flagMode ? "on" : "off"}
          </button>

          <div className="text-[12px] text-glance-muted">
            {phase === "idle" && "Click any cell to start"}
            {phase === "playing" && "In progress"}
            {phase === "won" && (
              <span style={{ color: "#1ed760" }} className="font-semibold">
                You win
              </span>
            )}
            {phase === "lost" && (
              <span style={{ color: "#ff5f57" }} className="font-semibold">
                Boom — you hit a mine
              </span>
            )}
          </div>
        </div>

        <div
          className="grid gap-[2px] mx-auto select-none"
          style={{
            gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
            maxWidth: "360px",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.map((cell, idx) => {
            const row = Math.floor(idx / SIZE);
            const col = idx % SIZE;
            const showMine = cell.revealed && cell.mine;
            const showNumber = cell.revealed && !cell.mine && cell.adjacent > 0;

            let bg = "bg-glance-surface";
            let extra = "border-glance-border hover:border-white/20 hover:bg-white/5";
            if (cell.revealed) {
              bg = "bg-white/5";
              extra = "border-glance-border";
              if (showMine) {
                bg = "bg-[#ff5f57]/20";
                extra = "border-[#ff5f57]/40";
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={ended && !cell.revealed}
                onClick={() => handleCellClick(row, col)}
                onContextMenu={(e) => handleCellContextMenu(e, row, col)}
                aria-label={`Cell ${row + 1}, ${col + 1}`}
                className={`relative aspect-square w-full rounded-[4px] border ${bg} ${extra} flex items-center justify-center text-[11px] font-bold cursor-pointer disabled:cursor-default transition-colors`}
                style={showNumber ? { color: NUMBER_COLORS[cell.adjacent] ?? "#ececf2" } : undefined}
              >
                {showMine && (
                  <svg viewBox="0 0 16 16" className="w-[60%] h-[60%]" aria-hidden="true">
                    <circle cx="8" cy="8" r="4.5" fill="#ff5f57" />
                    <line x1="8" y1="0" x2="8" y2="16" stroke="#ff5f57" strokeWidth="1.4" />
                    <line x1="0" y1="8" x2="16" y2="8" stroke="#ff5f57" strokeWidth="1.4" />
                    <line x1="2.3" y1="2.3" x2="13.7" y2="13.7" stroke="#ff5f57" strokeWidth="1.4" />
                    <line x1="13.7" y1="2.3" x2="2.3" y2="13.7" stroke="#ff5f57" strokeWidth="1.4" />
                  </svg>
                )}
                {showNumber && cell.adjacent}
                {!cell.revealed && cell.flagged && (
                  <svg viewBox="0 0 16 16" className="w-[55%] h-[55%]" aria-hidden="true">
                    <line x1="4" y1="2" x2="4" y2="14" stroke="#febc2e" strokeWidth="1.6" />
                    <path d="M4 2 L13 5 L4 8 Z" fill="#febc2e" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {ended && (
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Play again
            </button>
          </div>
        )}

        {!ended && phase !== "idle" && (
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-1.5 rounded-[10px] border border-glance-border text-glance-muted text-[12px] font-semibold cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
