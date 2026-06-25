"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ROUND_MS = 30000;
const LIVES_START = 3;
const CARD_WIDTH = 92;
const CARD_HEIGHT = 40;

type CardKind = "invite" | "reject";

type FallingCard = {
  id: number;
  kind: CardKind;
  x: number;
  y: number;
  speed: number;
};

type Phase = "idle" | "playing" | "over";

let nextId = 1;

/**
 * "Inbox Dash" — invite cards fall from the top of the playfield and must be
 * clicked for points, while reject cards must be avoided or they cost a life.
 * Spawn rate and fall speed ramp up over the 30-second round.
 */
export default function JobApplicationSprintGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_START);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [best, setBest] = useState(0);
  const [cards, setCards] = useState<FallingCard[]>([]);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const fieldSizeRef = useRef({ width: 320, height: 360 });
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const spawnAccRef = useRef(0);
  const endAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const livesRef = useRef(LIVES_START);
  const scoreRef = useRef(0);
  const cardsRef = useRef<FallingCard[]>([]);

  const endRound = useCallback(() => {
    setPhase("over");
    setBest((b) => Math.max(b, scoreRef.current));
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const removeCard = useCallback((id: number) => {
    cardsRef.current = cardsRef.current.filter((c) => c.id !== id);
    setCards(cardsRef.current);
  }, []);

  const hitCard = useCallback(
    (card: FallingCard) => {
      if (phase !== "playing") return;
      removeCard(card.id);
      if (card.kind === "invite") {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      } else {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          endRound();
        }
      }
    },
    [phase, removeCard, endRound]
  );

  const start = useCallback(() => {
    nextId = 1;
    cardsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = LIVES_START;
    setCards([]);
    setScore(0);
    setLives(LIVES_START);
    setTimeLeft(ROUND_MS);
    const now = performance.now();
    startedAtRef.current = now;
    endAtRef.current = now + ROUND_MS;
    lastTickRef.current = now;
    spawnAccRef.current = 0;
    setPhase("playing");
  }, []);

  useEffect(() => {
    const measure = () => {
      const el = fieldRef.current;
      if (el) {
        fieldSizeRef.current = { width: el.clientWidth, height: el.clientHeight };
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const tick = (now: number) => {
      const elapsed = now - startedAtRef.current;
      const progress = Math.min(1, elapsed / ROUND_MS);
      const dt = Math.min(64, now - lastTickRef.current);
      lastTickRef.current = now;

      const remaining = Math.max(0, endAtRef.current - now);
      setTimeLeft(remaining);

      const { width, height } = fieldSizeRef.current;

      const spawnIntervalMs = 900 - progress * 600;
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= spawnIntervalMs && remaining > 0) {
        spawnAccRef.current = 0;
        const kind: CardKind = Math.random() < 0.62 ? "invite" : "reject";
        const speed = (60 + progress * 110 + Math.random() * 30) / 1000;
        const maxX = Math.max(0, width - CARD_WIDTH);
        const card: FallingCard = {
          id: nextId++,
          kind,
          x: Math.random() * maxX,
          y: -CARD_HEIGHT,
          speed,
        };
        cardsRef.current = [...cardsRef.current, card];
      }

      cardsRef.current = cardsRef.current
        .map((c) => ({ ...c, y: c.y + c.speed * dt }))
        .filter((c) => c.y < height + CARD_HEIGHT);
      setCards(cardsRef.current);

      if (remaining <= 0) {
        endRound();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, endRound]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const seconds = Math.ceil(timeLeft / 1000);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Inbox Dash</div>
          <div className="text-[12px] text-glance-muted">
            Click INVITE cards, avoid REJECT cards. 3 lives.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Lives</div>
            <div className="text-[18px] font-bold tabular-nums" style={{ color: "#ff5f57" }}>
              {lives}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Time</div>
            <div className="text-[18px] font-bold text-glance-primary tabular-nums">{seconds}s</div>
          </div>
        </div>
      </div>

      <div
        ref={fieldRef}
        className="relative w-full h-[360px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden"
      >
        {phase === "playing" &&
          cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => hitCard(card)}
              className={
                card.kind === "invite"
                  ? "absolute flex items-center justify-center rounded-[10px] border text-[11px] font-bold uppercase tracking-[0.5px] cursor-pointer select-none bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/30"
                  : "absolute flex items-center justify-center rounded-[10px] border text-[11px] font-bold uppercase tracking-[0.5px] cursor-pointer select-none"
              }
              style={{
                left: card.x,
                top: card.y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                ...(card.kind === "reject"
                  ? {
                      backgroundColor: "rgba(255,95,87,0.18)",
                      borderColor: "#ff5f57",
                      color: "#ff5f57",
                    }
                  : undefined),
              }}
            >
              {card.kind === "invite" ? "Invite" : "Reject"}
            </button>
          ))}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {phase === "over" ? (
              <>
                <div className="text-[15px] font-bold text-glance-primary">
                  Final score: {score}
                </div>
                {best > 0 && (
                  <div className="text-[12px] text-glance-muted">Best: {best}</div>
                )}
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
              {phase === "over" ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
