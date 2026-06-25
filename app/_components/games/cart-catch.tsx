"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "over";
type ItemKind = "product" | "bomb";

type FallingItem = {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  speed: number;
  variant: number;
};

const LIVES_START = 3;
const CART_WIDTH = 64;
const CART_HEIGHT = 28;
const ITEM_SIZE = 26;
const CART_MOVE_SPEED = 0.42;
const BOMB_COLOR = "#ff5f57";

let nextId = 1;

/**
 * "Cart Catch" — a shopping cart slides left/right along the bottom of the
 * playfield. Products fall from the top for +1 each; red bombs cost a life.
 * Fall speed and spawn rate ramp up the longer the run continues.
 */
export default function CartCatchGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_START);
  const [best, setBest] = useState(0);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [cartX, setCartX] = useState(0);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const fieldSizeRef = useRef({ width: 320, height: 360 });
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const spawnAccRef = useRef(0);
  const startedAtRef = useRef(0);
  const livesRef = useRef(LIVES_START);
  const scoreRef = useRef(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const cartXRef = useRef(0);
  const moveDirRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");

  const endRun = useCallback(() => {
    setPhase("over");
    phaseRef.current = "over";
    setBest((b) => Math.max(b, scoreRef.current));
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    nextId = 1;
    itemsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = LIVES_START;
    moveDirRef.current = 0;
    const { width } = fieldSizeRef.current;
    cartXRef.current = Math.max(0, (width - CART_WIDTH) / 2);
    setItems([]);
    setScore(0);
    setLives(LIVES_START);
    setCartX(cartXRef.current);
    const now = performance.now();
    startedAtRef.current = now;
    lastTickRef.current = now;
    spawnAccRef.current = 0;
    setPhase("playing");
    phaseRef.current = "playing";
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
      const progress = Math.min(1, elapsed / 45000);
      const dt = Math.min(64, now - lastTickRef.current);
      lastTickRef.current = now;

      const { width, height } = fieldSizeRef.current;

      if (moveDirRef.current !== 0) {
        const next = cartXRef.current + moveDirRef.current * CART_MOVE_SPEED * dt;
        cartXRef.current = Math.max(0, Math.min(width - CART_WIDTH, next));
        setCartX(cartXRef.current);
      }

      const spawnIntervalMs = 850 - progress * 550;
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= spawnIntervalMs) {
        spawnAccRef.current = 0;
        const kind: ItemKind = Math.random() < 0.78 ? "product" : "bomb";
        const speed = (70 + progress * 130 + Math.random() * 35) / 1000;
        const maxX = Math.max(0, width - ITEM_SIZE);
        const item: FallingItem = {
          id: nextId++,
          kind,
          x: Math.random() * maxX,
          y: -ITEM_SIZE,
          speed,
          variant: Math.floor(Math.random() * 3),
        };
        itemsRef.current = [...itemsRef.current, item];
      }

      const cartTop = height - CART_HEIGHT - 6;
      const cartLeft = cartXRef.current;
      const cartRight = cartLeft + CART_WIDTH;

      const survivors: FallingItem[] = [];
      for (const it of itemsRef.current) {
        const newY = it.y + it.speed * dt;
        const itemBottom = newY + ITEM_SIZE;
        const itemCenterX = it.x + ITEM_SIZE / 2;

        if (itemBottom >= cartTop && newY <= cartTop + CART_HEIGHT && itemCenterX >= cartLeft && itemCenterX <= cartRight) {
          if (it.kind === "product") {
            scoreRef.current += 1;
            setScore(scoreRef.current);
          } else {
            livesRef.current -= 1;
            setLives(livesRef.current);
          }
          continue;
        }

        if (newY < height + ITEM_SIZE) {
          survivors.push({ ...it, y: newY });
        }
      }
      itemsRef.current = survivors;
      setItems(survivors);

      if (livesRef.current <= 0) {
        endRun();
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
  }, [phase, endRun]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveDirRef.current = -1;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveDirRef.current = 1;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && moveDirRef.current === -1) {
        moveDirRef.current = 0;
      } else if (e.key === "ArrowRight" && moveDirRef.current === 1) {
        moveDirRef.current = 0;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const setMoveDir = (dir: -1 | 0 | 1) => {
    moveDirRef.current = dir;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Cart Catch</div>
          <div className="text-[12px] text-glance-muted">
            Move with arrow keys or buttons. Catch products, dodge bombs.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Lives</div>
            <div className="text-[18px] font-bold tabular-nums" style={{ color: BOMB_COLOR }}>
              {lives}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={fieldRef}
        className="relative w-full h-[340px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden"
      >
        {phase === "playing" &&
          items.map((item) =>
            item.kind === "product" ? (
              <div
                key={item.id}
                className="absolute flex items-center justify-center rounded-[8px] border bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]"
                style={{ left: item.x, top: item.y, width: ITEM_SIZE, height: ITEM_SIZE }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {item.variant === 0 ? (
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  ) : item.variant === 1 ? (
                    <circle cx="12" cy="12" r="8" />
                  ) : (
                    <path d="M12 3l9 18H3z" />
                  )}
                </svg>
              </div>
            ) : (
              <div
                key={item.id}
                className="absolute flex items-center justify-center rounded-full border"
                style={{
                  left: item.x,
                  top: item.y,
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  backgroundColor: "rgba(255,95,87,0.18)",
                  borderColor: BOMB_COLOR,
                  color: BOMB_COLOR,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="14" r="7" />
                  <path d="M12 7V3M9 3h6" />
                </svg>
              </div>
            )
          )}

        {phase === "playing" && (
          <div
            className="absolute flex items-center justify-center rounded-[8px] border bg-glance-surface border-white/10"
            style={{
              left: cartX,
              bottom: 6,
              width: CART_WIDTH,
              height: CART_HEIGHT,
            }}
          >
            <svg width="36" height="20" viewBox="0 0 36 20" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M2 2h3l3 12h18l3-9H9" />
              <circle cx="11" cy="17" r="1.6" fill="var(--accent)" />
              <circle cx="22" cy="17" r="1.6" fill="var(--accent)" />
            </svg>
          </div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {phase === "over" ? (
              <>
                <div className="text-[15px] font-bold text-glance-primary">Final score: {score}</div>
                {best > 0 && <div className="text-[12px] text-glance-muted">Best: {best}</div>}
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

      <div className="flex items-center justify-center gap-3 mt-3">
        <button
          type="button"
          disabled={phase !== "playing"}
          onPointerDown={() => setMoveDir(-1)}
          onPointerUp={() => setMoveDir(0)}
          onPointerLeave={() => setMoveDir(0)}
          className="px-6 py-2.5 rounded-[11px] border border-glance-border bg-glance-surface text-glance-primary text-sm font-semibold cursor-pointer select-none transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline-block mr-1.5 -mt-0.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Left
        </button>
        <button
          type="button"
          disabled={phase !== "playing"}
          onPointerDown={() => setMoveDir(1)}
          onPointerUp={() => setMoveDir(0)}
          onPointerLeave={() => setMoveDir(0)}
          className="px-6 py-2.5 rounded-[11px] border border-glance-border bg-glance-surface text-glance-primary text-sm font-semibold cursor-pointer select-none transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
        >
          Right
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline-block ml-1.5 -mt-0.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
