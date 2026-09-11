import type { Doc } from "../../convex/_generated/dataModel";

export type CompanyType = NonNullable<Doc<"bpCompanies">["companyType"]>;
export type TradeCategory = NonNullable<Doc<"bpCompanies">["tradeCategory"]>;
export type DocType = Doc<"bpCompanyDocuments">["docType"];

/** Libellés des profils d'entreprise (ordre d'affichage du formulaire). */
export const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: "artisan", label: "Artisan" },
  { value: "btp", label: "Entreprise du BTP" },
  { value: "distributeur", label: "Distributeur / commerçant" },
  { value: "industrie", label: "Petites industries" },
  { value: "autre", label: "Autre" },
];

export const TRADE_CATEGORY_OPTIONS: { value: TradeCategory; label: string }[] = [
  { value: "gros_oeuvre", label: "Gros œuvre" }, { value: "charpente", label: "Charpente" },
  { value: "couverture", label: "Couverture" }, { value: "facade", label: "Façade" },
  { value: "isolation", label: "Isolation" }, { value: "menuiseries_exterieures", label: "Menuiseries extérieures" },
  { value: "menuiserie_interieure", label: "Menuiserie intérieure" }, { value: "electricite", label: "Électricité" },
  { value: "photovoltaique", label: "Photovoltaïque" }, { value: "chauffage", label: "Chauffage" },
  { value: "pompes_a_chaleur", label: "Pompes à chaleur" }, { value: "ventilation", label: "Ventilation" },
  { value: "plomberie", label: "Plomberie" }, { value: "salle_de_bains", label: "Salle de bains" },
  { value: "poeles_cheminees", label: "Poêles & cheminées" }, { value: "solaire_thermique", label: "Solaire thermique" },
  { value: "eau_chaude_sanitaire", label: "Eau chaude sanitaire" }, { value: "platrerie", label: "Plâtrerie" },
  { value: "peinture", label: "Peinture" }, { value: "sols", label: "Sols" },
  { value: "cuisine", label: "Cuisine" }, { value: "amenagement_interieur", label: "Aménagement intérieur" },
  { value: "accessibilite_adaptation", label: "Accessibilité / adaptation" }, { value: "ascenseurs", label: "Ascenseurs" },
  { value: "etancheite", label: "Étanchéité" }, { value: "humidite", label: "Humidité" },
  { value: "traitement_du_bois", label: "Traitement du bois" }, { value: "amenagement_exterieur", label: "Aménagement extérieur" },
  { value: "terrassement_vrd", label: "Terrassement / VRD" }, { value: "piscine", label: "Piscine" },
  { value: "construction", label: "Construction" }, { value: "renovation_generale", label: "Rénovation générale" },
  { value: "maitrise_oeuvre", label: "Maîtrise d’œuvre" }, { value: "architecture", label: "Architecture" },
  { value: "etudes_diagnostics", label: "Études / diagnostics" },
];

export function tradeCategoryLabel(category?: TradeCategory): string {
  return TRADE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? "—";
}

const COMPANY_TYPE_LABELS = Object.fromEntries(
  COMPANY_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<CompanyType, string>;

/** Libellé lisible d'un profil (avec la précision libre si « autre »). */
export function companyTypeLabel(
  type: CompanyType | undefined,
  other?: string,
): string {
  if (!type) return "—";
  if (type === "autre") return other?.trim() ? `Autre — ${other.trim()}` : "Autre";
  return COMPANY_TYPE_LABELS[type] ?? "—";
}

/** Libellés des types de documents. */
export const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "kbis", label: "KBIS / avis de situation" },
  { value: "rib", label: "RIB" },
  { value: "assurance", label: "Assurance" },
  { value: "convention", label: "Convention signée" },
  { value: "protocole", label: "Protocole de sécurité signé" },
  { value: "autre", label: "Autre" },
];

export function docTypeLabel(type: DocType): string {
  return DOC_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Document";
}

/**
 * Documents obligatoires à signer par le client (téléchargement du modèle vierge,
 * signature, puis upload → considéré signé, en attente de validation staff).
 */
export const REQUIRED_DOCS: { type: DocType; label: string; template: string }[] = [
  { type: "convention", label: "Convention", template: "/convention.pdf" },
  { type: "protocole", label: "Protocole de sécurité", template: "/protocole-de-securite.pdf" },
];
