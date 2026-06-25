"use client";

import { gameForProject } from "@/app/_components/games/registry";

/**
 * Client boundary that picks and renders a project's mini-game by id.
 *
 * `gameForProject` returns a stable reference from a static registry — it does
 * not create a component per render — so the static-components rule is a false
 * positive for this dynamic-lookup pattern.
 */
/* eslint-disable react-hooks/static-components */
export function GameMount({ projectId }: { projectId: string }) {
  const Game = gameForProject(projectId);
  return <Game />;
}
/* eslint-enable react-hooks/static-components */
