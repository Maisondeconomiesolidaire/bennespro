import type { Doc } from "../../convex/_generated/dataModel";

/** Matériau tel que stocké dans le backend (union de littéraux de bpDepots). */
export type Material = Doc<"bpDepots">["items"][number]["material"];
export type Unit = Doc<"bpDepots">["items"][number]["unit"];
export type DepotItem = Doc<"bpDepots">["items"][number];

/** Matériaux déposables affichés en cartes de sélection. */
export const MATERIALS: Material[] = [
  "Réemploi",
  "Bois",
  "CSR",
  "DEEE",
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

export const ECODDS_SUBMATERIALS: Material[] = [
  "ECODDS - Pateux",
  "ECODDS - Aerosols",
  "ECODDS - Bases",
  "ECODDS - Pateux acrylique",
  "ECODDS - Phytosanitaire",
  "ECODDS - Acides",
  "ECODDS - Outillage du peintre",
  "ECODDS - Peinture",
];

export const DIB_MATERIAL: Material = "Tout venant/DIB non triés";
export const WOOD_MATERIAL: Material = "Bois";
export const DEEE_MATERIAL: Material = "DEEE";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "m3", label: "m³" },
  { value: "tonne", label: "tonne" },
  { value: "unite", label: "unité" },
];

export function allowedUnitsForMaterial(material: Material): Unit[] {
  if (material === DEEE_MATERIAL) {
    return ["kg", "tonne", "unite"];
  }
  if (ECODDS_SUBMATERIALS.includes(material)) {
    return ["unite"];
  }
  return UNITS.map((unit) => unit.value);
}

export function unitLabel(unit: Unit): string {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}
