import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

interface Props { period: string }

export default function DueDateBanner({ period }: Props) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [due, setDue] = useState<string>("");

  useEffect(() => {
    api.get<{ due: string }>("/vat-returns/_/due-dates", { params: { period } })
      .then((r) => {
        const d = new Date(r.data.due);
        setDue(d.toLocaleDateString("es-AR"));
        setDaysLeft(Math.ceil((d.getTime() - Date.now()) / 86_400_000));
      })
      .catch(() => null);
  }, [period]);

  if (daysLeft === null || daysLeft > 5) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-3 ${
      daysLeft <= 0
        ? "bg-red-50 border-red-300 text-red-700"
        : "bg-amber-50 border-amber-300 text-amber-800"
    }`}>
      <span className="text-lg">⏰</span>
      <span>
        {daysLeft <= 0
          ? `Vencimiento IVA ${period} VENCIDO (${due})`
          : `IVA ${period} vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""} — ${due}`}
      </span>
    </div>
  );
}
