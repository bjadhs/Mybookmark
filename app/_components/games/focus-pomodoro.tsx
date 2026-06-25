"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const START_METER = 60;
const MAX_METER = 100;
const BASE_DRAIN_PER_SEC = 4.5;
const DRAIN_RAMP_PER_SEC = 0.06;
const DISTRACTION_DRAIN_MULT = 2.4;
const FOCUS_CLICK_GAIN = 9;
const DISTRACTION_BASE_INTERVAL_MS = 4200;
const DISTRACTION_RAMP_MS = 38;
const DISTRACTION_MIN_INTERVAL_MS = 1400;
const DISTRACTION_LIFETIME_MS = 3200;

type Phase = "idle" | "playing" | "over";

type DistractionState = {
  id: number;
  x: number;
  y: number;
};

let nextDistractionId = 1;

/**
 * "Deep Focus" — keep the FOCUS meter topped up by clicking the Focus button
 * while it continuously drains. A red Distraction button periodically appears
 * and accelerates the drain until dismissed. Survive as long as possible;
 * both base drain and distraction frequency ramp up over time.
 */
export default function FocusPomodoroGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [meter, setMeter] = useState(START_METER);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [best, setBest] = useState(0);
  const [distraction, setDistraction] = useState<DistractionState | null>(null);
  const [focusPulse, setFocusPulse] = useState(0);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const fieldSizeRef = useRef({ width: 320, height: 280 });
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const nextDistractionAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const meterRef = useRef(START_METER);
  const distractionRef = useRef<DistractionState | null>(null);

  const spawnDistraction = useCallback(() => {
    const { width, height } = fieldSizeRef.current;
    const padX = 56;
    const padY = 40;
    const x = padX + Math.random() * Math.max(1, width - padX * 2);
    const y = padY + Math.random() * Math.max(1, height - padY * 2);
    const d: DistractionState = { id: nextDistractionId++, x, y };
    distractionRef.current = d;
    setDistraction(d);
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setMeter(START_METER);
    meterRef.current = START_METER;
    setElapsedMs(0);
    elapsedRef.current = 0;
    setDistraction(null);
    distractionRef.current = null;
    setFocusPulse(0);
    lastTickRef.current = performance.now();
    nextDistractionAtRef.current = DISTRACTION_BASE_INTERVAL_MS;
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const tick = (now: number) => {
      const dt = Math.min(0.12, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      const elapsedSec = elapsedRef.current + dt;
      elapsedRef.current = elapsedSec;

      const rampedDrain = BASE_DRAIN_PER_SEC + elapsedSec * DRAIN_RAMP_PER_SEC;
      const drainMult = distractionRef.current ? DISTRACTION_DRAIN_MULT : 1;
      const nextMeter = Math.max(0, meterRef.current - rampedDrain * drainMult * dt);
      meterRef.current = nextMeter;

      const elapsedMsNow = elapsedSec * 1000;
      if (
        !distractionRef.current &&
        elapsedMsNow >= nextDistractionAtRef.current
      ) {
        spawnDistraction();
        const ramped =
          DISTRACTION_BASE_INTERVAL_MS - elapsedSec * DISTRACTION_RAMP_MS;
        const interval = Math.max(DISTRACTION_MIN_INTERVAL_MS, ramped);
        nextDistractionAtRef.current = elapsedMsNow + interval;
      }

      setMeter(nextMeter);
      setElapsedMs(elapsedMsNow);

      if (nextMeter <= 0) {
        setPhase("over");
        setBest((b) => Math.max(b, elapsedSec));
        setDistraction(null);
        distractionRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase, spawnDistraction]);

  // Auto-clear a stale distraction if left unclicked too long.
  useEffect(() => {
    if (phase !== "playing" || !distraction) return;
    const t = setTimeout(() => {
      if (distractionRef.current?.id === distraction.id) {
        distractionRef.current = null;
        setDistraction(null);
      }
    }, DISTRACTION_LIFETIME_MS);
    return () => clearTimeout(t);
  }, [phase, distraction]);

  useEffect(() => {
    const measure = () => {
      if (fieldRef.current) {
        fieldSizeRef.current = {
          width: fieldRef.current.clientWidth,
          height: fieldRef.current.clientHeight,
        };
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleFocusClick = useCallback(() => {
    if (phase !== "playing") return;
    meterRef.current = Math.min(MAX_METER, meterRef.current + FOCUS_CLICK_GAIN);
    setMeter(meterRef.current);
    setFocusPulse((p) => p + 1);
  }, [phase]);

  const handleDistractionClick = useCallback(() => {
    if (phase !== "playing") return;
    distractionRef.current = null;
    setDistraction(null);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFocusClick();
      } else if (e.key === "d" || e.key === "D") {
        if (distractionRef.current) {
          e.preventDefault();
          handleDistractionClick();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleFocusClick, handleDistractionClick]);

  const seconds = (elapsedMs / 1000).toFixed(1);
  const meterPct = Math.max(0, Math.min(100, meter));
  const meterColor =
    meterPct > 50 ? "var(--accent)" : meterPct > 20 ? "#febc2e" : "#ff5f57";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Deep Focus</div>
          <div className="text-[12px] text-glance-muted">
            Click Focus to refill the meter; dismiss red Distractions fast.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">
              Survived
            </div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">
              {seconds}s
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Best</div>
            <div className="text-[18px] font-bold text-glance-primary tabular-nums">
              {best > 0 ? `${best.toFixed(1)}s` : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="h-3 w-full rounded-full bg-white/5 border border-glance-border overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${meterPct}%`,
              backgroundColor: meterColor,
              boxShadow: `0 0 12px -1px ${meterColor}`,
            }}
          />
        </div>
      </div>

      <div
        ref={fieldRef}
        className="relative w-full h-[280px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden"
      >
        {phase === "playing" ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={handleFocusClick}
                key={focusPulse}
                aria-label="Focus"
                className="w-28 h-28 rounded-full bg-[var(--accent)] text-white text-base font-bold cursor-pointer transition-transform hover:brightness-110 active:scale-95 shadow-[0_0_28px_-4px_var(--accent)]"
              >
                Focus
              </button>
            </div>
            {distraction ? (
              <button
                type="button"
                onClick={handleDistractionClick}
                aria-label="Dismiss distraction"
                className="absolute w-16 h-16 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer text-white text-[11px] font-bold transition-transform hover:brightness-110 active:scale-95"
                style={{
                  left: `${distraction.x}px`,
                  top: `${distraction.y}px`,
                  backgroundColor: "#ff5f57",
                  boxShadow: "0 0 20px -2px #ff5f57",
                }}
              >
                Distraction
              </button>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {phase === "over" ? (
              <>
                <div className="text-[15px] font-bold text-glance-primary">
                  Focus lost at {seconds}s
                </div>
                <div className="text-[12px] text-glance-muted">
                  {best > 0 ? `Best: ${best.toFixed(1)}s` : ""}
                </div>
              </>
            ) : (
              <div className="text-[15px] font-bold text-glance-primary">Ready to focus?</div>
            )}
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              {phase === "over" ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
