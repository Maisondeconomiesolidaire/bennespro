import type { Doc } from "../../convex/_generated/dataModel";

/** Matériau tel que stocké dans le backend (union de littéraux de bpDepots). */
export type Material = Doc<"bpDepots">["items"][number]["material"];
export type Unit = Doc<"bpDepots">["items"][number]["unit"];
export type DepotItem = Doc<"bpDepots">["items"][number];

/** Les 12 matériaux déposables (cartes de sélection). */
export const MATERIALS: Material[] = [
  "Réemploi",
  "Bois",
  "CSR",
  "Inertes/Gravats",
  "Laine de roche",
  "Laine de verre",
  "Menuiseries Vitrées",
  "Métaux",
  "Plastiques d'emballages et cartons",
  "Plastiques rigide",
  "Plâtres",
  "Tout venant/DIB non triés",
];

export const DIB_MATERIAL: Material = "Tout venant/DIB non triés";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "m3", label: "m³" },
  { value: "tonne", label: "tonne" },
  { value: "unite", label: "unité" },
];

export function unitLabel(unit: Unit): string {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}
