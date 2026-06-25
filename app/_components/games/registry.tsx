import type { ComponentType } from "react";
import DefaultClickerGame from "./default-clicker";
import JobApplicationSprintGame from "./job-application-sprint";
import ResumeKeywordMatchGame from "./resume-keyword-match";
import InterviewQuizGame from "./interview-quiz";
import NetworkConnectGame from "./network-connect";
import LightNightToggleGame from "./light-night-toggle";
import BugSquashGame from "./bug-squash";
import FocusPomodoroGame from "./focus-pomodoro";
import MemoryMatchGame from "./memory-match";
import CartCatchGame from "./cart-catch";
import SnakePiGame from "./snake-pi";
import TicTacToeAiGame from "./tic-tac-toe-ai";
import BrickStackerGame from "./brick-stacker";
import StockTraderGame from "./stock-trader";
import QueryMinesweeperGame from "./query-minesweeper";

/** Maps a seeded project id to its bespoke mini-game. */
export const GAMES: Record<string, ComponentType> = {
  prj_01: JobApplicationSprintGame,
  prj_02: ResumeKeywordMatchGame,
  prj_03: InterviewQuizGame,
  prj_04: NetworkConnectGame,
  prj_05: LightNightToggleGame,
  prj_06: BugSquashGame,
  prj_07: FocusPomodoroGame,
  prj_08: MemoryMatchGame,
  prj_09: CartCatchGame,
  prj_10: SnakePiGame,
  prj_11: TicTacToeAiGame,
  prj_12: BrickStackerGame,
  prj_13: StockTraderGame,
  prj_14: QueryMinesweeperGame,
};

/** The game for a project, falling back to a generic one for custom projects. */
export function gameForProject(id: string): ComponentType {
  return GAMES[id] ?? DefaultClickerGame;
}
