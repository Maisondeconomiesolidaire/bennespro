import { jsPDF } from "jspdf";
import type { Doc } from "../../convex/_generated/dataModel";
import { companyDepotUrl, makeQrDataUrl } from "./qr";

/**
 * Étiquette QR d'entreprise pour Brother QL-500 :
 * format 62 × 29 mm (rouleaux DK 62 mm — DK-22205 / DK-11209).
 * QR à gauche, nom de l'entreprise à droite.
 */
export const LABEL_W = 62;
export const LABEL_H = 29;

export async function generateCompanyLabelPdf(
  company: Pick<Doc<"bpCompanies">, "_id" | "name"> & { siret?: string },
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: [LABEL_W, LABEL_H], orientation: "landscape" });

  const qr = await makeQrDataUrl(companyDepotUrl(company._id), 600);

  // QR plein cadre à gauche (25 mm, marge 2 mm).
  const qrSize = LABEL_H - 4;
  doc.addImage(qr, "PNG", 2, 2, qrSize, qrSize);

  // À droite du QR : nom de l'entreprise + SIRET.
  const textX = qrSize + 5;
  const textW = LABEL_W - textX - 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  let nameLines = doc.splitTextToSize(company.name, textW) as string[];
  if (nameLines.length > 3) {
    nameLines = nameLines.slice(0, 3);
    nameLines[2] = nameLines[2].replace(/.{2}$/, "…");
  }
  doc.text(nameLines, textX, 9);

  if (company.siret) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`SIRET ${company.siret}`, textX, 9 + nameLines.length * 4.6 + 2.5);
  }

  const slug = company.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  doc.save(`etiquette-${slug || "entreprise"}.pdf`);
}
