"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const GRID_SIZE = 5;
const BLOCKED_COUNT = 5;

type Cell = { row: number; col: number };

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

function isAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function randomCell(): Cell {
  return {
    row: Math.floor(Math.random() * GRID_SIZE),
    col: Math.floor(Math.random() * GRID_SIZE),
  };
}

function neighbors(cell: Cell): Cell[] {
  const { row, col } = cell;
  const candidates: Cell[] = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];
  return candidates.filter((c) => c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE);
}

function findPath(source: Cell, target: Cell, blocked: Set<string>): Cell[] | null {
  const startKey = cellKey(source);
  const targetKey = cellKey(target);
  const queue: Cell[] = [source];
  const visited = new Set<string>([startKey]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const currentKey = cellKey(current);
    if (currentKey === targetKey) {
      const path: Cell[] = [];
      let key: string | undefined = currentKey;
      while (key) {
        const [r, c] = key.split(",").map(Number);
        path.unshift({ row: r, col: c });
        key = parent.get(key);
      }
      return path;
    }
    for (const next of neighbors(current)) {
      const nextKey = cellKey(next);
      if (visited.has(nextKey) || blocked.has(nextKey)) continue;
      visited.add(nextKey);
      parent.set(nextKey, currentKey);
      queue.push(next);
    }
  }
  return null;
}

type Layout = {
  source: Cell;
  target: Cell;
  blocked: Set<string>;
};

function generateLayout(): Layout {
  for (let attempt = 0; attempt < 200; attempt++) {
    const source = randomCell();
    let target = randomCell();
    let guard = 0;
    while ((target.row === source.row && target.col === source.col) && guard < 50) {
      target = randomCell();
      guard++;
    }
    const manhattan = Math.abs(source.row - target.row) + Math.abs(source.col - target.col);
    if (manhattan < 3) continue;

    const blocked = new Set<string>();
    const reserved = new Set([cellKey(source), cellKey(target)]);
    let blockAttempts = 0;
    while (blocked.size < BLOCKED_COUNT && blockAttempts < 100) {
      blockAttempts++;
      const candidate = randomCell();
      const key = cellKey(candidate);
      if (reserved.has(key) || blocked.has(key)) continue;
      blocked.add(key);
    }

    const path = findPath(source, target, blocked);
    if (path && path.length >= 4) {
      return { source, target, blocked };
    }
  }
  return { source: { row: 0, col: 0 }, target: { row: GRID_SIZE - 1, col: GRID_SIZE - 1 }, blocked: new Set() };
}

export default function NetworkConnectGame() {
  const [layout, setLayout] = useState<Layout>(() => generateLayout());
  const [path, setPath] = useState<Cell[]>([]);
  const [won, setWon] = useState(false);
  const [moves, setMoves] = useState(0);

  const pathKeys = useMemo(() => new Set(path.map(cellKey)), [path]);
  const sourceKey = cellKey(layout.source);
  const targetKey = cellKey(layout.target);

  const newGame = useCallback(() => {
    setLayout(generateLayout());
    setPath([]);
    setWon(false);
    setMoves(0);
  }, []);

  const resetPath = useCallback(() => {
    setPath([]);
    setWon(false);
  }, []);

  const handleCellClick = useCallback(
    (cell: Cell) => {
      if (won) return;
      const key = cellKey(cell);
      if (key === sourceKey || layout.blocked.has(key)) return;

      if (path.length > 0) {
        const last = path[path.length - 1];
        if (cellKey(last) === key) {
          setPath((p) => p.slice(0, -1));
          return;
        }
      }

      if (pathKeys.has(key)) return;

      const tail = path.length > 0 ? path[path.length - 1] : layout.source;
      if (!isAdjacent(tail, cell)) return;

      const nextPath = [...path, cell];
      setPath(nextPath);
      setMoves((m) => m + 1);

      if (key === targetKey) {
        setWon(true);
      }
    },
    [won, path, pathKeys, layout, sourceKey, targetKey],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (won) return;
      if (e.key !== "Backspace" && e.key !== "Escape") return;
      e.preventDefault();
      if (e.key === "Backspace") setPath((p) => p.slice(0, -1));
      if (e.key === "Escape") setPath([]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [won]);

  const cells: Cell[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      cells.push({ row, col });
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Signal Link</div>
          <div className="text-[12px] text-glance-muted">
            Click adjacent nodes to route a path from source to target.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Moves</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{moves}</div>
          </div>
        </div>
      </div>

      <div className="relative w-full rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden p-4">
        <div className="mx-auto grid grid-cols-5 gap-2 w-full max-w-[320px] aspect-square">
          {cells.map((cell) => {
            const key = cellKey(cell);
            const isSource = key === sourceKey;
            const isTarget = key === targetKey;
            const isBlocked = layout.blocked.has(key);
            const isOnPath = pathKeys.has(key);
            const isPathEnd = path.length > 0 && cellKey(path[path.length - 1]) === key;

            let nodeClasses = "relative flex items-center justify-center rounded-[10px] border transition-all cursor-pointer";
            if (isBlocked) {
              nodeClasses += " border-white/5 bg-white/[0.02] cursor-not-allowed";
            } else if (isSource) {
              nodeClasses += " border-[var(--accent)] bg-[var(--accent)]";
            } else if (isTarget) {
              nodeClasses += won
                ? " border-[var(--accent)] bg-[var(--accent)]"
                : " border-[var(--accent)] bg-[var(--accent)]/12";
            } else if (isOnPath) {
              nodeClasses += " border-[var(--accent)] bg-[var(--accent)]/30";
            } else {
              nodeClasses += " border-glance-border bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]";
            }

            return (
              <button
                key={key}
                type="button"
                disabled={isBlocked}
                onClick={() => handleCellClick(cell)}
                aria-label={
                  isSource
                    ? "Source node"
                    : isTarget
                      ? "Target node"
                      : isBlocked
                        ? "Blocked node"
                        : `Node row ${cell.row + 1} column ${cell.col + 1}`
                }
                className={nodeClasses}
              >
                {isSource && (
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
                {isTarget && (
                  <span
                    className="w-4 h-4 rounded-full border-2"
                    style={{ borderColor: won ? "#0e0e16" : "var(--accent)" }}
                  />
                )}
                {isBlocked && (
                  <span className="w-2 h-2 rounded-full bg-glance-faint/40" />
                )}
                {!isSource && !isTarget && !isBlocked && isPathEnd && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#0e0e16]/90">
            <div className="text-[15px] font-bold text-glance-primary">Connected!</div>
            <div className="text-[12px] text-glance-muted">
              Linked source to target in {moves} moves.
            </div>
            <button
              type="button"
              onClick={newGame}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      {!won && (
        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-glance-faint">
            Click the last node again to undo a step.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetPath}
              className="px-3.5 py-1.5 rounded-[9px] border border-glance-border text-glance-muted text-[12px] font-medium cursor-pointer transition-colors hover:border-white/20 hover:text-glance-primary"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={newGame}
              className="px-3.5 py-1.5 rounded-[9px] border border-glance-border text-glance-muted text-[12px] font-medium cursor-pointer transition-colors hover:border-white/20 hover:text-glance-primary"
            >
              New layout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
