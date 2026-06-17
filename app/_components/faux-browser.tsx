import { LockIcon } from "@/app/_icons";

type FauxBrowserVariant = "card" | "add" | "visit";

interface FauxBrowserProps {
  domain: string;
  gradient: string;
  heroTint: string;
  variant: FauxBrowserVariant;
  previewImage?: string | null;
  /** When set (and the site allows framing) the live site is embedded here. */
  frameUrl?: string | null;
  /** Interactive (scroll/click) vs a static, pointer-events-off thumbnail. */
  interactive?: boolean;
  isLoadingPreview?: boolean;
  imageSlot?: React.ReactNode;
}

export function FauxBrowser({
  domain,
  gradient,
  heroTint,
  variant,
  previewImage,
  frameUrl,
  interactive,
  isLoadingPreview,
  imageSlot,
}: FauxBrowserProps) {
  const isVisit = variant === "visit";
  const isCard = variant === "card";
  const hasPreview = Boolean(previewImage);
  const hasFrame = Boolean(frameUrl);
  const frameHeight = isVisit ? 340 : "100%";

  return (
    <div
      className={`relative overflow-hidden bg-glance-viewport ${isCard ? "flex-1 min-h-0" : ""}`}
      style={{
        height: isVisit ? 380 : isCard ? undefined : 208,
        borderBottom: isCard ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center gap-[9px] px-[13px]"
        style={{
          height: isVisit ? 40 : 33,
          background: "rgba(255,255,255,0.025)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex gap-[5px]">
          <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
          <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
          <span className="w-2 h-2 rounded-full bg-[#28c840]" />
        </div>
        <div
          className="flex flex-1 items-center justify-center gap-[6px] mx-auto text-glance-muted"
          style={{
            maxWidth: isVisit ? 280 : isCard ? 200 : 220,
            height: isVisit ? 24 : 18,
            padding: "0 14px",
            borderRadius: isVisit ? 8 : 6,
            background: "rgba(255,255,255,0.05)",
            fontSize: isVisit ? 12 : 10.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <LockIcon className="text-glance-faint shrink-0" />
          <span className="truncate">{domain}</span>
        </div>
        <div className={isVisit ? "w-10" : "w-[34px]"} />
      </div>

      {variant === "add" ? (
        imageSlot ?? (
          <div className="w-full" style={{ height: 175, background: "#0e0e16" }} />
        )
      ) : hasFrame ? (
        interactive ? (
          <iframe
            src={frameUrl!}
            title={`${domain} live preview`}
            referrerPolicy="no-referrer"
            className="w-full block bg-white"
            style={{ height: isCard ? "100%" : 340, border: 0 }}
          />
        ) : (
          <div
            className="relative overflow-hidden bg-white"
            style={{ width: "100%", height: isCard ? "100%" : 159 }}
          >
            <iframe
              src={frameUrl!}
              title={`${domain} live preview`}
              referrerPolicy="no-referrer"
              scrolling="no"
              loading="lazy"
              tabIndex={-1}
              aria-hidden
              style={{
                width: "200%",
                height: "200%",
                border: 0,
                transform: "scale(0.5)",
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
            />
          </div>
        )
      ) : hasPreview ? (
        <img
          src={previewImage!}
          alt={`${domain} preview`}
          className="w-full object-cover object-top"
          style={{ height: isCard ? "100%" : 340 }}
        />
      ) : (
        <div className={`${isCard ? "h-full" : ""} ${isVisit ? "p-7" : "p-[14px]"}`}>
          <div
            className="flex items-center mb-[13px]"
            style={{ gap: isVisit ? 11 : 8, marginBottom: isVisit ? 24 : 13 }}
          >
            <div
              className="rounded-[5px]"
              style={{
                width: isVisit ? 22 : 15,
                height: isVisit ? 22 : 15,
                background: gradient,
              }}
            />
            <div
              className="rounded-[3px]"
              style={{
                width: isVisit ? 54 : 34,
                height: isVisit ? 8 : 6,
                background: "rgba(255,255,255,0.13)",
              }}
            />
            <div
              className="rounded-[3px]"
              style={{
                width: isVisit ? 38 : 24,
                height: isVisit ? 8 : 6,
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <div
              className="rounded-[3px]"
              style={{
                width: isVisit ? 38 : 24,
                height: isVisit ? 8 : 6,
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <div className="flex-1" />
            <div
              className="rounded-[6px]"
              style={{
                width: isVisit ? 72 : 44,
                height: isVisit ? 28 : 17,
                background: gradient,
                opacity: 0.92,
              }}
            />
          </div>

          <div
            className="border border-white/5"
            style={{
              borderRadius: isVisit ? 16 : 12,
              padding: isVisit ? 26 : 14,
              background: heroTint,
              marginBottom: isVisit ? 18 : 10,
            }}
          >
            <div
              className="rounded-[5px]"
              style={{
                width: isVisit ? "60%" : "74%",
                height: isVisit ? 18 : 11,
                background: "rgba(255,255,255,0.24)",
                marginBottom: isVisit ? 13 : 9,
              }}
            />
            {isVisit ? (
              <>
                <div
                  className="rounded-[6px]"
                  style={{
                    width: "80%",
                    height: 13,
                    background: "rgba(255,255,255,0.13)",
                    marginBottom: 8,
                  }}
                />
                <div
                  className="rounded-[6px]"
                  style={{
                    width: "64%",
                    height: 13,
                    background: "rgba(255,255,255,0.1)",
                    marginBottom: 20,
                  }}
                />
              </>
            ) : (
              <div
                className="rounded-[5px]"
                style={{
                  width: "50%",
                  height: 11,
                  background: "rgba(255,255,255,0.15)",
                  marginBottom: 13,
                }}
              />
            )}
            <div
              className="rounded-[7px]"
              style={{
                width: isVisit ? 130 : 84,
                height: isVisit ? 34 : 21,
                background: gradient,
              }}
            />
          </div>

          <div className="flex" style={{ gap: isVisit ? 14 : 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-[9px] border border-white/5 bg-white/5"
                style={{ height: isVisit ? 74 : 34 }}
              />
            ))}
          </div>
        </div>
      )}

      {isLoadingPreview && (
        <div className="absolute inset-0 flex items-center justify-center bg-glance-viewport/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-glance-muted text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-glance-pulse" />
            Fetching live preview…
          </div>
        </div>
      )}
    </div>
  );
}
