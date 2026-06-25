/**
 * Editorial detail content for the /projects/[id] pages. This is intentionally
 * "dummy" flavor copy + a diagram hint per seeded project; custom projects fall
 * back to generated copy. No DB / server imports so it's safe anywhere.
 */

export type DiagramVariant = "flow" | "stack" | "orbit" | "grid" | "timeline";

export interface ProjectDetail {
  tagline: string;
  overview: string[];
  highlights: string[];
  diagram: DiagramVariant;
}

export const PROJECT_DETAILS: Record<string, ProjectDetail> = {
  prj_01: {
    tagline: "Turn the job hunt into a pipeline, not a panic.",
    overview: [
      "A single funnel for every application — sourced, applied, interviewing, offer. Each role is a card that moves through stages so nothing slips through the cracks.",
      "The goal is volume with signal: apply widely, track responses, and double down on what converts.",
    ],
    highlights: ["Kanban-style stages", "Response-rate tracking", "Follow-up reminders"],
    diagram: "flow",
  },
  prj_02: {
    tagline: "An agent that rewrites your CV for every single role.",
    overview: [
      "Feed it a job description and the loop drafts a tailored resume + cover letter, critiques itself against the posting, and revises until the keyword match clears a bar.",
      "Built on a Claude review→revise→verify loop so each pass is measurably better than the last.",
    ],
    highlights: ["JD-aware tailoring", "Self-critique loop", "ATS keyword scoring"],
    diagram: "orbit",
  },
  prj_03: {
    tagline: "Reps for the room: communication and interview drills.",
    overview: [
      "Daily structured practice — behavioral stories, system-design talk tracks, and rapid-fire Q&A — graded for clarity and confidence.",
      "The point is muscle memory: rehearse the awkward parts until they're automatic.",
    ],
    highlights: ["STAR story bank", "Mock interview drills", "Clarity scoring"],
    diagram: "timeline",
  },
  prj_04: {
    tagline: "Networking that compounds instead of cold-starts.",
    overview: [
      "A lightweight CRM for relationships: who you met, what you talked about, when to reach back out. LinkedIn outreach with intent instead of spray-and-pray.",
      "Warm intros beat cold applications — this keeps the warm graph alive.",
    ],
    highlights: ["Contact graph", "Touch-point cadence", "Intro tracking"],
    diagram: "grid",
  },
  prj_05: {
    tagline: "Ship by day, ship by night — a code habit engine.",
    overview: [
      "Two coding sessions a day, tracked like a streak. Light mode for focused build hours, night mode for exploratory hacking.",
      "Consistency is the product; the dashboard just makes it visible.",
    ],
    highlights: ["Daily streaks", "Session logging", "Light/Night modes"],
    diagram: "stack",
  },
  prj_06: {
    tagline: "A portfolio that proves it — React + GitHub, live.",
    overview: [
      "A fast, polished portfolio that pulls real repos from GitHub and renders case studies for the work that matters.",
      "Recruiters skim; this makes the first ten seconds count.",
    ],
    highlights: ["Live GitHub feed", "Case-study layout", "One-click deploy"],
    diagram: "grid",
  },
  prj_07: {
    tagline: "Hiday — the productivity app that respects your day.",
    overview: [
      "Plan, focus, review. A calm daily operating system that blends tasks, time-blocking, and a gentle end-of-day reflection.",
      "Less dashboard worship, more actually getting the three things done.",
    ],
    highlights: ["Time-blocking", "Focus timer", "Daily review"],
    diagram: "flow",
  },
  prj_08: {
    tagline: "Mybookmark — everything you save, in one live grid.",
    overview: [
      "Every saved site renders as a live preview card, organized by category, searchable, and social. The app you're looking at right now.",
      "One home for the whole internet you actually use.",
    ],
    highlights: ["Live preview cards", "Categories + search", "Likes & comments"],
    diagram: "orbit",
  },
  prj_09: {
    tagline: "Emburontoaark & Ecomm — a storefront showcase.",
    overview: [
      "An end-to-end commerce showcase: catalog, cart, checkout, and an admin back office — built to demonstrate full-stack range.",
      "A portfolio centerpiece that doubles as a real, runnable shop.",
    ],
    highlights: ["Catalog + cart", "Checkout flow", "Admin back office"],
    diagram: "stack",
  },
  prj_10: {
    tagline: "Raspberry Pi + Hostinger — your own always-on cloud.",
    overview: [
      "Self-hosting on a Pi at home and a Hostinger VPS, tied together over Tailscale, fronted by a reverse proxy with real TLS.",
      "Owning the metal: cheaper, hackable, and a great systems education.",
    ],
    highlights: ["Tailscale mesh", "Reverse proxy + TLS", "24/7 uptime"],
    diagram: "flow",
  },
  prj_11: {
    tagline: "An agentic loop that codes while you sleep.",
    overview: [
      "Kimi and Claude paired in a plan→edit→test→review cycle that grinds on a task autonomously, escalating to you only when it's stuck.",
      "The dream: describe the change, wake up to a green PR.",
    ],
    highlights: ["Multi-model loop", "Auto test + review", "Human-in-the-loop escalation"],
    diagram: "orbit",
  },
  prj_12: {
    tagline: "Websites & AI business — a 70-page playbook.",
    overview: [
      "The operating manual for spinning up small AI-powered web businesses: offers, build, launch, and growth, distilled into 70 pages.",
      "A book you can act on, not just nod along to.",
    ],
    highlights: ["70-page playbook", "Repeatable launch checklist", "AI-first offers"],
    diagram: "timeline",
  },
  prj_13: {
    tagline: "Stock analysis — agentic, data-driven investing.",
    overview: [
      "Agents that pull fundamentals and price action, score opportunities, and explain the thesis in plain language before you commit a dollar.",
      "Conviction with receipts, not vibes.",
    ],
    highlights: ["Fundamentals + price", "Thesis generation", "Risk scoring"],
    diagram: "timeline",
  },
  prj_14: {
    tagline: "Postgres + an agentic harness for real workloads.",
    overview: [
      "A reusable harness that gives agents safe, schema-aware access to Postgres — migrations, guarded queries, and a feedback loop for self-correction.",
      "The plumbing that makes every other agent project trustworthy.",
    ],
    highlights: ["Schema-aware access", "Guarded migrations", "Self-correction loop"],
    diagram: "stack",
  },
};

const VARIANTS: DiagramVariant[] = ["flow", "stack", "orbit", "grid", "timeline"];

/** Detail content for a project id, with a generated fallback for custom ones. */
export function detailFor(id: string, title: string): ProjectDetail {
  const found = PROJECT_DETAILS[id];
  if (found) return found;

  // Deterministic-ish fallback so custom projects still get a diagram + copy.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return {
    tagline: `${title} — a work in progress worth tracking.`,
    overview: [
      `${title} is on the board and moving. Use the progress bar to mark how far along it is, and drop notes as it evolves.`,
      "There's no bespoke write-up for this one yet — but there's still a game below to earn your break.",
    ],
    highlights: ["Tracked end-to-end", "Progress at a glance", "Notes as you go"],
    diagram: VARIANTS[hash % VARIANTS.length],
  };
}
