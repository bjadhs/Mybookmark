export function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute rounded-full"
        style={{
          top: -220,
          left: 180,
          width: 620,
          height: 620,
          background:
            "radial-gradient(circle, rgba(124,92,255,0.18), transparent 68%)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: -180,
          right: -120,
          width: 560,
          height: 560,
          background:
            "radial-gradient(circle, rgba(0,212,255,0.13), transparent 68%)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: -260,
          left: "40%",
          width: 640,
          height: 640,
          background:
            "radial-gradient(circle, rgba(124,92,255,0.08), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
