"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Cell = "X" | "O" | null;
type Board = Cell[];

const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winningLine(board: Board): { player: Cell; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every((c) => c !== null) && !winningLine(board);
}

// Minimax: O is maximizing (AI), X is minimizing (player).
function minimax(board: Board, isMaximizing: boolean, depth: number): number {
  const win = winningLine(board);
  if (win) {
    if (win.player === "O") return 10 - depth;
    if (win.player === "X") return depth - 10;
  }
  if (isDraw(board)) return 0;

  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const next = board.slice();
    next[i] = isMaximizing ? "O" : "X";
    scores.push(minimax(next, !isMaximizing, depth + 1));
  }
  return isMaximizing ? Math.max(...scores) : Math.min(...scores);
}

function bestAiMove(board: Board): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const next = board.slice();
    next[i] = "O";
    const score = minimax(next, false, 1);
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
}

type Status = "playing" | "win-x" | "win-o" | "draw";

export default function TicTacToeAiGame() {
  const [board, setBoard] = useState<Board>(() => Array(9).fill(null));
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [status, setStatus] = useState<Status>("playing");
  const [tally, setTally] = useState({ w: 0, l: 0, d: 0 });

  const result = useMemo(() => winningLine(board), [board]);

  const startGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setStatus("playing");
    setStarted(true);
  }, []);

  const applyResult = useCallback((b: Board) => {
    const win = winningLine(b);
    if (win) {
      setStatus(win.player === "X" ? "win-x" : "win-o");
      setTally((t) =>
        win.player === "X" ? { ...t, w: t.w + 1 } : { ...t, l: t.l + 1 }
      );
      return true;
    }
    if (isDraw(b)) {
      setStatus("draw");
      setTally((t) => ({ ...t, d: t.d + 1 }));
      return true;
    }
    return false;
  }, []);

  const playerMove = useCallback(
    (idx: number) => {
      if (!started || status !== "playing" || turn !== "X" || board[idx] !== null) return;
      const next = board.slice();
      next[idx] = "X";
      setBoard(next);
      const finished = applyResult(next);
      if (!finished) {
        setTurn("O");
      }
    },
    [board, started, status, turn, applyResult]
  );

  // AI move
  useEffect(() => {
    if (!started || status !== "playing" || turn !== "O") return;
    const t = setTimeout(() => {
      const idx = bestAiMove(board);
      if (idx === -1) return;
      const next = board.slice();
      next[idx] = "O";
      setBoard(next);
      const finished = applyResult(next);
      if (!finished) {
        setTurn("X");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [board, started, status, turn, applyResult]);

  const statusText =
    status === "win-x"
      ? "You win!"
      : status === "win-o"
        ? "AI wins"
        : status === "draw"
          ? "Draw"
          : turn === "X"
            ? "Your turn (X)"
            : "AI is thinking...";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Tic-Tac-Toe vs AI</div>
          <div className="text-[12px] text-glance-muted">
            You are X. Click a cell to play; block the AI or get three in a row.
          </div>
        </div>
        <div className="flex items-center gap-3 text-right shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">W</div>
            <div className="text-[16px] font-bold text-[var(--accent)] tabular-nums">{tally.w}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">L</div>
            <div className="text-[16px] font-bold text-glance-primary tabular-nums">{tally.l}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">D</div>
            <div className="text-[16px] font-bold text-glance-primary tabular-nums">{tally.d}</div>
          </div>
        </div>
      </div>

      <div className="relative w-full rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden p-4 sm:p-6">
        <div className="flex items-center justify-center mb-4">
          <div
            className={`text-[13px] font-semibold px-3 py-1 rounded-full border ${
              status === "win-x"
                ? "text-[var(--accent)] border-[var(--accent)] bg-[var(--accent)]/10"
                : status === "win-o"
                  ? "text-glance-primary border-white/10 bg-white/5"
                  : "text-glance-muted border-white/10 bg-white/5"
            }`}
          >
            {statusText}
          </div>
        </div>

        <div className="mx-auto grid grid-cols-3 gap-2 w-full max-w-[280px] aspect-square">
          {board.map((cell, idx) => {
            const isWinning = result?.line.includes(idx) ?? false;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => playerMove(idx)}
                disabled={!started || status !== "playing" || turn !== "X" || cell !== null}
                aria-label={`Cell ${idx + 1}${cell ? `, ${cell}` : ", empty"}`}
                className={`flex items-center justify-center rounded-[11px] border text-[28px] font-bold transition-colors ${
                  isWinning
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "border-glance-border bg-white/[0.03] text-glance-primary"
                } ${
                  started && status === "playing" && turn === "X" && cell === null
                    ? "hover:bg-white/[0.07] cursor-pointer"
                    : "cursor-default"
                }`}
              >
                {cell ?? ""}
              </button>
            );
          })}
        </div>

        {(!started || status !== "playing") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#0e0e16]/90">
            {started && status !== "playing" && (
              <div className="text-[16px] font-bold text-glance-primary">{statusText}</div>
            )}
            {!started && (
              <div className="text-[15px] font-bold text-glance-primary">Ready to play?</div>
            )}
            <button
              type="button"
              onClick={startGame}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              {started ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
