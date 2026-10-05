import { useEffect, useState } from "react";

type CountdownPreviewProps = {
  deadlineISO: string | null;
  message: string;
  backgroundColor: string;
  textColor: string;
  showDays: boolean;
  expiredText: string;
};

export default function CountdownPreview({
  deadlineISO,
  message,
  backgroundColor,
  textColor,
  showDays,
  expiredText,
}: CountdownPreviewProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const deadline = deadlineISO ? Date.parse(deadlineISO) : NaN;
  const validDeadline = Number.isFinite(deadline);

  const remaining =
    now !== null && validDeadline
      ? Math.max(0, Math.ceil((deadline - now) / 1000))
      : null;

  const days = remaining !== null ? Math.floor(remaining / 86400) : 0;

  const hours =
    remaining !== null
      ? showDays
        ? Math.floor((remaining % 86400) / 3600)
        : Math.floor(remaining / 3600)
      : 0;

  const minutes = remaining !== null ? Math.floor((remaining % 3600) / 60) : 0;

  const seconds = remaining !== null ? remaining % 60 : 0;

  const units = [
    ...(showDays ? [{ label: "Days", value: days }] : []),
    { label: "Hr", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  const safeColor = (value: string, fallback: string) =>
    /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

  return (
    <div
      aria-label="Saved Countdown preview"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px 24px",
        padding: "14px 20px",
        borderRadius: "8px",
        background: safeColor(backgroundColor, "#00B9B8"),
        color: safeColor(textColor, "#FFFFFF"),
      }}
    >
      <span style={{ fontSize: "15px", fontWeight: 600 }}>{message}</span>

      {!validDeadline ? (
        <span>Deadline not set</span>
      ) : remaining === null ? (
        <span>Loading timer…</span>
      ) : remaining === 0 ? (
        <span style={{ fontWeight: 600 }}>{expiredText || "Expired!"}</span>
      ) : (
        <div
          role="timer"
          aria-live="off"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          {units.map((unit) => (
            <div
              key={unit.label}
              style={{
                display: "grid",
                gap: "2px",
                minWidth: "32px",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                }}
              >
                {String(unit.value).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "11px" }}>{unit.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
