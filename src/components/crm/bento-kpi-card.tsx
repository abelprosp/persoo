import { cn } from "@/lib/utils";

const ACCENTS = [
  "from-emerald-500/15 to-teal-500/5",
  "from-sky-500/15 to-blue-500/5",
  "from-violet-500/15 to-purple-500/5",
  "from-amber-500/12 to-orange-500/5",
  "from-rose-500/12 to-pink-500/5",
] as const;

type Props = {
  label: string;
  value: string;
  index: number;
  badge?: string;
};

export function BentoKpiCard({ label, value, index, badge }: Props) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-slate-900/[0.04] ring-1 ring-white/80 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-gradient-to-br opacity-90 blur-2xl",
          accent
        )}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          {badge ? (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-500/20">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
          {value}
        </p>
        <div
          className="mt-4 flex h-7 items-end gap-0.5 opacity-50 group-hover:opacity-70"
          aria-hidden
        >
          {[10, 16, 12, 22, 14, 24, 18].map((px, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-sky-500 to-violet-400"
              style={{ height: `${px}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
