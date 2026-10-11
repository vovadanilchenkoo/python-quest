import { useState } from "react";
import { BADGES, LEVELS, MAX_POINTS, MISSIONS } from "../../lib/quest-data";
import { getMission, isLevelDone, type Quest } from "../../lib/use-quest";

export function Badges({ quest }: { quest: Quest }) {
  return (
    <section aria-label="Досягнення">
      <p className="q-note" style={{ marginTop: 0, marginBottom: 12 }}>
        Досягнення нагороджують за навчальну поведінку: перевірку, виправлення помилок, пошук багів. Вони не дають
        переваг і не порівнюються з іншими.
      </p>
      <div className="q-badges">
        {BADGES.map((b, i) => {
          const on = quest.badges.includes(b.id);
          return (
            <div className={`q-badge ${on ? "on" : ""}`} key={b.id}>
              <div className="q-badge-ic" aria-hidden="true">
                {on ? "★" : i + 1}
              </div>
              <div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
                <em>{on ? "Отримано" : "Ще не отримано"}</em>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Summary({ quest }: { quest: Quest }) {
  const { state } = quest;
  const [copied, setCopied] = useState(false);
  const routeName = (r: string) => (r === "challenge" ? "Виклик" : "З підказками");

  const report = [
    "ПР-9. Квест «Кав'ярня Python» (Модуль 1, РН1)",
    `Бали: ${quest.points} з ${MAX_POINTS}`,
    `Місій розв'язано: ${quest.solved} з ${MISSIONS.length}`,
    `Рівні: ${LEVELS.map((l) => `${l.id}. ${l.title} - ${isLevelDone(state, l.id) ? "пройдено" : "ні"} (${routeName(state.routes[l.id])})`).join("; ")}`,
    `Досягнення: ${quest.badges.length} з ${BADGES.length} (${BADGES.filter((b) => quest.badges.includes(b.id))
      .map((b) => b.title)
      .join(", ") || "немає"})`,
    `Рефлексія: ${state.reflection.trim() || "(не заповнено)"}`,
    `Код: ${quest.code}`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      const ta = document.getElementById("report-text") as HTMLTextAreaElement | null;
      ta?.select();
      setCopied(false);
    }
  };

  if (!quest.finished) {
    return (
      <div className="q-card">
        <h3>Підсумок відкриється після 4 рівнів</h3>
        <p>
          Зараз пройдено місій: {quest.solved} з {MISSIONS.length}. Щоб відкрити підсумок, відкрийте всі рівні (рівні 1-3:
          2 місії з 3, рівень 4: хоча б 1 місія).
        </p>
      </div>
    );
  }

  return (
    <div className="q-sum">
      <div className="q-card">
        <span className="q-chip">Підсумок</span>
        <h3>Квест пройдено</h3>
        <div className="q-stats">
          <div className="q-stat">
            <b>
              {quest.points}/{MAX_POINTS}
            </b>
            <span>балів</span>
          </div>
          <div className="q-stat">
            <b>
              {quest.solved}/{MISSIONS.length}
            </b>
            <span>місій розв'язано</span>
          </div>
          <div className="q-stat">
            <b>
              {quest.badges.length}/{BADGES.length}
            </b>
            <span>досягнень</span>
          </div>
        </div>
        <p className="q-note">
          Бали показують лише ваш власний прогрес. Менше балів за максимум не означає «гірший результат»: для
          завершення достатньо відкрити всі рівні.
        </p>
      </div>

      <div className="q-card">
        <h3>Рефлексія (РН1)</h3>
        <label htmlFor="refl" className="q-q" style={{ display: "block" }}>
          Що ви тепер можете пояснити про змінні, умови й цикли, чого не могли до квесту? Яка місія була найскладнішою і чому?
        </label>
        <textarea
          id="refl"
          className="q-ta"
          value={state.reflection}
          onChange={(e) => quest.setReflection(e.target.value)}
          placeholder="Напишіть 2-3 речення (мінімум 20 символів для досягнення «Рефлексія»)"
        />
        <p className="q-note">{state.reflection.trim().length} символів. Текст зберігається лише у вашому браузері.</p>
      </div>

      <div className="q-card">
        <h3>Звіт для Classroom</h3>
        <p>
          Контрольний код:{" "}
          <span className="q-code-box" aria-label={`Код ${quest.code}`}>
            {quest.code}
          </span>
        </p>
        <label htmlFor="report-text" className="sr">
          Текст звіту
        </label>
        <textarea id="report-text" className="q-ta" readOnly value={report} style={{ minHeight: 190, fontFamily: '"JetBrains Mono", monospace', fontSize: ".8rem" }} />
        <div className="q-actions">
          <button type="button" className="q-btn" onClick={copy}>
            Копіювати звіт
          </button>
          <span role="status" className="q-note">
            {copied ? "Скопійовано. Вставте текст у відповідь у Classroom." : ""}
          </span>
        </div>
      </div>

      <div className="q-card">
        <h3>Ваші місії</h3>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: ".9rem" }}>
          {MISSIONS.map((m) => {
            const s = getMission(state, m.id);
            return (
              <li key={m.id}>
                {m.id} {m.title}:{" "}
                {s.solved ? `розв'язано, ${s.points} б., помилок ${s.wrong}` : "не розв'язано"}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
