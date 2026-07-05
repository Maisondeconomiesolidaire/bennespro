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

/** Charge une image (URL) en data URL PNG pour l'incorporer au PDF. */
async function loadImage(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
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
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  // ── En-tête : logo Déchet'Lab + titre ────────────────────────────────────
  const logo = await loadImage("/logo.png");
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

  if (data.signatureUrl) {
    const img = await loadImage(data.signatureUrl);
    if (img) {
      const maxW = 60;
      const maxH = 26;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img.dataUrl, "PNG", pageW - margin - w, sigTop, w, h);
    }
  }

  doc.save(`bon-depot-${String(data.depotNumber).padStart(4, "0")}.pdf`);
}
