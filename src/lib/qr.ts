import QRCode from "qrcode";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * URL encodée dans le QR code d'une entreprise : ouvre l'app directement sur
 * un nouveau dépôt avec l'entreprise présélectionnée.
 */
export function companyDepotUrl(companyId: Id<"bpCompanies">): string {
  const appUrl = import.meta.env.VITE_BENNESPRO_URL || window.location.origin;
  return `${appUrl.replace(/\/$/, "")}/?entreprise=${companyId}`;
}

/** Génère un QR code en data URL PNG (haute résolution pour l'impression). */
export async function makeQrDataUrl(text: string, sizePx = 600): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: sizePx,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Extrait l'id d'entreprise d'un QR scanné : URL de l'app (`?entreprise=…`)
 * ou id Convex brut.
 */
export function parseScannedCompanyId(text: string): Id<"bpCompanies"> | null {
  try {
    const url = new URL(text);
    const param = url.searchParams.get("entreprise");
    if (param) return param as Id<"bpCompanies">;
  } catch {
    // Pas une URL : on tente l'id brut.
  }
  const trimmed = text.trim();
  if (/^[a-z0-9]{20,40}$/i.test(trimmed)) return trimmed as Id<"bpCompanies">;
  return null;
}
