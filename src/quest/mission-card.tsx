import { useMemo, useState, type ReactNode } from "react";
import {
  POINTS_AFTER_REVEAL,
  POINTS_SOLVED,
  REVEAL_AFTER,
  type Gap,
  type Mission,
} from "../../lib/quest-data";
import { getMission, type Quest, type Route } from "../../lib/use-quest";
import { Feedback } from "./feedback";

type Result = { ok: boolean; text: ReactNode } | null;

const KIND_LABEL: Record<Mission["kind"], string> = {
  choice: "Вибір відповіді",
  type: "Введення відповіді",
  gaps: "Пропуски в коді",
  bug: "Знайдіть помилку",
  order: "Складіть програму",
};

const numEq = (a: string, b: string) => {
  const x = Number(a.trim().replace(",", "."));
  const y = Number(b.trim().replace(",", "."));
  return a.trim() !== "" && Number.isFinite(x) && Number.isFinite(y) && x === y;
};

// Фіксоване «перемішування»: однакове для всіх, щоб інструкція була відтворюваною.
function shuffled(m: Mission): number[] {
  const n = m.orderLines!.length;
  let idx = Array.from({ length: n }, (_, i) => i);
  let seed = [...m.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (idx.every((v, i) => v === i)) idx = [...idx.slice(1), idx[0]];
  return idx;
}

function answerText(m: Mission): string {
  switch (m.kind) {
    case "choice":
      return m.options!.find((o) => o.correct)!.text;
    case "type":
      return m.answers![0];
    case "gaps":
      return m.gaps!.map((g) => `${g.id}) ${g.correct === "" ? "(порожньо)" : g.correct}`).join("   ");
    case "bug":
      return `рядок ${m.bugLines![0]}`;
    case "order":
      return "порядок рядків показано нижче";
  }
}

function whyText(m: Mission): ReactNode {
  switch (m.kind) {
    case "choice":
      return <p>{m.options!.find((o) => o.correct)!.why}</p>;
    case "type":
      return <p>{m.typeWhy}</p>;
    case "gaps":
      return (
        <>
          {m.gaps!.map((g) => (
            <p key={g.id}>
              <strong>{g.id})</strong> {g.why}
            </p>
          ))}
        </>
      );
    case "bug":
      return <p>{m.bugWhy}</p>;
    case "order":
      return <p>{m.orderWhy}</p>;
  }
}

function Code({ code }: { code: string }) {
  return (
    <pre className="q-code" tabIndex={0} aria-label="Фрагмент коду">
      {code.split("\n").map((l, i) => (
        <div className="q-ln-static" key={i}>
          <span className="n" aria-hidden="true">
            {i + 1}
          </span>
          <span>{l || " "}</span>
        </div>
      ))}
    </pre>
  );
}

interface Props {
  mission: Mission;
  quest: Quest;
  route: Route;
  onNext: (() => void) | null;
  nextLabel: string;
}

export function MissionCard({ mission: m, quest, route, onNext, nextLabel }: Props) {
  const ms = getMission(quest.state, m.id);
  const [result, setResult] = useState<Result>(null);

  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [gaps, setGaps] = useState<Record<string, string>>({});
  const [gapOk, setGapOk] = useState<Record<string, boolean>>({});
  const [line, setLine] = useState<number | null>(null);
  const initialOrder = useMemo(() => (m.kind === "order" ? shuffled(m) : []), [m]);
  const [order, setOrder] = useState<number[]>(initialOrder);
  const [orderMarks, setOrderMarks] = useState<boolean[] | null>(null);

  const wrong = (text: ReactNode) => {
    quest.registerWrong(m.id);
    setResult({ ok: false, text });
  };

  const check = () => {
    setResult(null);
    if (m.kind === "choice") {
      if (choice === null) return;
      const o = m.options![choice];
      if (o.correct) quest.registerSolved(m.id);
      else wrong(<p>{o.why}</p>);
    }
    if (m.kind === "type") {
      if (m.answers!.some((a) => numEq(a, text))) quest.registerSolved(m.id);
      else
        wrong(
          <p>
            Відповідь «{text.trim()}» не збігається з результатом програми. Пройдіть код по рядках і запишіть
            значення змінних.
          </p>,
        );
    }
    if (m.kind === "gaps") {
      const marks: Record<string, boolean> = {};
      m.gaps!.forEach((g: Gap) => (marks[g.id] = gaps[g.id] === g.correct));
      setGapOk(marks);
      const bad = m.gaps!.filter((g) => !marks[g.id]).map((g) => g.id);
      if (bad.length === 0) quest.registerSolved(m.id);
      else
        wrong(
          <p>
            Не всі пропуски правильні. Перевірте: {bad.join(", ")}. Правильні пропуски підсвічено зеленим.
          </p>,
        );
    }
    if (m.kind === "bug") {
      if (line === null) return;
      if (m.bugLines!.includes(line)) quest.registerSolved(m.id);
      else wrong(<p>Рядок {line} працює правильно. Подумайте, де програма дає неочікуваний результат.</p>);
    }
    if (m.kind === "order") {
      const marks = order.map((v, pos) => v === pos);
      setOrderMarks(marks);
      if (marks.every(Boolean)) quest.registerSolved(m.id);
      else
        wrong(
          <p>
            Правильно стоять {marks.filter(Boolean).length} із {marks.length} рядків (позначено ✓). Решту
            (✗) перемістіть.
          </p>,
        );
    }
  };

  const canCheck =
    (m.kind === "choice" && choice !== null) ||
    (m.kind === "type" && text.trim() !== "") ||
    (m.kind === "gaps" && m.gaps!.every((g) => gaps[g.id] && gaps[g.id] !== "__")) ||
    (m.kind === "bug" && line !== null) ||
    m.kind === "order";

  const move = (pos: number, dir: -1 | 1) => {
    const next = [...order];
    [next[pos], next[pos + dir]] = [next[pos + dir], next[pos]];
    setOrder(next);
    setOrderMarks(null);
    setResult(null);
  };

  const hintsOn = route === "support";

  return (
    <article className="q-card" aria-labelledby={`t-${m.id}`}>
      <span className="q-chip">Місія {m.id}</span>
      <span className="q-chip">{KIND_LABEL[m.kind]}</span>
      <span className="q-chip amber">{m.skill}</span>
      <h3 id={`t-${m.id}`}>{m.title}</h3>
      <p className="q-story">{m.story}</p>

      {ms.solved ? (
        <>
          <p className="q-q">{m.question}</p>
          {m.kind === "order" ? (
            <Code code={m.orderLines!.join("\n")} />
          ) : m.kind === "gaps" ? (
            <Code code={m.code!.replace(/\[\[(\w+)\]\]/g, (_, id) => m.gaps!.find((g) => g.id === id)!.correct)} />
          ) : m.code ? (
            <Code code={m.code} />
          ) : null}
          <div aria-live="polite">
            <Feedback tone="ok">
              <p>
                <strong>Місію пройдено, +{ms.points} б.</strong>{" "}
                {ms.revealed ? "(відповідь була переглянута, тому 5 балів)" : ""}
              </p>
              {whyText(m)}
              {m.kind === "bug" && m.bugAlt && line !== null && line !== m.bugLines![0] && <p>{m.bugAlt}</p>}
              <p>{m.explain}</p>
            </Feedback>
          </div>
          {onNext && (
            <div className="q-actions">
              <button type="button" className="q-btn" onClick={onNext}>
                {nextLabel}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="q-q" id={`q-${m.id}`}>
            {m.question}
          </p>

          {m.kind === "choice" && (
            <>
              <Code code={m.code!} />
              <fieldset className="q-opts" aria-labelledby={`q-${m.id}`}>
                {m.options!.map((o, i) => (
                  <label className="q-opt" key={i}>
                    <input
                      type="radio"
                      name={`opt-${m.id}`}
                      checked={choice === i}
                      onChange={() => {
                        setChoice(i);
                        setResult(null);
                      }}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {m.kind === "type" && (
            <>
              <Code code={m.code!} />
              <label className="sr" htmlFor={`in-${m.id}`}>
                Ваша відповідь
              </label>
              <input
                id={`in-${m.id}`}
                className="q-input"
                value={text}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ваша відповідь"
                onChange={(e) => {
                  setText(e.target.value);
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && canCheck && check()}
              />
            </>
          )}

          {m.kind === "gaps" && (
            <pre className="q-code" aria-label="Код із пропусками">
              {m.code!.split("\n").map((l, i) => (
                <div className="q-ln-static" key={i}>
                  <span className="n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>
                    {l.split(/(\[\[\w+\]\])/).map((part, k) => {
                      const g = part.match(/^\[\[(\w+)\]\]$/);
                      if (!g) return part;
                      const id = g[1];
                      const state = id in gapOk ? (gapOk[id] ? "ok" : "bad") : "";
                      return (
                        <select
                          key={k}
                          className={`q-sel ${state}`}
                          aria-label={`Пропуск ${id}${state === "ok" ? ", правильно" : state === "bad" ? ", неправильно" : ""}`}
                          value={gaps[id] ?? "__"}
                          onChange={(e) => {
                            setGaps({ ...gaps, [id]: e.target.value });
                            setGapOk((o) => {
                              const { [id]: _drop, ...rest } = o;
                              return rest;
                            });
                            setResult(null);
                          }}
                        >
                          <option value="__">{id}) оберіть</option>
                          {m.gaps!.find((x) => x.id === id)!.options.map((op) => (
                            <option key={op} value={op}>
                              {op === "" ? "(порожньо)" : op}
                            </option>
                          ))}
                        </select>
                      );
                    })}
                  </span>
                </div>
              ))}
            </pre>
          )}

          {m.kind === "bug" && (
            <pre className="q-code" aria-label="Код, у якому є помилка">
              {m.code!.split("\n").map((l, i) => (
                <button
                  type="button"
                  key={i}
                  className="q-ln-btn"
                  aria-pressed={line === i + 1}
                  aria-label={`Рядок ${i + 1}: ${l}`}
                  onClick={() => {
                    setLine(i + 1);
                    setResult(null);
                  }}
                >
                  <span className="n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span aria-hidden="true">{l || " "}</span>
                </button>
              ))}
            </pre>
          )}

          {m.kind === "order" && (
            <ol className="q-order" aria-label="Рядки програми">
              {order.map((v, pos) => {
                const mark = orderMarks ? (orderMarks[pos] ? "ok" : "bad") : "";
                const l = m.orderLines![v];
                return (
                  <li key={v} className={mark}>
                    <span className="mark" aria-hidden="true">
                      {mark === "ok" ? "✓" : mark === "bad" ? "✗" : ""}
                    </span>
                    <code>{l}</code>
                    <button
                      type="button"
                      className="q-mv"
                      disabled={pos === 0}
                      aria-label={`Підняти вгору рядок: ${l.trim()}`}
                      onClick={() => move(pos, -1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="q-mv"
                      disabled={pos === order.length - 1}
                      aria-label={`Опустити вниз рядок: ${l.trim()}`}
                      onClick={() => move(pos, 1)}
                    >
                      ▼
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="q-actions">
            <button type="button" className="q-btn" disabled={!canCheck} onClick={check}>
              Перевірити
            </button>
            {hintsOn && ms.hints < m.hints.length && (
              <button type="button" className="q-btn ghost" onClick={() => quest.registerHint(m.id, ms.hints + 1)}>
                Підказка {ms.hints + 1} з {m.hints.length}
              </button>
            )}
            {ms.wrong >= REVEAL_AFTER && !ms.revealed && (
              <button type="button" className="q-btn amber" onClick={() => quest.registerReveal(m.id)}>
                Показати відповідь
              </button>
            )}
          </div>

          <div aria-live="polite">
            {result && !result.ok && <Feedback tone="bad">{result.text}</Feedback>}
            {hintsOn &&
              ms.hints > 0 &&
              m.hints.slice(0, ms.hints).map((h, i) => (
                <Feedback tone="info" key={i}>
                  <p>
                    <strong>Підказка {i + 1}.</strong> {h}
                  </p>
                </Feedback>
              ))}
            {ms.revealed && (
              <Feedback tone="info">
                <p>
                  <strong>Відповідь:</strong>{" "}
                  {m.kind === "order" ? (
                    <>
                      <br />
                      {m.orderLines!.map((l, i) => (
                        <code key={i} style={{ display: "block", whiteSpace: "pre" }}>
                          {l}
                        </code>
                      ))}
                    </>
                  ) : (
                    answerText(m)
                  )}
                </p>
                {whyText(m)}
                <p>Тепер введіть її самі: місія дасть {POINTS_AFTER_REVEAL} бали замість {POINTS_SOLVED}.</p>
              </Feedback>
            )}
          </div>
          {!hintsOn && (
            <p className="q-note">Маршрут «Виклик»: підказок немає. Після {REVEAL_AFTER} помилок можна переглянути відповідь.</p>
          )}
        </>
      )}
    </article>
  );
}
