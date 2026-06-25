"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PAD_COUNT = 4;
const FLASH_ON_MS = 420;
const FLASH_GAP_MS = 220;
const START_DELAY_MS = 600;
const WRONG_FLASH_MS = 450;

type Phase = "idle" | "showing" | "input" | "wrong" | "over";

const PAD_LABELS = ["A", "B", "C", "D"];

/**
 * "Pattern Memory" — a Simon-style sequence game with four pads arranged in a
 * 2x2 grid. Each round the sequence grows by one step; the player must repeat
 * it back in order. A wrong click ends the run. Score = level reached.
 */
export default function MemoryMatchGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [wrongPad, setWrongPad] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [sequenceLength, setSequenceLength] = useState(0);

  const sequenceRef = useRef<number[]>([]);
  const inputIndexRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback(
    (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timeoutsRef.current.push(t);
      return t;
    },
    []
  );

  const playSequence = useCallback(
    (sequence: number[]) => {
      setPhase("showing");
      setProgress(0);
      setSequenceLength(sequence.length);
      inputIndexRef.current = 0;
      let cursor = START_DELAY_MS;
      sequence.forEach((padIndex) => {
        scheduleTimeout(() => {
          setActivePad(padIndex);
        }, cursor);
        scheduleTimeout(() => {
          setActivePad(null);
        }, cursor + FLASH_ON_MS);
        cursor += FLASH_ON_MS + FLASH_GAP_MS;
      });
      scheduleTimeout(() => {
        setPhase("input");
      }, cursor);
    },
    [scheduleTimeout]
  );

  const nextRound = useCallback(
    (sequence: number[]) => {
      setLevel(sequence.length);
      playSequence(sequence);
    },
    [playSequence]
  );

  const start = useCallback(() => {
    clearTimeouts();
    const first = Math.floor(Math.random() * PAD_COUNT);
    sequenceRef.current = [first];
    setWrongPad(null);
    setProgress(0);
    nextRound(sequenceRef.current);
  }, [clearTimeouts, nextRound]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  const handlePadClick = useCallback(
    (padIndex: number) => {
      if (phase !== "input") return;
      const expected = sequenceRef.current[inputIndexRef.current];
      if (padIndex !== expected) {
        setWrongPad(padIndex);
        setPhase("wrong");
        scheduleTimeout(() => {
          setBest((b) => Math.max(b, sequenceRef.current.length - 1));
          setPhase("over");
        }, WRONG_FLASH_MS);
        return;
      }

      setActivePad(padIndex);
      scheduleTimeout(() => setActivePad(null), 180);

      inputIndexRef.current += 1;
      setProgress(inputIndexRef.current);

      if (inputIndexRef.current >= sequenceRef.current.length) {
        const grown = [
          ...sequenceRef.current,
          Math.floor(Math.random() * PAD_COUNT),
        ];
        sequenceRef.current = grown;
        scheduleTimeout(() => nextRound(grown), 500);
      }
    },
    [phase, nextRound, scheduleTimeout]
  );

  useEffect(() => {
    if (phase !== "input") return;
    const onKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        ArrowUp: 0,
        ArrowRight: 1,
        ArrowLeft: 2,
        ArrowDown: 3,
      };
      const padIndex = keyMap[e.key];
      if (padIndex !== undefined) {
        e.preventDefault();
        handlePadClick(padIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handlePadClick]);

  const inputLocked = phase === "showing" || phase === "wrong";
  const isPlaying = phase === "showing" || phase === "input" || phase === "wrong";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Pattern Memory</div>
          <div className="text-[12px] text-glance-muted">
            Watch the sequence, then click the pads back in order.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Level</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">
              {level}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Best</div>
            <div className="text-[18px] font-bold text-glance-primary tabular-nums">
              {best > 0 ? best : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[320px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden flex items-center justify-center">
        {isPlaying ? (
          <div className="flex flex-col items-center gap-3">
            <div className="grid grid-cols-2 gap-3 w-[220px] h-[220px]">
              {PAD_LABELS.map((label, padIndex) => {
                const isActive = activePad === padIndex;
                const isWrong = wrongPad === padIndex && phase === "wrong";
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={inputLocked}
                    onClick={() => handlePadClick(padIndex)}
                    aria-label={`Pad ${label}`}
                    className={`rounded-[12px] border text-sm font-bold transition-all duration-100 ${
                      inputLocked ? "cursor-default" : "cursor-pointer"
                    } ${
                      isWrong
                        ? "border-transparent"
                        : isActive
                          ? "border-transparent"
                          : "border-[var(--accent)]/30 bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30"
                    }`}
                    style={
                      isWrong
                        ? {
                            backgroundColor: "#ff5f57",
                            color: "#ffffff",
                            boxShadow: "0 0 24px -2px #ff5f57",
                          }
                        : isActive
                          ? {
                              backgroundColor: "var(--accent)",
                              color: "#ffffff",
                              boxShadow: "0 0 24px -2px var(--accent)",
                            }
                          : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-glance-faint tabular-nums">
              {phase === "showing"
                ? "Watch..."
                : phase === "input"
                  ? `${progress} / ${sequenceLength}`
                  : phase === "wrong"
                    ? "Wrong pad"
                    : ""}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {phase === "over" ? (
              <>
                <div className="text-[15px] font-bold text-glance-primary">
                  Game over — reached level {level}
                </div>
                <div className="text-[12px] text-glance-muted">
                  {best > 0 ? `Best: ${best}` : ""}
                </div>
              </>
            ) : (
              <div className="text-[15px] font-bold text-glance-primary">Ready to memorize?</div>
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
