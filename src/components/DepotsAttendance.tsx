import { useMemo, useState } from "react";
import { Clock } from "lucide-react";

/** Bornes de la journée observée et pas de la mesure, en minutes. */
const START_MINUTE = 7 * 60;
const END_MINUTE = 19 * 60;
const STEP_MINUTES = 15;
const SLOT_COUNT = (END_MINUTE - START_MINUTE) / STEP_MINUTES;

/** Géométrie du tracé, en unités SVG (le conteneur le met à l'échelle). */
const PLOT = { width: 960, height: 260, top: 12, right: 8, bottom: 28, left: 34 };
const BAR_GAP = 2;

function label(minuteOfDay: number) {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
}

type Slot = { start: number; end: number; count: number };

/**
 * Fréquentation par tranche de quinze minutes, de 7h à 19h.
 *
 * Une seule série, donc pas de légende : le titre nomme ce qui est compté. Les
 * heures pleines seules sont étiquetées — quarante-huit étiquettes se
 * chevaucheraient — et la valeur exacte de chaque tranche se lit au survol,
 * plutôt que d'imprimer quarante-huit nombres sur le tracé.
 */
export function DepotsAttendance({ depots }: { depots: Array<{ createdAt: number }> }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { slots, outside, total, busiest } = useMemo(() => {
    const counts = new Array<number>(SLOT_COUNT).fill(0);
    let outsideRange = 0;
    for (const depot of depots) {
      const at = new Date(depot.createdAt);
      const minuteOfDay = at.getHours() * 60 + at.getMinutes();
      const index = Math.floor((minuteOfDay - START_MINUTE) / STEP_MINUTES);
      if (index < 0 || index >= SLOT_COUNT) {
        outsideRange++;
        continue;
      }
      counts[index]++;
    }
    const built: Slot[] = counts.map((count, index) => ({
      start: START_MINUTE + index * STEP_MINUTES,
      end: START_MINUTE + (index + 1) * STEP_MINUTES,
      count,
    }));
    const peak = built.reduce<Slot | null>(
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
  // Une graduation lisible : au plus cinq repères, sur des entiers.
  const tickStep = Math.max(1, Math.ceil(maxCount / 4));
  const ticks: number[] = [];
  for (let value = 0; value <= maxCount; value += tickStep) ticks.push(value);

  const plotWidth = PLOT.width - PLOT.left - PLOT.right;
  const plotHeight = PLOT.height - PLOT.top - PLOT.bottom;
  const bandWidth = plotWidth / SLOT_COUNT;
  const barWidth = Math.max(3, bandWidth - BAR_GAP);
  const baseline = PLOT.top + plotHeight;
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
              ? ` · pointe de ${busiest.count} dépôt${busiest.count > 1 ? "s" : ""} entre ${label(busiest.start)} et ${label(busiest.end)}`
              : ""}
            {outside > 0
              ? ` · ${outside} hors de cette plage, non représenté${outside > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          className="w-full"
          role="img"
          aria-label="Nombre de dépôts par tranche de quinze minutes, de 7h à 19h"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Grille : elle situe sans jamais concurrencer les barres. */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PLOT.left}
                x2={PLOT.width - PLOT.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PLOT.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-[var(--muted-foreground)] text-[11px]"
              >
                {tick}
              </text>
            </g>
          ))}

          {slots.map((slot, index) => {
            const x = PLOT.left + index * bandWidth;
            const height = baseline - y(slot.count);
            const radius = Math.min(4, barWidth / 2, Math.max(height, 0));
            const isActive = hovered === index;
            return (
              <g key={slot.start}>
                {/* La cible de survol couvre toute la colonne : viser une barre
                    de trois pixels de haut serait impossible. */}
                <rect
                  x={x}
                  y={PLOT.top}
                  width={bandWidth}
                  height={plotHeight}
                  fill={isActive ? "var(--accent)" : "transparent"}
                  onMouseEnter={() => setHovered(index)}
                />
                {slot.count > 0 ? (
                  <path
                    d={`M ${x + BAR_GAP / 2} ${baseline}
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

          {/* Axe des heures : une étiquette par heure pleine. */}
          {slots.map((slot, index) =>
            slot.start % 60 === 0 ? (
              <text
                key={`tick-${slot.start}`}
                x={PLOT.left + index * bandWidth + bandWidth / 2}
                y={PLOT.height - 8}
                textAnchor="middle"
                className="fill-[var(--muted-foreground)] text-[11px]"
              >
                {Math.floor(slot.start / 60)}h
              </text>
            ) : null,
          )}

          <line
            x1={PLOT.left}
            x2={PLOT.width - PLOT.right}
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
              // Bornée : aux extrémités, une infobulle centrée sur la barre
              // déborderait de la carte.
              left: `${Math.min(92, Math.max(8, ((PLOT.left + (hovered! + 0.5) * bandWidth) / PLOT.width) * 100))}%`,
              bottom: "100%",
            }}
          >
            <p className="font-semibold text-[var(--foreground)]">
              {label(active.start)} – {label(active.end)}
            </p>
            <p className="text-[var(--muted-foreground)]">
              {active.count} dépôt{active.count > 1 ? "s" : ""}
            </p>
          </div>
        ) : null}
      </div>

      {/* Le tracé se lit à l'œil, le tableau se lit au clavier et à la voix. */}
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
                      {label(slot.start)} – {label(slot.end)}
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
