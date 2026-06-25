"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "playing" | "over";

const GRID_SIZE = 12;
const ROUND_MS = 30000;
const START_SPAWN_DELAY_MS = 1100;
const MIN_SPAWN_DELAY_MS = 380;
const START_BUG_LIFE_MS = 1300;
const MIN_BUG_LIFE_MS = 650;
const SQUASH_FLASH_MS = 180;

interface Bug {
  id: number;
  cell: number;
  squashed: boolean;
}

function BugIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-9 h-9 sm:w-10 sm:h-10" aria-hidden="true">
      <ellipse cx="20" cy="22" rx="9" ry="11" fill="#1ed760" />
      <circle cx="20" cy="10" r="5" fill="#1ed760" />
      <line x1="20" y1="12" x2="14" y2="6" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="12" x2="26" y2="6" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="16" x2="4" y2="13" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="22" x2="3" y2="22" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="28" x2="4" y2="31" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="16" x2="36" y2="13" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="22" x2="37" y2="22" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="28" x2="36" y2="31" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="14" x2="20" y2="30" stroke="#0a3d1f" strokeWidth="1" />
    </svg>
  );
}

export default function BugSquashGame() {
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [bugs, setBugs] = useState<Bug[]>([]);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bugTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const squashTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const endAtRef = useRef(0);
  const nextIdRef = useRef(0);
  const occupiedRef = useRef<Set<number>>(new Set());

  const clearBugTimeout = useCallback((id: number) => {
    const t = bugTimeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      bugTimeoutsRef.current.delete(id);
    }
  }, []);

  const clearSquashTimeout = useCallback((id: number) => {
    const t = squashTimeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      squashTimeoutsRef.current.delete(id);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    bugTimeoutsRef.current.forEach((t) => clearTimeout(t));
    bugTimeoutsRef.current.clear();
    squashTimeoutsRef.current.forEach((t) => clearTimeout(t));
    squashTimeoutsRef.current.clear();
    occupiedRef.current.clear();
  }, []);

  const removeBug = useCallback(
    (id: number) => {
      clearBugTimeout(id);
      clearSquashTimeout(id);
      setBugs((prev) => {
        const found = prev.find((b) => b.id === id);
        if (found) occupiedRef.current.delete(found.cell);
        return prev.filter((b) => b.id !== id);
      });
    },
    [clearBugTimeout, clearSquashTimeout]
  );

  const elapsedRatio = useCallback(() => {
    const elapsed = ROUND_MS - Math.max(0, endAtRef.current - Date.now());
    return Math.min(1, Math.max(0, elapsed / ROUND_MS));
  }, []);

  const scheduleSpawnRef = useRef<() => void>(() => {});

  useEffect(() => {
    scheduleSpawnRef.current = () => {
      const ratio = elapsedRatio();
      const delay = Math.max(
        MIN_SPAWN_DELAY_MS,
        START_SPAWN_DELAY_MS - ratio * (START_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS)
      );
      spawnTimeoutRef.current = setTimeout(() => {
        const freeCells: number[] = [];
        for (let i = 0; i < GRID_SIZE; i++) {
          if (!occupiedRef.current.has(i)) freeCells.push(i);
        }
        if (freeCells.length === 0) {
          scheduleSpawnRef.current();
          return;
        }
        const cell = freeCells[Math.floor(Math.random() * freeCells.length)] as number;
        const id = nextIdRef.current++;
        occupiedRef.current.add(cell);
        setBugs((prev) => [...prev, { id, cell, squashed: false }]);

        const lifeRatio = elapsedRatio();
        const life = Math.max(
          MIN_BUG_LIFE_MS,
          START_BUG_LIFE_MS - lifeRatio * (START_BUG_LIFE_MS - MIN_BUG_LIFE_MS)
        );
        bugTimeoutsRef.current.set(
          id,
          setTimeout(() => {
            removeBug(id);
          }, life)
        );

        scheduleSpawnRef.current();
      }, delay);
    };
  }, [elapsedRatio, removeBug]);

  const scheduleSpawn = useCallback(() => {
    scheduleSpawnRef.current();
  }, []);

  const endGame = useCallback(() => {
    clearAllTimers();
    setBugs([]);
    setStatus("over");
    setBest((b) => Math.max(b, score));
  }, [clearAllTimers, score]);

  const start = useCallback(() => {
    clearAllTimers();
    setScore(0);
    setBugs([]);
    setTimeLeft(ROUND_MS);
    endAtRef.current = Date.now() + ROUND_MS;
    setStatus("playing");
    scheduleSpawn();
    tickRef.current = setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        endGame();
      }
    }, 100);
  }, [clearAllTimers, scheduleSpawn, endGame]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const squash = useCallback(
    (bug: Bug) => {
      if (status !== "playing" || bug.squashed) return;
      clearBugTimeout(bug.id);
      setScore((s) => s + 1);
      setBugs((prev) =>
        prev.map((b) => (b.id === bug.id ? { ...b, squashed: true } : b))
      );
      squashTimeoutsRef.current.set(
        bug.id,
        setTimeout(() => {
          removeBug(bug.id);
        }, SQUASH_FLASH_MS)
      );
    },
    [status, clearBugTimeout, removeBug]
  );

  const seconds = Math.ceil(timeLeft / 1000);
  const cells = Array.from({ length: GRID_SIZE }, (_, i) => i);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Bug Squash</div>
          <div className="text-[12px] text-glance-muted">
            Click the bugs before they scurry away.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Time</div>
            <div className="text-[18px] font-bold text-glance-primary tabular-nums">{seconds}s</div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[340px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden p-3">
        {status === "playing" && (
          <div className="grid grid-cols-4 grid-rows-3 gap-2 w-full h-full">
            {cells.map((cell) => {
              const bug = bugs.find((b) => b.cell === cell);
              return (
                <button
                  key={cell}
                  type="button"
                  onClick={() => bug && squash(bug)}
                  aria-label={bug ? "Squash bug" : "Empty hole"}
                  disabled={!bug || bug.squashed}
                  className="relative rounded-[12px] border border-white/10 bg-[#15151f] flex items-center justify-center overflow-hidden cursor-default"
                  style={{ cursor: bug && !bug.squashed ? "pointer" : "default" }}
                >
                  <span
                    className="absolute inset-x-2 bottom-1 h-2 rounded-full bg-black/50"
                    aria-hidden="true"
                  />
                  {bug && (
                    <span
                      className="transition-all duration-150"
                      style={{
                        transform: bug.squashed ? "scale(0.3) rotate(20deg)" : "scale(1)",
                        opacity: bug.squashed ? 0 : 1,
                      }}
                    >
                      <BugIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {status === "over" ? (
              <>
                <div className="text-[15px] font-bold text-glance-primary">Time&apos;s up</div>
                <div className="text-[13px] text-glance-muted">
                  Final score: <span className="text-[var(--accent)] font-bold">{score}</span>
                  {best > 0 ? (
                    <span className="text-glance-faint"> (best {best})</span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-[15px] font-bold text-glance-primary">
                {best > 0 ? `Last best: ${best}` : "Ready?"}
              </div>
            )}
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              {status === "over" ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
