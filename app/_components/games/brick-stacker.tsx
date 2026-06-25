"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FIELD_WIDTH = 280;
const BLOCK_HEIGHT = 26;
const BASE_WIDTH = 110;
const BASE_SPEED = 1.6;
const SPEED_PER_LEVEL = 0.12;
const MAX_SPEED = 5;
const VISIBLE_LEVELS = 9;

type PlacedBlock = {
  left: number;
  width: number;
};

type MovingBlock = {
  left: number;
  width: number;
  dir: 1 | -1;
};

export default function BrickStackerGame() {
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [stack, setStack] = useState<PlacedBlock[]>([]);
  const [moving, setMoving] = useState<MovingBlock | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const stackRef = useRef<PlacedBlock[]>([]);
  const movingRef = useRef<MovingBlock | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);
  useEffect(() => {
    movingRef.current = moving;
  }, [moving]);

  const spawnBlock = useCallback((level: number, width: number) => {
    const speed = Math.min(MAX_SPEED, BASE_SPEED + level * SPEED_PER_LEVEL);
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const startLeft = dir === 1 ? 0 : FIELD_WIDTH - width;
    return { block: { left: startLeft, width, dir }, speed };
  }, []);

  const speedRef = useRef(BASE_SPEED);

  const start = useCallback(() => {
    setScore(0);
    setGameOver(false);
    setStack([]);
    const { block, speed } = spawnBlock(0, BASE_WIDTH);
    speedRef.current = speed;
    setMoving(block);
    setStarted(true);
    activeRef.current = true;
    lastTsRef.current = 0;
  }, [spawnBlock]);

  const endGame = useCallback(() => {
    activeRef.current = false;
    setGameOver(true);
    setMoving(null);
    setBest((b) => Math.max(b, stackRef.current.length));
  }, []);

  const drop = useCallback(() => {
    if (!activeRef.current) return;
    const current = movingRef.current;
    if (!current) return;
    const below = stackRef.current[stackRef.current.length - 1];
    const belowLeft = below ? below.left : (FIELD_WIDTH - BASE_WIDTH) / 2;
    const belowWidth = below ? below.width : BASE_WIDTH;

    const overlapLeft = Math.max(current.left, belowLeft);
    const overlapRight = Math.min(current.left + current.width, belowLeft + belowWidth);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 2) {
      endGame();
      return;
    }

    const placed: PlacedBlock = { left: overlapLeft, width: overlapWidth };
    const nextStack = [...stackRef.current, placed];
    setStack(nextStack);
    setScore(nextStack.length);

    const { block, speed } = spawnBlock(nextStack.length, overlapWidth);
    speedRef.current = speed;
    setMoving(block);
  }, [endGame, spawnBlock]);

  // Animation loop
  useEffect(() => {
    if (!started || gameOver) return;

    const tick = (ts: number) => {
      if (!activeRef.current) return;
      if (lastTsRef.current === 0) lastTsRef.current = ts;
      const dt = Math.min(32, ts - lastTsRef.current);
      lastTsRef.current = ts;

      setMoving((prev) => {
        if (!prev) return prev;
        let left = prev.left + prev.dir * speedRef.current * (dt / 16.67);
        let dir = prev.dir;
        const maxLeft = FIELD_WIDTH - prev.width;
        if (left <= 0) {
          left = 0;
          dir = 1;
        } else if (left >= maxLeft) {
          left = maxLeft;
          dir = -1;
        }
        return { ...prev, left, dir };
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [started, gameOver]);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!started || gameOver) {
          start();
        } else {
          drop();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, gameOver, start, drop]);

  const height = stack.length;
  const viewOffset = Math.max(0, height - (VISIBLE_LEVELS - 2)) * BLOCK_HEIGHT;

  const renderLevels = stack.slice(-VISIBLE_LEVELS);
  const renderStartIndex = stack.length - renderLevels.length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Stack</div>
          <div className="text-[12px] text-glance-muted">
            Press Space or click Drop to place the sliding block on the stack.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Best</div>
            <div className="text-[18px] font-bold text-glance-primary tabular-nums">{best}</div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[360px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden">
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2"
          style={{ width: FIELD_WIDTH, height: VISIBLE_LEVELS * BLOCK_HEIGHT + 20 }}
        >
          {/* base platform */}
          <div
            className="absolute bg-white/10 border-t border-white/20"
            style={{
              left: 0,
              right: 0,
              bottom: Math.max(0, -viewOffset),
              height: 6,
            }}
          />

          {/* placed blocks */}
          {renderLevels.map((b, i) => {
            const levelIndex = renderStartIndex + i;
            const bottom = levelIndex * BLOCK_HEIGHT - viewOffset + 6;
            if (bottom < -BLOCK_HEIGHT || bottom > VISIBLE_LEVELS * BLOCK_HEIGHT + 20) return null;
            return (
              <div
                key={levelIndex}
                className="absolute rounded-[4px] bg-[var(--accent)]/80 border border-[var(--accent)]"
                style={{
                  left: b.left,
                  width: b.width,
                  height: BLOCK_HEIGHT - 3,
                  bottom,
                }}
              />
            );
          })}

          {/* moving block */}
          {moving && started && !gameOver && (
            <div
              className="absolute rounded-[4px] bg-[var(--accent)] border border-[var(--accent)] shadow-[0_0_16px_-2px_var(--accent)]"
              style={{
                left: moving.left,
                width: moving.width,
                height: BLOCK_HEIGHT - 3,
                bottom: height * BLOCK_HEIGHT - viewOffset + 6,
              }}
            />
          )}
        </div>

        {started && !gameOver && (
          <button
            type="button"
            onClick={drop}
            className="absolute bottom-3 right-3 px-4 py-2 rounded-[10px] bg-[var(--accent)] text-white text-[13px] font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
          >
            Drop
          </button>
        )}

        {(!started || gameOver) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#0e0e16]/90">
            {gameOver && (
              <div className="text-[16px] font-bold text-glance-primary">
                Game over — height {height}
              </div>
            )}
            {!started && (
              <div className="text-[15px] font-bold text-glance-primary">
                {best > 0 ? `Last best: ${best}` : "Ready to stack?"}
              </div>
            )}
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              {started || best > 0 ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
