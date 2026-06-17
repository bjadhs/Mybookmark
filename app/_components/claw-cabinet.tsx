"use client";

/**
 * The claw-machine animation for an agent rig. Colour and the number of
 * "robots" working in the pit are data-driven (per agent); the motion timeline
 * lives in globals.css (claw-trolley / claw-drop / claw-prong-*).
 */
export function ClawCabinet({
  color,
  robots,
  duration,
  height = 280,
}: {
  color: string;
  robots: number;
  duration: string;
  height?: number;
}) {
  const count = Math.min(8, Math.max(1, Math.round(robots)));
  const glow = `${color}66`;

  return (
    <div
      className="relative rounded-[14px] overflow-hidden border"
      style={{
        height,
        background:
          "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.05), transparent 60%), #0e0e16",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: `inset 0 0 60px ${glow}`,
      }}
    >
      {/* Top rail */}
      <div className="absolute top-5 left-4 right-4 h-[3px] rounded-full bg-white/10" />

      {/* Trolley travels along the rail */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 animate-claw-trolley"
        style={{ animationDuration: duration }}
      >
        {/* Cable + claw drop together */}
        <div
          className="relative flex flex-col items-center animate-claw-drop"
          style={{ animationDuration: duration }}
        >
          <div className="w-[3px] h-9 bg-white/25" />
          <div
            className="w-5 h-3 rounded-[3px]"
            style={{ background: color, boxShadow: `0 0 12px ${glow}` }}
          />
          <div className="relative flex justify-center -mt-px">
            <Prong side="l" color={color} duration={duration} />
            <Prong side="r" color={color} duration={duration} />
          </div>
        </div>
      </div>

      {/* Prize pit */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/[0.03] border-t border-white/[0.06]" />
      {Array.from({ length: count }).map((_, i) => (
        <Robot
          key={i}
          left={`${((i + 1) / (count + 1)) * 100}%`}
          color={color}
        />
      ))}

      {/* Chute */}
      <div className="absolute bottom-3 right-4 w-10 h-9 rounded-[6px] border border-white/10 bg-black/30" />
    </div>
  );
}

function Prong({
  side,
  color,
  duration,
}: {
  side: "l" | "r";
  color: string;
  duration: string;
}) {
  return (
    <div
      className={
        side === "l"
          ? "origin-top animate-claw-prong-l"
          : "origin-top animate-claw-prong-r"
      }
      style={{ animationDuration: duration }}
    >
      <div
        className="w-[5px] h-7 rounded-b-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
      />
    </div>
  );
}

function Robot({ left, color }: { left: string; color: string }) {
  return (
    <div
      className="absolute bottom-3 w-6 h-6 rounded-full -translate-x-1/2"
      style={{
        left,
        background: color,
        opacity: 0.85,
        boxShadow: `0 0 14px ${color}66`,
      }}
    />
  );
}
