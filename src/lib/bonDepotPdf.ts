import { jsPDF } from "jspdf";
import type { Doc } from "../../convex/_generated/dataModel";
import { unitLabel } from "./materials";

type Company = Doc<"bpCompanies"> | null;
type Vehicle = Doc<"bpVehicles"> | null;

export type BonDepotData = {
  depotNumber: number;
  createdAt: number;
  depositorName: string;
  siteRef: string;
  items: Doc<"bpDepots">["items"];
  comment?: string;
  company: Company;
  vehicle: Vehicle;
  signatureUrl: string | null;
};

/** Taille maximale autorisée pour un bon de dépôt PDF. */
const MAX_PDF_BYTES = 3 * 1024 * 1024;

type PreparedImage = { dataUrl: string; format: "PNG" | "JPEG"; width: number; height: number };

/**
 * Charge une image (URL ou data URL), la redimensionne pour que sa plus grande
 * dimension ne dépasse pas `maxDimPx`, et la ré-encode. En JPEG l'image est
 * aplatie sur fond blanc (pas de transparence). Sert à borner le poids du PDF.
 */
async function prepareImage(
  url: string,
  maxDimPx: number,
  format: "PNG" | "JPEG" = "PNG",
  quality = 0.92,
): Promise<PreparedImage | null> {
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    if (!img) return null;

    const natW = img.naturalWidth || img.width || 1;
    const natH = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxDimPx / Math.max(natW, natH));
    const w = Math.max(1, Math.round(natW * scale));
    const h = Math.max(1, Math.round(natH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (format === "JPEG") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl =
      format === "JPEG" ? canvas.toDataURL("image/jpeg", quality) : canvas.toDataURL("image/png");
    return { dataUrl, format, width: w, height: h };
  } catch {
    return null;
  }
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BRAND = { r: 42, g: 167, b: 155 };
const DARK = { r: 16, g: 51, b: 47 };
const MUTED = { r: 110, g: 120, b: 114 };

/** Génère et télécharge le bon de dépôt PDF (A4). */
export async function generateBonDepotPdf(data: BonDepotData): Promise<void> {
  const doc = await buildWithinSizeLimit(data);
  doc.save(`bon-depot-${String(data.depotNumber).padStart(4, "0")}.pdf`);
}

/** Génère le bon de dépôt et le renvoie en base64 (pièce jointe email). */
export async function generateBonDepotPdfBase64(data: BonDepotData): Promise<string> {
  const doc = await buildWithinSizeLimit(data);
  return doc.output("datauristring").split(",")[1];
}

/** Options de rendu des images, resserrées à chaque tentative si le PDF est trop lourd. */
type BuildOpts = {
  logoMaxPx: number;
  sigMaxPx: number; // 0 = ne pas inclure la signature
  sigFormat: "PNG" | "JPEG";
  sigQuality: number;
};

/**
 * Construit le bon de dépôt en garantissant un poids ≤ 3 Mo : on tente d'abord
 * un rendu de qualité (signature PNG), puis on dégrade progressivement la
 * compression des images tant que le fichier dépasse la limite, jusqu'à retirer
 * la signature en dernier recours.
 */
async function buildWithinSizeLimit(data: BonDepotData): Promise<jsPDF> {
  const attempts: BuildOpts[] = [
    { logoMaxPx: 320, sigMaxPx: 600, sigFormat: "PNG", sigQuality: 1 },
    { logoMaxPx: 320, sigMaxPx: 500, sigFormat: "JPEG", sigQuality: 0.7 },
    { logoMaxPx: 240, sigMaxPx: 400, sigFormat: "JPEG", sigQuality: 0.5 },
    { logoMaxPx: 200, sigMaxPx: 320, sigFormat: "JPEG", sigQuality: 0.3 },
    { logoMaxPx: 160, sigMaxPx: 0, sigFormat: "JPEG", sigQuality: 0.3 },
  ];

  let doc: jsPDF | null = null;
  for (const opts of attempts) {
    doc = await buildBonDepotDoc(data, opts);
    if (doc.output("blob").size <= MAX_PDF_BYTES) return doc;
  }
  return doc!; // meilleur effort : dernière tentative (sans signature)
}

/** Construit le document jsPDF du bon de dépôt (A4). */
async function buildBonDepotDoc(data: BonDepotData, opts: BuildOpts): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  // ── En-tête : logo Déchet'Lab + titre ────────────────────────────────────
  const logo = await prepareImage("/logo.png", opts.logoMaxPx, "PNG");
  if (logo) {
    const logoH = 26;
    const logoW = (logo.width / logo.height) * logoH;
    doc.addImage(logo.dataUrl, "PNG", margin - 2, 5, logoW, logoH);
  }

  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("BON DE DÉPÔT", pageW - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`N° ${String(data.depotNumber).padStart(4, "0")}`, pageW - margin, 21, { align: "right" });
  doc.text(fmtDate(data.createdAt), pageW - margin, 26.5, { align: "right" });

  // Filet de marque sous l'en-tête.
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.8);
  doc.line(margin, 35, pageW - margin, 35);
  doc.setLineWidth(0.2);

  y = 43;
  doc.setTextColor(0, 0, 0);

  // ── Blocs Entreprise / Dépôt ───────────────────────────────────────────────
  const colW = (pageW - margin * 2 - 8) / 2;
  const boxTop = y;

  function sectionTitle(label: string, x: number, yy: number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(label.toUpperCase(), x, yy);
    doc.setTextColor(0, 0, 0);
  }

  function line(label: string, value: string, x: number, yy: number, w: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(label, x, yy);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value || "—", w);
    doc.text(lines, x, yy + 4.5);
    return yy + 4.5 + lines.length * 4.5 + 2.5;
  }

  // Colonne gauche : entreprise
  let ly = boxTop;
  sectionTitle("Entreprise", margin, ly);
  ly += 6;
  ly = line("Nom", data.company?.name ?? "—", margin, ly, colW);
  ly = line("SIRET", data.company?.siret ?? "—", margin, ly, colW);
  ly = line("Adresse", data.company?.address ?? "—", margin, ly, colW);
  if (data.company?.contactName || data.company?.contactPhone) {
    ly = line(
      "Contact",
      [data.company?.contactName, data.company?.contactPhone].filter(Boolean).join(" · "),
      margin,
      ly,
      colW,
    );
  }

  // Colonne droite : dépôt
  const rx = margin + colW + 8;
  let ry = boxTop;
  sectionTitle("Dépôt", rx, ry);
  ry += 6;
  ry = line("Véhicule", data.vehicle?.label ?? "—", rx, ry, colW);
  if (data.vehicle?.plate) ry = line("Immatriculation", data.vehicle.plate, rx, ry, colW);
  ry = line("Déposant", data.depositorName, rx, ry, colW);
  ry = line("Réf. chantier", data.siteRef, rx, ry, colW);

  y = Math.max(ly, ry) + 6;

  // ── Table des déchets ──────────────────────────────────────────────────────
  sectionTitle("Déchets déposés", margin, y);
  y += 5;

  const tableX = margin;
  const tableW = pageW - margin * 2;
  const cols = [
    { key: "material", label: "Matériau", w: tableW * 0.45 },
    { key: "quantity", label: "Quantité", w: tableW * 0.17 },
    { key: "unit", label: "Unité", w: tableW * 0.13 },
    { key: "siteRef", label: "Réf. chantier", w: tableW * 0.25 },
  ];

  // En-tête de table
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.rect(tableX, y, tableW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let cx = tableX + 3;
  for (const col of cols) {
    doc.text(col.label, cx, y + 5.3);
    cx += col.w;
  }
  y += 8;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  data.items.forEach((item, i) => {
    const cells = [
      item.material,
      String(item.quantity),
      unitLabel(item.unit),
      item.siteRef || "—",
    ];
    // Hauteur de ligne selon le wrap du libellé matériau.
    const matLines = doc.splitTextToSize(cells[0], cols[0].w - 6);
    const rowH = Math.max(7, matLines.length * 4.4 + 3);

    if (y + rowH > pageH - 60) {
      doc.addPage();
      y = margin;
    }

    if (i % 2 === 1) {
      doc.setFillColor(244, 247, 245);
      doc.rect(tableX, y, tableW, rowH, "F");
    }

    cx = tableX + 3;
    cols.forEach((col, ci) => {
      const text = ci === 0 ? matLines : cells[ci];
      doc.text(text, cx, y + 4.8);
      cx += col.w;
    });
    y += rowH;
  });

  // Filet bas de table
  doc.setDrawColor(210, 220, 213);
  doc.line(tableX, y, tableX + tableW, y);
  y += 6;

  // ── Commentaire ────────────────────────────────────────────────────────────
  if (data.comment && data.comment.trim()) {
    sectionTitle("Commentaire", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const cLines = doc.splitTextToSize(data.comment.trim(), tableW);
    doc.text(cLines, margin, y);
    y += cLines.length * 4.4 + 4;
  }

  // ── Signature (bas de page) ────────────────────────────────────────────────
  const sigTop = pageH - 48;
  doc.setDrawColor(210, 220, 213);
  doc.line(margin, sigTop - 4, pageW - margin, sigTop - 4);
  sectionTitle("Signature du déposant", margin, sigTop + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`${data.depositorName} — le ${fmtDate(data.createdAt)}`, margin, sigTop + 7);

  if (data.signatureUrl && opts.sigMaxPx > 0) {
    const img = await prepareImage(data.signatureUrl, opts.sigMaxPx, opts.sigFormat, opts.sigQuality);
    if (img) {
      const maxW = 60;
      const maxH = 26;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img.dataUrl, img.format, pageW - margin - w, sigTop, w, h);
    }
  }

  return doc;
}
