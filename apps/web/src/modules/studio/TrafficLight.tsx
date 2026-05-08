type Status = "done" | "in_progress" | "pending" | "blocked" | "none";

const COLOR: Record<Status, string> = {
  done:        "bg-green-500",
  in_progress: "bg-amber-400",
  pending:     "bg-slate-300",
  blocked:     "bg-red-500",
  none:        "bg-slate-200",
};

const LABEL: Record<Status, string> = {
  done:        "Completo",
  in_progress: "En progreso",
  pending:     "Pendiente",
  blocked:     "Bloqueado",
  none:        "Sin abrir",
};

interface Props { status: Status; size?: "sm" | "md" }

export default function TrafficLight({ status, size = "md" }: Props) {
  const sz = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  return (
    <span title={LABEL[status]} className={`inline-block rounded-full ${sz} ${COLOR[status]} flex-none`} />
  );
}
