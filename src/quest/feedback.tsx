import type { ReactNode } from "react";

export function Feedback({
  tone,
  children,
}: {
  tone: "ok" | "bad" | "info";
  children: ReactNode;
}) {
  const icon = tone === "ok" ? "✓" : tone === "bad" ? "✗" : "i";
  const label = tone === "ok" ? "Правильно" : tone === "bad" ? "Ще ні" : "Інформація";
  return (
    <div className={`q-fb ${tone}`}>
      <span className="ic" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span className="sr">{label}. </span>
        {children}
      </div>
    </div>
  );
}
