import type { Doc } from "../../convex/_generated/dataModel";
import { companyDepotUrl, makeQrDataUrl } from "./qr";

export const LABEL_W_MM = 62;
export const LABEL_H_MM = 29;
const DPI = 300;
const PX_PER_MM = DPI / 25.4;
const LABEL_W_PX = Math.round(LABEL_W_MM * PX_PER_MM);
const LABEL_H_PX = Math.round(LABEL_H_MM * PX_PER_MM);

type Company = Pick<Doc<"bpCompanies">, "_id" | "name"> & { siret?: string };

export async function generateCompanyLabelPngDataUrl(company: Company): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_W_PX;
  canvas.height = LABEL_H_PX;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de générer l'image QR.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = Math.round(2 * PX_PER_MM);
  const qrSize = LABEL_H_PX - padding * 2;
  const qrImage = await loadImage(await makeQrDataUrl(companyDepotUrl(company._id), qrSize));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, padding, padding, qrSize, qrSize);

  const textX = padding + qrSize + Math.round(3 * PX_PER_MM);
  const textRight = canvas.width - padding;
  const textWidth = textRight - textX;

  ctx.fillStyle = "#111111";
  ctx.font = `700 ${Math.round(3.2 * PX_PER_MM)}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = "top";
  const nameLines = wrapText(ctx, company.name, textWidth, 3);
  let y = Math.round(6.2 * PX_PER_MM);
  for (const line of nameLines) {
    ctx.fillText(line, textX, y);
    y += Math.round(4.4 * PX_PER_MM);
  }

  if (company.siret) {
    ctx.fillStyle = "#4b5563";
    ctx.font = `400 ${Math.round(2.25 * PX_PER_MM)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(`SIRET ${company.siret}`, textX, y + Math.round(1.4 * PX_PER_MM));
  }

  return canvas.toDataURL("image/png");
}

export async function downloadCompanyLabelPng(company: Company): Promise<void> {
  const pngUrl = await generateCompanyLabelPngDataUrl(company);
  const link = document.createElement("a");
  link.download = `etiquette-${slugify(company.name) || "entreprise"}-62x29mm.png`;
  link.href = pngUrl;
  link.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger le QR code."));
    image.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}...`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return value.length < text.length ? `${value}...` : value;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
