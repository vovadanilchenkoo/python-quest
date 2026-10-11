import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BADGES,
  LEVELS,
  MISSIONS,
  POINTS_AFTER_REVEAL,
  POINTS_LEVEL,
  POINTS_SOLVED,
  MAX_POINTS,
  levelMissions,
  type BadgeId,
} from "./quest-data";

export type Route = "support" | "challenge";

export interface MissionState {
  solved: boolean;
  wrong: number; // кількість помилкових відповідей
  hints: number; // скільки підказок відкрито
  revealed: boolean; // переглянуто відповідь
  points: number;
}

export interface QuestState {
  missions: Record<string, MissionState>;
  routes: Record<number, Route>;
  reflection: string;
  fontStep: number;
}

const KEY = "python-quest-v1";

const emptyMission = (): MissionState => ({
  solved: false,
  wrong: 0,
  hints: 0,
  revealed: false,
  points: 0,
});

const initial = (): QuestState => ({
  missions: {},
  routes: { 1: "support", 2: "support", 3: "support", 4: "support" },
  reflection: "",
  fontStep: 0,
});

function load(): QuestState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const parsed = JSON.parse(raw) as Partial<QuestState>;
    return { ...initial(), ...parsed, routes: { ...initial().routes, ...(parsed.routes ?? {}) } };
  } catch {
    return initial();
  }
}

export const getMission = (s: QuestState, id: string): MissionState =>
  s.missions[id] ?? emptyMission();

export function solvedInLevel(s: QuestState, level: number): number {
  return levelMissions(level).filter((m) => getMission(s, m.id).solved).length;
}

export function isLevelDone(s: QuestState, level: number): boolean {
  const lvl = LEVELS.find((l) => l.id === level)!;
  return solvedInLevel(s, level) >= lvl.required;
}

export function isLevelUnlocked(s: QuestState, level: number): boolean {
  return level === 1 || isLevelDone(s, level - 1);
}

export function totalPoints(s: QuestState): number {
  const m = MISSIONS.reduce((acc, x) => acc + getMission(s, x.id).points, 0);
  const l = LEVELS.filter((x) => isLevelDone(s, x.id)).length * POINTS_LEVEL;
  return m + l;
}

export function solvedTotal(s: QuestState): number {
  return MISSIONS.filter((m) => getMission(s, m.id).solved).length;
}

export function earnedBadges(s: QuestState): BadgeId[] {
  const out: BadgeId[] = [];
  const all = MISSIONS.map((m) => getMission(s, m.id));
  if (all.some((m) => m.solved)) out.push("first");
  if (all.some((m) => m.solved && m.wrong > 0)) out.push("second");
  const bugs = MISSIONS.filter((m) => m.kind === "bug");
  if (bugs.length > 0 && bugs.every((m) => getMission(s, m.id).solved)) out.push("bugs");
  if (LEVELS.some((l) => l.id < 4 && isLevelDone(s, l.id) && s.routes[l.id] === "challenge"))
    out.push("clean");
  if (solvedTotal(s) === MISSIONS.length) out.push("full");
  if (s.reflection.trim().length >= 20) out.push("reflect");
  return out;
}

export function questFinished(s: QuestState): boolean {
  return LEVELS.every((l) => isLevelDone(s, l.id));
}

// Невеликий контрольний код. Це НЕ захист, а спосіб швидко звірити підсумок у Classroom.
export function completionCode(s: QuestState): string {
  const pts = totalPoints(s);
  const solved = solvedTotal(s);
  const badges = earnedBadges(s).length;
  const base = `${pts}|${solved}|${badges}|${LEVELS.filter((l) => isLevelDone(s, l.id)).length}`;
  let h = 7;
  for (const c of base) h = (h * 31 + c.charCodeAt(0)) % 46656;
  const tail = h.toString(36).toUpperCase().padStart(3, "0");
  return `PR9-${String(pts).padStart(3, "0")}-${String(solved).padStart(2, "0")}-${badges}-${tail}`;
}

export function useQuest() {
  const [state, setState] = useState<QuestState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* сховище недоступне, прогрес живе до перезавантаження */
    }
  }, [state]);

  const patchMission = useCallback((id: string, fn: (m: MissionState) => MissionState) => {
    setState((s) => ({ ...s, missions: { ...s.missions, [id]: fn(getMission(s, id)) } }));
  }, []);

  const registerWrong = useCallback(
    (id: string) => patchMission(id, (m) => ({ ...m, wrong: m.wrong + 1 })),
    [patchMission],
  );

  const registerSolved = useCallback(
    (id: string) =>
      patchMission(id, (m) => {
        if (m.solved) return m;
        return {
          ...m,
          solved: true,
          points: m.revealed ? POINTS_AFTER_REVEAL : POINTS_SOLVED,
        };
      }),
    [patchMission],
  );

  const registerHint = useCallback(
    (id: string, n: number) => patchMission(id, (m) => ({ ...m, hints: Math.max(m.hints, n) })),
    [patchMission],
  );

  const registerReveal = useCallback(
    (id: string) => patchMission(id, (m) => ({ ...m, revealed: true })),
    [patchMission],
  );

  const setRoute = useCallback(
    (level: number, route: Route) =>
      setState((s) => ({ ...s, routes: { ...s.routes, [level]: route } })),
    [],
  );

  const setReflection = useCallback(
    (reflection: string) => setState((s) => ({ ...s, reflection })),
    [],
  );

  const setFontStep = useCallback(
    (fontStep: number) => setState((s) => ({ ...s, fontStep: Math.max(-1, Math.min(3, fontStep)) })),
    [],
  );

  const reset = useCallback(() => setState(initial()), []);

  const derived = useMemo(
    () => ({
      points: totalPoints(state),
      maxPoints: MAX_POINTS,
      solved: solvedTotal(state),
      badges: earnedBadges(state),
      finished: questFinished(state),
      code: completionCode(state),
    }),
    [state],
  );

  return {
    state,
    ...derived,
    registerWrong,
    registerSolved,
    registerHint,
    registerReveal,
    setRoute,
    setReflection,
    setFontStep,
    reset,
  };
}

export type Quest = ReturnType<typeof useQuest>;
export { BADGES };
