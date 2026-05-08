type Variant = "green" | "red" | "amber" | "blue" | "slate";

const cls: Record<Variant, string> = {
  green: "bg-green-100 text-green-700 border-green-200",
  red: "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Badge({ label, variant = "slate" }: { label: string; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center border text-xs font-medium px-2 py-0.5 rounded-full ${cls[variant]}`}>
      {label}
    </span>
  );
}
