"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TOTAL_TICKS = 30;
const TICK_MS = 700;
const START_CASH = 1000;
const START_PRICE = 100;

type Phase = "idle" | "running" | "done";

function generateWalk(): number[] {
  const prices: number[] = [START_PRICE];
  for (let i = 1; i < TOTAL_TICKS; i++) {
    const prev = prices[i - 1];
    const drift = (Math.random() - 0.48) * prev * 0.06;
    const next = Math.max(1, prev + drift);
    prices.push(Math.round(next * 100) / 100);
  }
  return prices;
}

/**
 * "Day Trader" — a random-walk stock price reveals tick by tick on an SVG line
 * chart. The player buys and sells shares with starting cash, trying to grow
 * net worth before the final tick locks in the result.
 */
export default function StockTraderGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [walk, setWalk] = useState<number[]>(() => generateWalk());
  const [tick, setTick] = useState(0);
  const [cash, setCash] = useState(START_CASH);
  const [shares, setShares] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setWalk(generateWalk());
    setTick(0);
    setCash(START_CASH);
    setShares(0);
    setPhase("running");
  }, [clearTimer]);

  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setTick((t) => {
        const next = t + 1;
        if (next >= TOTAL_TICKS - 1) {
          clearTimer();
          setPhase("done");
          return TOTAL_TICKS - 1;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearTimer();
  }, [phase, clearTimer]);

  const currentPrice = walk[tick] ?? START_PRICE;
  const visiblePrices = useMemo(() => walk.slice(0, tick + 1), [walk, tick]);
  const netWorth = cash + shares * currentPrice;

  const buy = useCallback(() => {
    if (phase !== "running") return;
    setCash((c) => {
      const qty = Math.floor(c / currentPrice);
      if (qty <= 0) return c;
      setShares((sh) => sh + qty);
      return c - qty * currentPrice;
    });
  }, [phase, currentPrice]);

  const sellAll = useCallback(() => {
    if (phase !== "running") return;
    setCash((c) => c + shares * currentPrice);
    setShares(0);
  }, [phase, shares, currentPrice]);

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 10;

  const { pathD, areaD, minP, maxP } = useMemo(() => {
    if (visiblePrices.length < 2) {
      return { pathD: "", areaD: "", minP: 0, maxP: 0 };
    }
    const min = Math.min(...visiblePrices);
    const max = Math.max(...visiblePrices);
    const range = max - min || 1;
    const stepX = (chartWidth - padding * 2) / (TOTAL_TICKS - 1);

    const points = visiblePrices.map((p, i) => {
      const x = padding + i * stepX;
      const y = padding + (chartHeight - padding * 2) * (1 - (p - min) / range);
      return [x, y];
    });

    const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const lastX = points[points.length - 1][0];
    const area = `${d} L${lastX.toFixed(2)},${chartHeight - padding} L${padding},${chartHeight - padding} Z`;

    return { pathD: d, areaD: area, minP: min, maxP: max };
  }, [visiblePrices]);

  const profit = netWorth - START_CASH;
  const isProfit = profit >= 0;
  const canBuy = phase === "running" && cash >= currentPrice;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Day Trader</div>
          <div className="text-[12px] text-glance-muted">
            Watch the price tick live, buy low, and sell before the close.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Net worth</div>
          <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">
            ${netWorth.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="relative w-full h-[300px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden">
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-[15px] font-bold text-glance-primary">Ready to trade?</div>
            <div className="text-[12px] text-glance-muted max-w-[280px]">
              Start with $1000 cash. The price moves every {(TICK_MS / 1000).toFixed(1)}s for{" "}
              {TOTAL_TICKS} ticks.
            </div>
            <button
              type="button"
              onClick={start}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Start
            </button>
          </div>
        )}

        {phase !== "idle" && (
          <div className="absolute inset-0 flex flex-col px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">
                Tick {Math.min(tick + 1, TOTAL_TICKS)} / {TOTAL_TICKS}
              </div>
              <div className="text-[13px] font-semibold text-glance-primary tabular-nums">
                ${currentPrice.toFixed(2)}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Stock price chart"
              >
                {pathD && (
                  <>
                    <path d={areaD} fill="var(--accent)" opacity={0.12} />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </>
                )}
                {maxP > 0 && (
                  <text x={padding} y={padding + 8} className="fill-glance-faint" fontSize={10}>
                    ${maxP.toFixed(2)}
                  </text>
                )}
                {minP > 0 && (
                  <text x={padding} y={chartHeight - padding - 2} className="fill-glance-faint" fontSize={10}>
                    ${minP.toFixed(2)}
                  </text>
                )}
              </svg>
            </div>

            <div className="flex items-center justify-between mt-2 mb-2 text-[12px]">
              <div className="text-glance-muted">
                Cash <span className="text-glance-primary font-semibold tabular-nums">${cash.toFixed(2)}</span>
              </div>
              <div className="text-glance-muted">
                Shares <span className="text-glance-primary font-semibold tabular-nums">{shares}</span>
              </div>
            </div>

            {phase === "running" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={buy}
                  disabled={!canBuy}
                  className="flex-1 px-3 py-2 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-default"
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={sellAll}
                  disabled={shares <= 0}
                  className="flex-1 px-3 py-2 rounded-[11px] border border-glance-border text-glance-primary text-sm font-semibold cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-default"
                >
                  Sell all
                </button>
              </div>
            )}

            {phase === "done" && (
              <div className="flex flex-col items-center gap-2 text-center pt-1">
                <div className="text-[11px] uppercase tracking-[0.5px] text-glance-faint">Final net worth</div>
                <div className="text-[22px] font-bold text-glance-primary tabular-nums">
                  ${netWorth.toFixed(2)}
                </div>
                <div
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: isProfit ? "#1ed760" : "#ff5f57" }}
                >
                  {isProfit ? "+" : ""}
                  {profit.toFixed(2)} ({isProfit ? "profit" : "loss"})
                </div>
                <button
                  type="button"
                  onClick={start}
                  className="mt-1 px-5 py-2 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
                >
                  Play again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
