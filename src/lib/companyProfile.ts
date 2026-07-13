import type { Doc } from "../../convex/_generated/dataModel";

export type CompanyType = NonNullable<Doc<"bpCompanies">["companyType"]>;
export type DocType = Doc<"bpCompanyDocuments">["docType"];

/** Libellés des profils d'entreprise (ordre d'affichage du formulaire). */
export const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: "artisan", label: "Artisan" },
  { value: "btp", label: "Entreprise du BTP" },
  { value: "distributeur", label: "Distributeur / commerçant" },
  { value: "industrie", label: "Petites industries" },
  { value: "autre", label: "Autre" },
];

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
