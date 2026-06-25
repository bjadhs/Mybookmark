"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ROUND_MS = 15000;

/**
 * Fallback mini-game for projects without a bespoke one: "Accent Rush" — tap the
 * glowing accent target as many times as you can before the timer runs out. Each
 * hit relocates the target and bumps the score.
 */
export default function DefaultClickerGame() {
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const endAt = useRef(0);

  const move = useCallback(() => {
    setPos({ x: 8 + Math.random() * 84, y: 12 + Math.random() * 76 });
  }, []);

  const start = useCallback(() => {
    setScore(0);
    setTimeLeft(ROUND_MS);
    endAt.current = Date.now() + ROUND_MS;
    setPlaying(true);
    move();
  }, [move]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const left = Math.max(0, endAt.current - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        setPlaying(false);
        setBest((b) => Math.max(b, score));
      }
    }, 100);
    return () => clearInterval(t);
  }, [playing, score]);

  const hit = () => {
    setScore((s) => s + 1);
    move();
  };

  const seconds = (timeLeft / 1000).toFixed(1);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Accent Rush</div>
          <div className="text-[12px] text-glance-muted">
            Tap the glowing target before time runs out.
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

      <div className="relative w-full h-[340px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden">
        {playing ? (
          <button
            type="button"
            onClick={hit}
            aria-label="Hit target"
            className="absolute w-12 h-12 rounded-full bg-[var(--accent)] shadow-[0_0_24px_-2px_var(--accent)] -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 hover:brightness-110 active:scale-95"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-[15px] font-bold text-glance-primary">
              {best > 0 ? `Last best: ${best}` : "Ready?"}
            </div>
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              {best > 0 ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
