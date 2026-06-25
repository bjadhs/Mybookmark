"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Question = {
  prompt: string;
  options: string[];
  correct: number;
};

const QUESTIONS: Question[] = [
  {
    prompt: "An interviewer asks you to describe a time you failed. What's the best approach?",
    options: [
      "Say you've never really failed at anything",
      "Describe a real failure, what you learned, and how you changed",
      "Blame a teammate for the outcome",
      "Give a vague non-answer and move on quickly",
    ],
    correct: 1,
  },
  {
    prompt: "You arrive for an in-person interview. When should you arrive?",
    options: [
      "Exactly on time, not a minute earlier",
      "5-10 minutes early",
      "30+ minutes early so you're never late",
      "A few minutes late to seem relaxed",
    ],
    correct: 1,
  },
  {
    prompt: "The interviewer asks, 'Do you have any questions for us?' You should:",
    options: [
      "Say 'No, I think you covered everything'",
      "Only ask about salary and vacation days",
      "Ask none to save time",
      "Ask a thoughtful question about the team or role",
    ],
    correct: 3,
  },
  {
    prompt: "Using the STAR method to answer behavioral questions means structuring your answer around:",
    options: [
      "Situation, Task, Action, Result",
      "Strengths, Talent, Ambition, Reputation",
      "Story, Truth, Argument, Recap",
      "Skills, Training, Achievements, References",
    ],
    correct: 0,
  },
  {
    prompt: "Right after the interview ends, what's a good follow-up move?",
    options: [
      "Wait for them to reach out first, no matter how long",
      "Call them daily until you get an answer",
      "Send a brief thank-you note within a day",
      "Post about the interview on social media",
    ],
    correct: 2,
  },
];

function shuffleIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function verdictFor(score: number): string {
  if (score === 5) return "Flawless. You're interview-ready.";
  if (score >= 4) return "Strong instincts. Just a little polish left.";
  if (score >= 3) return "Decent grasp, but review the basics.";
  if (score >= 1) return "Rocky start. Some prep will go a long way.";
  return "Time to brush up before the real thing.";
}

export default function InterviewQuizGame() {
  const [started, setStarted] = useState(false);
  const [order, setOrder] = useState<number[]>(() => shuffleIndices(QUESTIONS.length));
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(false);
  const advanceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimeout.current !== null) clearTimeout(advanceTimeout.current);
    };
  }, []);

  const currentQuestion = useMemo<Question | null>(() => {
    if (!started || step >= order.length) return null;
    return QUESTIONS[order[step]];
  }, [started, step, order]);

  const begin = useCallback(() => {
    setOrder(shuffleIndices(QUESTIONS.length));
    setStep(0);
    setScore(0);
    setPicked(null);
    setFinished(false);
    setLocked(false);
    setStarted(true);
  }, []);

  const choose = useCallback(
    (optionIndex: number) => {
      if (locked || !currentQuestion) return;
      setLocked(true);
      setPicked(optionIndex);
      const isCorrect = optionIndex === currentQuestion.correct;
      if (isCorrect) setScore((s) => s + 1);

      advanceTimeout.current = setTimeout(() => {
        setStep((s) => {
          const next = s + 1;
          if (next >= order.length) {
            setFinished(true);
            setStarted(false);
          }
          return next;
        });
        setPicked(null);
        setLocked(false);
      }, 900);
    },
    [locked, currentQuestion, order.length],
  );

  const progressLabel = currentQuestion ? `Question ${step + 1} / ${order.length}` : "";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-bold text-glance-primary">Interview Quiz</div>
          <div className="text-[12px] text-glance-muted">
            Pick the best answer for each behavioral interview question.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint">Score</div>
          <div className="text-[18px] font-bold text-[var(--accent)] tabular-nums">
            {score} / {QUESTIONS.length}
          </div>
        </div>
      </div>

      <div className="relative w-full h-[360px] rounded-[14px] border border-glance-border bg-[#0e0e16] overflow-hidden">
        {!started && !finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-[15px] font-bold text-glance-primary">Ready to test your interview skills?</div>
            <div className="text-[12px] text-glance-muted max-w-[280px]">
              5 quick multiple-choice questions. Choose fast and trust your instincts.
            </div>
            <button
              type="button"
              onClick={begin}
              className="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-110 hover:-translate-y-px"
            >
              Start
            </button>
          </div>
        )}

        {started && currentQuestion && (
          <div className="absolute inset-0 flex flex-col px-5 py-4">
            <div className="text-[10px] uppercase tracking-[0.5px] text-glance-faint mb-2">
              {progressLabel}
            </div>
            <div className="text-[15px] font-semibold text-glance-primary mb-4 leading-snug">
              {currentQuestion.prompt}
            </div>
            <div className="flex flex-col gap-2">
              {currentQuestion.options.map((option, i) => {
                let extra = "border-glance-border hover:border-white/20 hover:bg-white/5";
                let style: { borderColor: string; backgroundColor: string } | undefined;
                if (picked !== null) {
                  if (i === currentQuestion.correct) {
                    extra = "";
                    style = { borderColor: "#1ed760", backgroundColor: "rgba(30,215,96,0.12)" };
                  } else if (i === picked) {
                    extra = "";
                    style = { borderColor: "#ff5f57", backgroundColor: "rgba(255,95,87,0.12)" };
                  }
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={locked}
                    onClick={() => choose(i)}
                    style={style}
                    className={`text-left px-3.5 py-2.5 rounded-[11px] border text-[13px] text-glance-primary transition-colors cursor-pointer disabled:cursor-default ${extra}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-[11px] uppercase tracking-[0.5px] text-glance-faint">Final score</div>
            <div className="text-[32px] font-bold text-[var(--accent)] tabular-nums">
              {score} / {QUESTIONS.length}
            </div>
            <div className="text-[13px] text-glance-muted max-w-[280px]">{verdictFor(score)}</div>
            <button
              type="button"
              onClick={begin}
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
