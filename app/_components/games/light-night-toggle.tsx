"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "day" | "night";
type Status = "idle" | "playing" | "over";

const START_INTERVAL_MS = 1800;
const MIN_INTERVAL_MS = 650;
const INTERVAL_STEP_MS = 60;
const START_LIVES = 3;

function randomPhase(exclude?: Phase): Phase {
  const phases: Phase[] = ["day", "night"];
  const pool = exclude ? phases.filter((p) => p !== exclude) : phases;
  return pool[Math.floor(Math.random() * pool.length)] ?? "day";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-20 h-20 sm:w-24 sm:h-24" aria-hidden="true">
      <circle cx="32" cy="32" r="13" fill="#febc2e" />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 32 + Math.cos(angle) * 19;
        const y1 = 32 + Math.sin(angle) * 19;
        const x2 = 32 + Math.cos(angle) * 27;
        const y2 = 32 + Math.sin(angle) * 27;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#febc2e"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-20 h-20 sm:w-24 sm:h-24" aria-hidden="true">
      <path
        d="M40 8c-12.7 0-23 10.3-23 23s10.3 23 23 23c5.6 0 10.7-2 14.7-5.3-2-0.5-3.9-1.2-5.7-2.2-9.6-5.2-15.5-15.5-15-26.4 0.3-6.5 2.6-12.2 6.3-16.6-0.1 0-0.2 0-0.3 0z"
        fill="#00d4ff"
      />
      <circle cx="24" cy="20" r="2" fill="#00d4ff" opacity={0.5} />
      <circle cx="18" cy="32" r="1.4" fill="#00d4ff" opacity={0.4} />
      <circle cx="14" cy="22" r="1" fill="#00d4ff" opacity={0.35} />
    </svg>
  );
}

export default function LightNightToggleGame() {
  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState<Phase>("day");
  const [target, setTarget] = useState<Phase>("night");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [flipping, setFlipping] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalMsRef = useRef(START_INTERVAL_MS);
  const phaseRef = useRef<Phase>("day");
  const lockedRef = useRef(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    if (flipTimeoutRef.current) {
      clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = null;
    }
    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
  }, []);

  const scheduleFlip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setFlipping(true);
      flipTimeoutRef.current = setTimeout(() => {
        const next = randomPhase(phaseRef.current);
        phaseRef.current = next;
        setPhase(next);
        setFlipping(false);
      }, 160);
    }, intervalMsRef.current);
  }, []);

  const start = useCallback(() => {
    clearTimers();
    lockedRef.current = false;
    intervalMsRef.current = START_INTERVAL_MS;
    const initialPhase = randomPhase();
    phaseRef.current = initialPhase;
    setPhase(initialPhase);
    setTarget(randomPhase());
    setScore(0);
    setLives(START_LIVES);
    setFlash(null);
    setFlipping(false);
    setStatus("playing");
    scheduleFlip();
  }, [clearTimers, scheduleFlip]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const endGame = useCallback(() => {
    clearTimers();
    setStatus("over");
    setBest((b) => Math.max(b, score));
  }, [clearTimers, score]);

  const showFlash = useCallback((kind: "hit" | "miss") => {
    setFlash(kind);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlash(null), 220);
  }, []);

  const handleTap = useCallback(() => {
    if (status !== "playing" || lockedRef.current) return;
    if (phaseRef.current === target) {
      lockedRef.current = true;
      showFlash("hit");
      setScore((s) => s + 1);
      setTarget((prevTarget) => randomPhase(prevTarget));
      intervalMsRef.current = Math.max(
        MIN_INTERVAL_MS,
        intervalMsRef.current - INTERVAL_STEP_MS
      );
      scheduleFlip();
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = setTimeout(() => {
        lockedRef.current = false;
      }, 120);
    } else {
      showFlash("miss");
      setLives((l) => {
        const remaining = l - 1;
        if (remaining <= 0) {
          if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
          gameOverTimeoutRef.current = setTimeout(() => endGame(), 180);
        }
        return remaining;
      });
    }
  }, [status, target, showFlash, scheduleFlip, endGame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (status !== "playing") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, handleTap]);

  const targetLabel = target === "day" ? "DAY" : "NIGHT";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Day / Night</div>
          <div className="text-[12px] text-glance-muted">
            Tap the tile only when it matches the target. Wrong taps cost a life.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Lives</div>
            <div className="flex items-center gap-1 justify-end">
              {Array.from({ length: START_LIVES }, (_, i) => (
                <span
                  key={i}
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: i < lives ? "#ff5f57" : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[340px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden flex flex-col items-center justify-center gap-5">
        {status === "playing" && (
          <>
            <div className="text-[12px] uppercase tracking-[1px] text-glance-muted">
              Tap on:{" "}
              <span className="font-bold text-[var(--accent)]">{targetLabel}</span>
            </div>

            <button
              type="button"
              onClick={handleTap}
              aria-label="Tile"
              className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-[14px] border flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95"
              style={{
                backgroundColor: phase === "day" ? "#1c1c2a" : "#0a0a12",
                borderColor:
                  flash === "hit"
                    ? "#1ed760"
                    : flash === "miss"
                      ? "#ff5f57"
                      : "rgba(255,255,255,0.1)",
                boxShadow:
                  flash === "hit"
                    ? "0 0 0 3px rgba(30,215,96,0.35)"
                    : flash === "miss"
                      ? "0 0 0 3px rgba(255,95,87,0.35)"
                      : "none",
                transform: flipping ? "scaleX(0.05)" : "scaleX(1)",
                transition: "transform 160ms ease, box-shadow 150ms ease, border-color 150ms ease",
              }}
            >
              {!flipping && (phase === "day" ? <SunIcon /> : <MoonIcon />)}
            </button>

            <div className="text-[11px] text-glance-faint">Space / Enter also works</div>
          </>
        )}

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {status === "over" ? (
              <>
                <div className="text-[15px] font-bold text-glance-primary">Game over</div>
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
