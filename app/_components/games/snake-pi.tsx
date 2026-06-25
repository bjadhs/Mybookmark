"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "over";
type Point = { x: number; y: number };
type Dir = { x: number; y: number };

const COLS = 17;
const ROWS = 15;
const TICK_MS = 120;
const MIN_TICK_MS = 70;
const BG_COLOR = "#0e0e16";
const GRID_LINE_COLOR = "rgba(255,255,255,0.04)";
const SNAKE_COLOR = "#00d4ff";
const SNAKE_HEAD_COLOR = "#ffffff";
const FOOD_COLOR_FALLBACK = "#a855f7";

const UP: Dir = { x: 0, y: -1 };
const DOWN: Dir = { x: 0, y: 1 };
const LEFT: Dir = { x: -1, y: 0 };
const RIGHT: Dir = { x: 1, y: 0 };

function startSnake(): Point[] {
  const cy = Math.floor(ROWS / 2);
  const cx = Math.floor(COLS / 2);
  return [
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
    { x: cx - 3, y: cy },
  ];
}

function randomFood(snake: Point[]): Point {
  let candidate: Point;
  do {
    candidate = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === candidate.x && s.y === candidate.y));
  return candidate;
}

/**
 * Classic Snake on a 17x15 grid, rendered to a responsive canvas. Eat food to
 * grow and score; the tick rate gradually quickens as the snake grows longer.
 */
export default function SnakePiGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");

  const snakeRef = useRef<Point[]>(startSnake());
  const dirRef = useRef<Dir>(RIGHT);
  const nextDirRef = useRef<Dir>(RIGHT);
  const foodRef = useRef<Point>({ x: 12, y: 7 });
  const scoreRef = useRef(0);
  const accentRef = useRef<string>(FOOD_COLOR_FALLBACK);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim();
    if (accent) accentRef.current = accent;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    const targetW = Math.round(cssWidth * dpr);
    const targetH = Math.round(cssHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const cell = Math.min(cssWidth / COLS, cssHeight / ROWS);
    const offsetX = (cssWidth - cell * COLS) / 2;
    const offsetY = (cssHeight - cell * ROWS) / 2;

    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      const x = offsetX + c * cell;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + ROWS * cell);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = offsetY + r * cell;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + COLS * cell, y);
      ctx.stroke();
    }

    const food = foodRef.current;
    const pad = cell * 0.18;
    ctx.fillStyle = accentRef.current;
    ctx.beginPath();
    ctx.arc(
      offsetX + food.x * cell + cell / 2,
      offsetY + food.y * cell + cell / 2,
      cell / 2 - pad,
      0,
      Math.PI * 2
    );
    ctx.fill();

    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_COLOR;
      const sx = offsetX + seg.x * cell + 1;
      const sy = offsetY + seg.y * cell + 1;
      const size = cell - 2;
      const r = Math.min(6, size / 3);
      ctx.beginPath();
      ctx.moveTo(sx + r, sy);
      ctx.arcTo(sx + size, sy, sx + size, sy + size, r);
      ctx.arcTo(sx + size, sy + size, sx, sy + size, r);
      ctx.arcTo(sx, sy + size, sx, sy, r);
      ctx.arcTo(sx, sy, sx + size, sy, r);
      ctx.closePath();
      ctx.fill();
    });
  }, []);

  const endRun = useCallback(() => {
    setPhase("over");
    phaseRef.current = "over";
    setBest((b) => Math.max(b, scoreRef.current));
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const step = useCallback(() => {
    dirRef.current = nextDirRef.current;
    const snake = snakeRef.current;
    const head = snake[0];
    const newHead: Point = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endRun();
      return;
    }
    const willEat = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
    const bodyToCheck = willEat ? snake : snake.slice(0, snake.length - 1);
    if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endRun();
      return;
    }

    const newSnake = [newHead, ...snake];
    if (willEat) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      foodRef.current = randomFood(newSnake);
    } else {
      newSnake.pop();
    }
    snakeRef.current = newSnake;
    draw();
  }, [draw, endRun]);

  const start = useCallback(() => {
    snakeRef.current = startSnake();
    dirRef.current = RIGHT;
    nextDirRef.current = RIGHT;
    foodRef.current = randomFood(snakeRef.current);
    scoreRef.current = 0;
    setScore(0);
    lastTickRef.current = 0;
    setPhase("playing");
    phaseRef.current = "playing";
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const loop = (now: number) => {
      const tickMs = Math.max(MIN_TICK_MS, TICK_MS - scoreRef.current * 2);
      if (now - lastTickRef.current >= tickMs) {
        lastTickRef.current = now;
        step();
      }
      if (phaseRef.current === "playing") {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, step]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const setDir = useCallback((dir: Dir) => {
    if (phaseRef.current !== "playing") return;
    const current = dirRef.current;
    if (current.x + dir.x === 0 && current.y + dir.y === 0) return;
    nextDirRef.current = dir;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isArrow = key === "arrowup" || key === "arrowdown" || key === "arrowleft" || key === "arrowright";
      const isWasd = key === "w" || key === "a" || key === "s" || key === "d";
      if (isArrow || key === " ") {
        e.preventDefault();
      }
      if (phaseRef.current !== "playing") return;
      if (!isArrow && !isWasd) return;
      if (key === "arrowup" || key === "w") setDir(UP);
      else if (key === "arrowdown" || key === "s") setDir(DOWN);
      else if (key === "arrowleft" || key === "a") setDir(LEFT);
      else if (key === "arrowright" || key === "d") setDir(RIGHT);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setDir]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Snake</div>
          <div className="text-[12px] text-glance-muted">
            Arrow keys or WASD. Eat food to grow, avoid walls and yourself.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
          <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{score}</div>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="relative w-full rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden"
        style={{ aspectRatio: `${COLS} / ${ROWS}`, maxHeight: 320 }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#0e0e16]/90">
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

      <div className="grid grid-cols-3 gap-1.5 mt-3 w-[150px] mx-auto">
        <div />
        <button
          type="button"
          disabled={phase !== "playing"}
          onClick={() => setDir(UP)}
          aria-label="Up"
          className="flex items-center justify-center py-2 rounded-[10px] border border-glance-border bg-glance-surface text-glance-primary cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
        <div />

        <button
          type="button"
          disabled={phase !== "playing"}
          onClick={() => setDir(LEFT)}
          aria-label="Left"
          className="flex items-center justify-center py-2 rounded-[10px] border border-glance-border bg-glance-surface text-glance-primary cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={phase !== "playing"}
          onClick={() => setDir(DOWN)}
          aria-label="Down"
          className="flex items-center justify-center py-2 rounded-[10px] border border-glance-border bg-glance-surface text-glance-primary cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={phase !== "playing"}
          onClick={() => setDir(RIGHT)}
          aria-label="Right"
          className="flex items-center justify-center py-2 rounded-[10px] border border-glance-border bg-glance-surface text-glance-primary cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
