import { useEffect, useState } from "react";
import {
  LEVELS,
  MISSIONS,
  POINTS_AFTER_REVEAL,
  POINTS_LEVEL,
  POINTS_SOLVED,
  REVEAL_AFTER,
  levelMissions,
} from "../lib/quest-data";
import {
  getMission,
  isLevelDone,
  isLevelUnlocked,
  solvedInLevel,
  useQuest,
} from "../lib/use-quest";
import { MissionCard } from "../components/quest/mission-card";
import { Badges, Summary } from "../components/quest/summary";

type Tab = "quest" | "badges" | "summary";
const FONT_SIZES = [15, 16, 18, 20, 22];

function Index() {
  const quest = useQuest();
  const { state } = quest;
  const [tab, setTab] = useState<Tab>("quest");
  const [level, setLevel] = useState(1);
  const [mIndex, setMIndex] = useState(0);

  useEffect(() => {
    document.documentElement.style.setProperty("--fs", `${FONT_SIZES[state.fontStep + 1]}px`);
  }, [state.fontStep]);

  // Після перезавантаження повертаємо учасника на перший нерозв'язаний рівень
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    const lv = LEVELS.find((l) => isLevelUnlocked(state, l.id) && !isLevelDone(state, l.id)) ?? LEVELS[3];
    setLevel(lv.id);
    const ms = levelMissions(lv.id);
    const idx = ms.findIndex((m) => !getMission(state, m.id).solved);
    setMIndex(Math.max(0, idx));
  }, [restored, state]);

  const lvl = LEVELS.find((l) => l.id === level)!;
  const missions = levelMissions(level);
  const mission = missions[Math.min(mIndex, missions.length - 1)];
  const done = isLevelDone(state, level);
  const nextLevel = LEVELS.find((l) => l.id === level + 1);
  const route = state.routes[level];
  const started = quest.solved > 0;

  const goLevel = (id: number) => {
    setLevel(id);
    const ms = levelMissions(id);
    const idx = ms.findIndex((m) => !getMission(state, m.id).solved);
    setMIndex(Math.max(0, idx));
  };

  const nextMission = () => {
    const next = missions.findIndex((m, i) => i > mIndex && !getMission(state, m.id).solved);
    if (next >= 0) setMIndex(next);
    else if (mIndex < missions.length - 1) setMIndex(mIndex + 1);
  };
  const hasNextInLevel = mIndex < missions.length - 1;

  const pct = Math.round((quest.solved / MISSIONS.length) * 100);

  return (
    <>
      <header className="q-head">
        <div className="q-head-in">
          <div>
            <h1 className="q-title">Кав'ярня Python</h1>
            <p className="q-sub">Квест · Модуль 1 · РН1 · Основи Python для початківців</p>
          </div>
          <div className="q-tools">
            <span className="q-pts" aria-label={`Бали: ${quest.points} з ${quest.maxPoints}`}>
              <b>{quest.points}</b> / {quest.maxPoints} б.
            </span>
            <div className="q-fs" role="group" aria-label="Розмір тексту">
              <button type="button" aria-label="Зменшити текст" disabled={state.fontStep <= -1} onClick={() => quest.setFontStep(state.fontStep - 1)}>
                A−
              </button>
              <button type="button" aria-label="Збільшити текст" disabled={state.fontStep >= 3} onClick={() => quest.setFontStep(state.fontStep + 1)}>
                A+
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="q-wrap">
        <div className="q-tabs" role="tablist" aria-label="Розділи">
          {(
            [
              ["quest", "Квест"],
              ["badges", `Досягнення (${quest.badges.length}/6)`],
              ["summary", "Підсумок"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} role="tab" type="button" className="q-tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "quest" && (
          <>
            <details className="q-rules" open={!started}>
              <summary>Правила квесту (30 секунд)</summary>
              <ol>
                <li>
                  Ви працюєте в кав'ярні й ростете від баристи до шефа зміни. Кожен рівень - це тема модуля: змінні й
                  типи, умови, цикли, а потім усе разом.
                </li>
                <li>
                  На рівні 3 місії. Щоб відкрити наступний рівень, розв'яжіть будь-які <b>2 з 3</b> (на останньому рівні
                  достатньо 1).
                </li>
                <li>
                  Спроб скільки завгодно, помилка нічого не забирає. Після кожної перевірки ви бачите пояснення. Після{" "}
                  {REVEAL_AFTER} помилок можна переглянути відповідь.
                </li>
                <li>
                  Бали: {POINTS_SOLVED} за місію ({POINTS_AFTER_REVEAL}, якщо спершу переглянули відповідь) і +{POINTS_LEVEL} за
                  відкритий рівень. Підказки безкоштовні.
                </li>
                <li>
                  Маршрут на вибір: <b>«З підказками»</b> або <b>«Виклик»</b> (без підказок). Прогрес і бали однакові,
                  «Виклик» дає окреме досягнення.
                </li>
                <li>Немає таймера й рейтингу: ви змагаєтеся лише з собою. Прогрес зберігається у вашому браузері.</li>
              </ol>
            </details>

            <section className="q-progress" aria-label="Загальний прогрес">
              <div className="q-pbar" role="progressbar" aria-valuemin={0} aria-valuemax={MISSIONS.length} aria-valuenow={quest.solved} aria-label="Розв'язано місій">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="q-pmeta">
                <span>
                  Місій розв'язано: {quest.solved} з {MISSIONS.length}
                </span>
                <span>
                  Рівнів відкрито: {LEVELS.filter((l) => isLevelUnlocked(state, l.id)).length} з {LEVELS.length}
                </span>
              </div>
            </section>

            <nav className="q-map" aria-label="Карта рівнів">
              {LEVELS.map((l) => {
                const unlocked = isLevelUnlocked(state, l.id);
                const solved = solvedInLevel(state, l.id);
                const prev = LEVELS.find((x) => x.id === l.id - 1);
                return (
                  <button
                    key={l.id}
                    type="button"
                    className="q-lvl"
                    disabled={!unlocked}
                    aria-current={level === l.id}
                    onClick={() => goLevel(l.id)}
                  >
                    <span className="q-lvl-n">
                      {unlocked ? (isLevelDone(state, l.id) ? "✓ " : "") : "🔒 "}Рівень {l.id}
                    </span>
                    <span className="q-lvl-t">{l.title}</span>
                    <span className="q-lvl-s">
                      {unlocked ? `${solved} з ${levelMissions(l.id).length} місій` : `Відкриється після ${prev!.required} місій рівня ${prev!.id}`}
                    </span>
                    <span className="q-dots" aria-hidden="true">
                      {levelMissions(l.id).map((m) => (
                        <i key={m.id} className={getMission(state, m.id).solved ? "on" : ""} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </nav>

            <section className="q-level-head" aria-label={`Рівень ${lvl.id}`}>
              <h2>
                Рівень {lvl.id}. {lvl.title}: {lvl.role.toLowerCase()}
              </h2>
              <p>
                {lvl.story} <b>Тема:</b> {lvl.topic}. <b>Щоб відкрити далі:</b> {lvl.required} з {missions.length} місій
                (зараз {solvedInLevel(state, level)}).
              </p>
              <fieldset className="q-route" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend>Маршрут:</legend>
                <button type="button" className="q-seg" aria-pressed={route === "support"} onClick={() => quest.setRoute(level, "support")}>
                  З підказками
                </button>
                <button type="button" className="q-seg" aria-pressed={route === "challenge"} onClick={() => quest.setRoute(level, "challenge")}>
                  Виклик
                </button>
                <span className="q-route-note">
                  {route === "support"
                    ? "Доступні підказки (безкоштовні). Бали й розблокування ті самі."
                    : "Без підказок. Якщо відкриєте наступний рівень на цьому маршруті, отримаєте «Сміливий маршрут». Змінити маршрут можна будь-коли."}
                </span>
              </fieldset>
            </section>

            <div className="q-steps" role="group" aria-label="Місії рівня">
              {missions.map((m, i) => {
                const s = getMission(state, m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`q-step ${s.solved ? "done" : ""}`}
                    aria-current={i === mIndex ? "step" : undefined}
                    onClick={() => setMIndex(i)}
                  >
                    {s.solved ? "✓" : ""} Місія {i + 1}
                  </button>
                );
              })}
            </div>

            <MissionCard
              key={mission.id}
              mission={mission}
              quest={quest}
              route={route}
              onNext={hasNextInLevel ? nextMission : null}
              nextLabel="Наступна місія →"
            />

            {done && (
              <div className="q-banner" role="status">
                <div>
                  <h3>
                    {nextLevel ? `Рівень ${level} пройдено, +${POINTS_LEVEL} б.` : "Усі рівні відкрито"}
                  </h3>
                  <p>
                    {nextLevel
                      ? `Відкрито рівень ${nextLevel.id}: ${nextLevel.title}. Решту місій цього рівня можна пройти будь-коли.`
                      : "Перейдіть до підсумку: напишіть рефлексію й скопіюйте звіт для Classroom."}
                  </p>
                </div>
                {nextLevel ? (
                  <button type="button" className="q-btn" onClick={() => goLevel(nextLevel.id)}>
                    До рівня {nextLevel.id} →
                  </button>
                ) : (
                  <button type="button" className="q-btn" onClick={() => setTab("summary")}>
                    До підсумку →
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === "badges" && <Badges quest={quest} />}
        {tab === "summary" && <Summary quest={quest} />}

        <footer className="q-foot">
          <span>Основи Python для початківців · Модуль 1 · ПР-9 · Данильченко В. Г., МІПм-1-25-1.4-д</span>
          <button
            type="button"
            className="q-link"
            onClick={() => {
              if (window.confirm("Скинути весь прогрес у цьому браузері?")) {
                quest.reset();
                setLevel(1);
                setMIndex(0);
                setTab("quest");
              }
            }}
          >
            Скинути прогрес
          </button>
        </footer>
      </main>
    </>
  );
}

export default Index;
