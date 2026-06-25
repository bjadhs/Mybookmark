"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEYWORDS = [
  "React",
  "TypeScript",
  "Agentic",
  "Postgres",
  "Next.js",
  "Docker",
  "CI/CD",
  "Portfolio",
];

const FLIP_BACK_DELAY_MS = 700;

type Tile = {
  id: number;
  word: string;
};

function shuffledTiles(): Tile[] {
  const doubled = [...KEYWORDS, ...KEYWORDS];
  const arr = doubled.map((word, idx) => ({ id: idx, word }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ResumeKeywordMatchGame() {
  const [started, setStarted] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>(() => shuffledTiles());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setTiles(shuffledTiles());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setLocked(false);
    setStarted(true);
  }, []);

  const handleFlip = useCallback(
    (id: number) => {
      if (!started) return;
      if (locked) return;
      if (flipped.includes(id) || matched.includes(id)) return;
      if (flipped.length >= 2) return;

      const next = [...flipped, id];
      setFlipped(next);

      if (next.length === 2) {
        setMoves((m) => m + 1);
        const [firstId, secondId] = next;
        const firstTile = tiles.find((t) => t.id === firstId);
        const secondTile = tiles.find((t) => t.id === secondId);

        if (firstTile && secondTile && firstTile.word === secondTile.word) {
          setMatched((prev) => [...prev, firstId, secondId]);
          setFlipped([]);
        } else {
          setLocked(true);
          timeoutRef.current = setTimeout(() => {
            setFlipped([]);
            setLocked(false);
            timeoutRef.current = null;
          }, FLIP_BACK_DELAY_MS);
        }
      }
    },
    [started, locked, flipped, matched, tiles]
  );

  const pairsMatched = matched.length / 2;
  const won = started && pairsMatched === KEYWORDS.length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Keyword Match</div>
          <div className="text-[12px] text-glance-muted">
            Flip two cards to find matching resume keywords.
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Moves</div>
            <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">{moves}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Pairs</div>
            <div className="text-[18px] font-bold text-glance-primary tabular-nums">
              {pairsMatched}/{KEYWORDS.length}
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[400px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden p-3">
        {started ? (
          <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full h-full">
            {tiles.map((tile) => {
              const isFlipped = flipped.includes(tile.id);
              const isMatched = matched.includes(tile.id);
              const faceUp = isFlipped || isMatched;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleFlip(tile.id)}
                  disabled={faceUp}
                  className={
                    isMatched
                      ? "flex items-center justify-center rounded-[10px] border text-[11px] font-bold text-center px-1 cursor-default bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]"
                      : faceUp
                      ? "flex items-center justify-center rounded-[10px] border border-white/10 text-[11px] font-bold text-center px-1 bg-white/5 text-glance-primary cursor-default"
                      : "flex items-center justify-center rounded-[10px] border border-white/10 bg-glance-surface text-glance-faint cursor-pointer hover:bg-white/5 hover:border-white/20 transition-colors"
                  }
                >
                  {faceUp ? (
                    tile.word
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <circle cx="7" cy="7" r="3" fill="currentColor" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-[15px] font-bold text-glance-primary">Ready?</div>
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Start
            </button>
          </div>
        )}

        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#0e0e16]/90">
            <div className="text-[15px] font-bold text-glance-primary">
              All {KEYWORDS.length} pairs matched in {moves} moves
            </div>
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
