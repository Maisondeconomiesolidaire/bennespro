import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

type Period = "day" | "week" | "month" | "year";
type Bucket = {
  key: string;
  label: string;
  axisLabel: string;
  showAxisLabel: boolean;
  start: number;
  end: number;
  depots: number;
  companies: number;
};

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];
const STEP_MINUTES = 15;
const START_MINUTE = 7 * 60;
const END_MINUTE = 19 * 60;
const EMPTY_TIMESTAMPS: number[] = [];
const PLOT = { width: 960, height: 280, top: 12, right: 8, bottom: 34, left: 34 };

const DAY_TITLE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const MONTH_TITLE = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
const MONTH_SHORT = new Intl.DateTimeFormat("fr-FR", { month: "short" });

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function periodBounds(period: Period, anchor: Date) {
  if (period === "day") {
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 1), label: DAY_TITLE.format(start) };
  }
  if (period === "week") {
    const day = startOfDay(anchor);
    const start = addDays(day, -((day.getDay() + 6) % 7));
    const end = addDays(start, 7);
    return {
      start,
      end,
      label: `${SHORT_DATE.format(start)} – ${SHORT_DATE.format(addDays(end, -1))}`,
    };
  }
  if (period === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    return {
      start,
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
      label: MONTH_TITLE.format(start),
    };
  }
  const start = new Date(anchor.getFullYear(), 0, 1);
  return { start, end: new Date(anchor.getFullYear() + 1, 0, 1), label: String(start.getFullYear()) };
}

function movePeriod(date: Date, period: Period, amount: number) {
  if (period === "day") return addDays(date, amount);
  if (period === "week") return addDays(date, amount * 7);
  if (period === "month") return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  return new Date(date.getFullYear() + amount, 0, 1);
}

function timeLabel(minuteOfDay: number) {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
}

function emptyBuckets(period: Period, start: Date, end: Date): Bucket[] {
  if (period === "day") {
    const buckets: Bucket[] = [];
    for (let minute = START_MINUTE; minute < END_MINUTE; minute += STEP_MINUTES) {
      const bucketStart = new Date(start);
      bucketStart.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const bucketEnd = new Date(bucketStart.getTime() + STEP_MINUTES * 60 * 1000);
      buckets.push({
        key: String(minute),
        label: `${timeLabel(minute)} – ${timeLabel(minute + STEP_MINUTES)}`,
        axisLabel: `${Math.floor(minute / 60)}h`,
        showAxisLabel: minute % 60 === 0,
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
        depots: 0,
        companies: 0,
      });
    }
    return buckets;
  }

  const buckets: Bucket[] = [];
  if (period === "year") {
    for (let month = 0; month < 12; month++) {
      const bucketStart = new Date(start.getFullYear(), month, 1);
      const bucketEnd = new Date(start.getFullYear(), month + 1, 1);
      buckets.push({
        key: `${start.getFullYear()}-${month}`,
        label: MONTH_TITLE.format(bucketStart),
        axisLabel: MONTH_SHORT.format(bucketStart).replace(".", ""),
        showAxisLabel: true,
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
        depots: 0,
        companies: 0,
      });
    }
    return buckets;
  }

  for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
    const bucketStart = new Date(cursor);
    const bucketEnd = addDays(bucketStart, 1);
    const day = bucketStart.getDate();
    buckets.push({
      key: bucketStart.toISOString(),
      label: DAY_TITLE.format(bucketStart),
      axisLabel: period === "week" ? WEEKDAY.format(bucketStart).replace(".", "") : String(day),
      showAxisLabel: period === "week" || day === 1 || day % 5 === 0 || bucketEnd >= end,
      start: bucketStart.getTime(),
      end: bucketEnd.getTime(),
      depots: 0,
      companies: 0,
    });
  }
  return buckets;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

const HOURLY_SLOT_COUNT = (END_MINUTE - START_MINUTE) / STEP_MINUTES;
const HOURLY_PLOT = { width: 960, height: 260, top: 12, right: 8, bottom: 28, left: 34 };
const HOURLY_BAR_GAP = 2;
type HourSlot = { start: number; end: number; count: number };

/** Fréquentation historique par tranche de quinze minutes, de 7h à 19h. */
export function DepotsAttendance({ depots }: { depots: Array<{ createdAt: number }> }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { slots, outside, total, busiest } = useMemo(() => {
    const counts = new Array<number>(HOURLY_SLOT_COUNT).fill(0);
    let outsideRange = 0;
    for (const depot of depots) {
      const at = new Date(depot.createdAt);
      const minuteOfDay = at.getHours() * 60 + at.getMinutes();
      const index = Math.floor((minuteOfDay - START_MINUTE) / STEP_MINUTES);
      if (index < 0 || index >= HOURLY_SLOT_COUNT) {
        outsideRange++;
        continue;
      }
      counts[index]++;
    }
    const built: HourSlot[] = counts.map((count, index) => ({
      start: START_MINUTE + index * STEP_MINUTES,
      end: START_MINUTE + (index + 1) * STEP_MINUTES,
      count,
    }));
    const peak = built.reduce<HourSlot | null>(
      (best, slot) => (slot.count > 0 && (!best || slot.count > best.count) ? slot : best),
      null,
    );
    return {
      slots: built,
      outside: outsideRange,
      total: counts.reduce((sum, count) => sum + count, 0),
      busiest: peak,
    };
  }, [depots]);

  const maxCount = Math.max(1, ...slots.map((slot) => slot.count));
  const tickStep = Math.max(1, Math.ceil(maxCount / 4));
  const ticks: number[] = [];
  for (let value = 0; value <= maxCount; value += tickStep) ticks.push(value);

  const plotWidth = HOURLY_PLOT.width - HOURLY_PLOT.left - HOURLY_PLOT.right;
  const plotHeight = HOURLY_PLOT.height - HOURLY_PLOT.top - HOURLY_PLOT.bottom;
  const bandWidth = plotWidth / HOURLY_SLOT_COUNT;
  const barWidth = Math.max(3, bandWidth - HOURLY_BAR_GAP);
  const baseline = HOURLY_PLOT.top + plotHeight;
  const y = (count: number) => baseline - (count / maxCount) * plotHeight;
  const active = hovered !== null ? slots[hovered] : null;

  return (
    <div className="glass-card rounded-xl border border-[var(--border)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Clock className="h-4 w-4 text-brand-600" />
            Fréquentation par tranche de 15 minutes
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {total} dépôt{total > 1 ? "s" : ""} entre 07:00 et 19:00
            {busiest
              ? ` · pointe de ${busiest.count} dépôt${busiest.count > 1 ? "s" : ""} entre ${timeLabel(busiest.start)} et ${timeLabel(busiest.end)}`
              : ""}
            {outside > 0
              ? ` · ${outside} hors de cette plage, non représenté${outside > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${HOURLY_PLOT.width} ${HOURLY_PLOT.height}`}
          className="w-full"
          role="img"
          aria-label="Nombre de dépôts par tranche de quinze minutes, de 7h à 19h"
          onMouseLeave={() => setHovered(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={HOURLY_PLOT.left}
                x2={HOURLY_PLOT.width - HOURLY_PLOT.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={HOURLY_PLOT.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-[var(--muted-foreground)] text-[11px]"
              >
                {tick}
              </text>
            </g>
          ))}

          {slots.map((slot, index) => {
            const x = HOURLY_PLOT.left + index * bandWidth;
            const height = baseline - y(slot.count);
            const radius = Math.min(4, barWidth / 2, Math.max(height, 0));
            const isActive = hovered === index;
            return (
              <g key={slot.start}>
                <rect
                  x={x}
                  y={HOURLY_PLOT.top}
                  width={bandWidth}
                  height={plotHeight}
                  fill={isActive ? "var(--accent)" : "transparent"}
                  onMouseEnter={() => setHovered(index)}
                />
                {slot.count > 0 ? (
                  <path
                    d={`M ${x + HOURLY_BAR_GAP / 2} ${baseline}
                        V ${y(slot.count) + radius}
                        a ${radius} ${radius} 0 0 1 ${radius} ${-radius}
                        h ${barWidth - radius * 2}
                        a ${radius} ${radius} 0 0 1 ${radius} ${radius}
                        V ${baseline} Z`}
                    fill={isActive ? "var(--color-brand-700)" : "var(--color-brand-500)"}
                    pointerEvents="none"
                  />
                ) : null}
              </g>
            );
          })}

          {slots.map((slot, index) =>
            slot.start % 60 === 0 ? (
              <text
                key={`tick-${slot.start}`}
                x={HOURLY_PLOT.left + index * bandWidth + bandWidth / 2}
                y={HOURLY_PLOT.height - 8}
                textAnchor="middle"
                className="fill-[var(--muted-foreground)] text-[11px]"
              >
                {Math.floor(slot.start / 60)}h
              </text>
            ) : null,
          )}

          <line
            x1={HOURLY_PLOT.left}
            x2={HOURLY_PLOT.width - HOURLY_PLOT.right}
            y1={baseline}
            y2={baseline}
            stroke="var(--border)"
            strokeWidth={1}
          />
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${Math.min(92, Math.max(8, ((HOURLY_PLOT.left + (hovered! + 0.5) * bandWidth) / HOURLY_PLOT.width) * 100))}%`,
              bottom: "100%",
            }}
          >
            <p className="font-semibold text-[var(--foreground)]">
              {timeLabel(active.start)} – {timeLabel(active.end)}
            </p>
            <p className="text-[var(--muted-foreground)]">
              {active.count} dépôt{active.count > 1 ? "s" : ""}
            </p>
          </div>
        ) : null}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-[var(--muted-foreground)]">
          Voir le détail chiffré
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Tranche</th>
                <th className="px-3 py-2 text-left font-medium">Dépôts</th>
              </tr>
            </thead>
            <tbody>
              {slots
                .filter((slot) => slot.count > 0)
                .map((slot) => (
                  <tr key={slot.start} className="border-t border-[var(--border)]">
                    <td className="px-3 py-1.5 text-[var(--foreground)]">
                      {timeLabel(slot.start)} – {timeLabel(slot.end)}
                    </td>
                    <td className="px-3 py-1.5 text-[var(--muted-foreground)]">{slot.count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Rapport de fréquentation et d'inscriptions d'entreprises par période. */
export function AttendanceReport() {
  const [period, setPeriod] = useState<Period>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [hovered, setHovered] = useState<number | null>(null);
  const bounds = useMemo(() => periodBounds(period, anchor), [period, anchor]);
  const stats = useQuery(api.bennespro.attendanceStats, {
    from: bounds.start.getTime(),
    to: bounds.end.getTime(),
  });

  const depotTimestamps = stats?.depotTimestamps ?? EMPTY_TIMESTAMPS;
  const companyTimestamps = stats?.companyTimestamps ?? EMPTY_TIMESTAMPS;
  const { buckets, depotsOutside, companiesOutside } = useMemo(() => {
    const built = emptyBuckets(period, bounds.start, bounds.end);
    let outsideDepots = 0;
    let outsideCompanies = 0;
    const add = (timestamp: number, field: "depots" | "companies") => {
      const bucket = built.find((candidate) => timestamp >= candidate.start && timestamp < candidate.end);
      if (bucket) bucket[field]++;
      else if (field === "depots") outsideDepots++;
      else outsideCompanies++;
    };
    for (const timestamp of depotTimestamps) add(timestamp, "depots");
    for (const timestamp of companyTimestamps) add(timestamp, "companies");
    return { buckets: built, depotsOutside: outsideDepots, companiesOutside: outsideCompanies };
  }, [period, bounds.start, bounds.end, depotTimestamps, companyTimestamps]);

  const maxCount = Math.max(1, ...buckets.flatMap((bucket) => [bucket.depots, bucket.companies]));
  const tickStep = Math.max(1, Math.ceil(maxCount / 4));
  const ticks: number[] = [];
  for (let value = 0; value <= maxCount; value += tickStep) ticks.push(value);

  const plotWidth = PLOT.width - PLOT.left - PLOT.right;
  const plotHeight = PLOT.height - PLOT.top - PLOT.bottom;
  const bandWidth = plotWidth / buckets.length;
  const barGap = Math.min(2, bandWidth * 0.08);
  const barWidth = Math.max(2, Math.min(18, (bandWidth - barGap * 3) / 2));
  const barsWidth = barWidth * 2 + barGap;
  const baseline = PLOT.top + plotHeight;
  const y = (count: number) => baseline - (count / maxCount) * plotHeight;
  const active = hovered !== null ? buckets[hovered] ?? null : null;
  const now = Date.now();
  const currentPeriod = now >= bounds.start.getTime() && now < bounds.end.getTime();
  const periodLabel =
    period === "day"
      ? "cette journée"
      : period === "week"
        ? "cette semaine"
        : period === "month"
          ? "ce mois"
          : "cette année";
  const nonEmptyBuckets = buckets.filter((bucket) => bucket.depots > 0 || bucket.companies > 0);

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 sm:p-4">
        <div
          role="group"
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1"
          aria-label="Période d'analyse"
        >
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => {
                setPeriod(option.value);
                setHovered(null);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                period === option.value
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Période précédente"
            onClick={() => {
              setAnchor(movePeriod(bounds.start, period, -1));
              setHovered(null);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-40 text-center text-sm font-semibold capitalize text-[var(--foreground)] sm:min-w-56">
            {bounds.label}
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Période suivante"
            disabled={currentPeriod}
            onClick={() => {
              setAnchor(movePeriod(bounds.start, period, 1));
              setHovered(null);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!currentPeriod ? (
            <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
              Aujourd’hui
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AttendanceCard icon={Clock} label={`Passages ${periodLabel}`} value={stats === undefined ? null : depotTimestamps.length} />
        <AttendanceCard icon={Building2} label={`Inscriptions d’entreprises ${periodLabel}`} value={stats === undefined ? null : companyTimestamps.length} />
      </div>

      <div className="glass-card rounded-xl border border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              Passages et inscriptions
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {period === "day"
                ? "Détail par tranche de 15 minutes, de 07:00 à 19:00."
                : period === "year"
                  ? "Détail mensuel sur l’année sélectionnée."
                  : "Détail quotidien sur la période sélectionnée."}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-brand-500)]" />Passages</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />Inscriptions</span>
          </div>
        </div>

        {stats === undefined ? (
          <div className="flex h-72 items-center justify-center"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <div className="relative mt-4">
              <svg
                viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
                className="w-full"
                role="img"
                aria-label={`Nombre de passages et d'inscriptions d'entreprises pour ${bounds.label}`}
                onMouseLeave={() => setHovered(null)}
              >
                {ticks.map((tick) => (
                  <g key={tick}>
                    <line x1={PLOT.left} x2={PLOT.width - PLOT.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
                    <text x={PLOT.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-[var(--muted-foreground)] text-[11px]">{tick}</text>
                  </g>
                ))}

                {buckets.map((bucket, index) => {
                  const groupX = PLOT.left + index * bandWidth + (bandWidth - barsWidth) / 2;
                  const isActive = hovered === index;
                  return (
                    <g key={bucket.key}>
                      <rect
                        x={PLOT.left + index * bandWidth}
                        y={PLOT.top}
                        width={bandWidth}
                        height={plotHeight}
                        fill={isActive ? "var(--accent)" : "transparent"}
                        onMouseEnter={() => setHovered(index)}
                      />
                      {bucket.depots > 0 ? (
                        <rect x={groupX} y={y(bucket.depots)} width={barWidth} height={baseline - y(bucket.depots)} rx={Math.min(3, barWidth / 2)} fill={isActive ? "var(--color-brand-700)" : "var(--color-brand-500)"} pointerEvents="none" />
                      ) : null}
                      {bucket.companies > 0 ? (
                        <rect x={groupX + barWidth + barGap} y={y(bucket.companies)} width={barWidth} height={baseline - y(bucket.companies)} rx={Math.min(3, barWidth / 2)} fill={isActive ? "#0284c7" : "#38bdf8"} pointerEvents="none" />
                      ) : null}
                      {bucket.showAxisLabel ? (
                        <text x={PLOT.left + (index + 0.5) * bandWidth} y={PLOT.height - 9} textAnchor="middle" className="fill-[var(--muted-foreground)] text-[11px]">{bucket.axisLabel}</text>
                      ) : null}
                    </g>
                  );
                })}

                <line x1={PLOT.left} x2={PLOT.width - PLOT.right} y1={baseline} y2={baseline} stroke="var(--border)" strokeWidth={1} />
              </svg>

              {active ? (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: `${Math.min(92, Math.max(8, ((PLOT.left + (hovered! + 0.5) * bandWidth) / PLOT.width) * 100))}%`,
                    bottom: "100%",
                  }}
                >
                  <p className="font-semibold capitalize text-[var(--foreground)]">{active.label}</p>
                  <p className="text-[var(--muted-foreground)]">{plural(active.depots, "passage")}</p>
                  <p className="text-[var(--muted-foreground)]">{plural(active.companies, "inscription")}</p>
                </div>
              ) : null}
            </div>

            {period === "day" && (depotsOutside > 0 || companiesOutside > 0) ? (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Hors de la plage 07:00–19:00 : {plural(depotsOutside, "passage")} et {plural(companiesOutside, "inscription")} inclus dans les totaux.
              </p>
            ) : null}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-[var(--muted-foreground)]">Voir le détail chiffré</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Période</th>
                      <th className="px-3 py-2 text-left font-medium">Passages</th>
                      <th className="px-3 py-2 text-left font-medium">Inscriptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonEmptyBuckets.length === 0 ? (
                      <tr className="border-t border-[var(--border)]"><td colSpan={3} className="px-3 py-3 text-[var(--muted-foreground)]">Aucune activité sur cette période.</td></tr>
                    ) : (
                      nonEmptyBuckets.map((bucket) => (
                          <tr key={bucket.key} className="border-t border-[var(--border)]">
                            <td className="px-3 py-1.5 capitalize text-[var(--foreground)]">{bucket.label}</td>
                            <td className="px-3 py-1.5 text-[var(--muted-foreground)]">{bucket.depots}</td>
                            <td className="px-3 py-1.5 text-[var(--muted-foreground)]">{bucket.companies}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

function AttendanceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: number | null;
}) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
        {value === null ? <Spinner className="mt-1 h-4 w-4" /> : <p className="text-xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>}
      </div>
    </div>
  );
}
