import { useEffect, useState } from "react";
import { Download, Printer, QrCode } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import { companyDepotUrl, makeQrDataUrl } from "../lib/qr";
import { generateCompanyLabelPdf } from "../lib/companyLabelPdf";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

type Company = Pick<Doc<"bpCompanies">, "_id" | "name"> & { siret?: string };

/**
 * QR code d'une entreprise : scanné, il ouvre directement un nouveau dépôt
 * avec l'entreprise présélectionnée. Étiquette au format Brother QL-500
 * (62 × 29 mm, rouleaux DK 62 mm).
 */
export function CompanyQrModal({
  company,
  onClose,
  justCreated = false,
}: {
  company: Company | null;
  onClose: () => void;
  justCreated?: boolean;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company) {
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    void makeQrDataUrl(companyDepotUrl(company._id), 480).then((url) => {
      if (!cancelled) setQrUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [company]);

  async function handleDownload() {
    if (!company) return;
    setBusy(true);
    try {
      await generateCompanyLabelPdf(company);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={company !== null}
      onClose={onClose}
      title={justCreated ? "Entreprise créée !" : "QR code de l'entreprise"}
      className="sm:h-auto sm:max-h-[85vh] sm:w-[480px]"
    >
      {company ? (
        <div className="flex flex-col items-center text-center">
          {justCreated ? (
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Le QR code de <strong className="text-[var(--foreground)]">{company.name}</strong> a été
              généré automatiquement. Collez l'étiquette sur le badge ou les documents de l'entreprise.
            </p>
          ) : null}

          {/* Aperçu de l'étiquette 62 × 29 mm */}
          <div className="flex w-full max-w-[340px] items-center gap-4 rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)]">
            {qrUrl ? (
              <img src={qrUrl} alt="QR code" className="h-28 w-28 shrink-0" />
            ) : (
              <div className="grid h-28 w-28 shrink-0 place-items-center text-neutral-400">
                <QrCode className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 text-left">
              <p className="break-words text-sm font-bold leading-snug text-neutral-900">{company.name}</p>
              {company.siret ? (
                <p className="mt-1 text-[11px] leading-tight text-neutral-500">SIRET {company.siret}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={handleDownload} disabled={busy || !qrUrl}>
              {busy ? <Spinner className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
              Étiquette PDF (62 × 29 mm)
            </Button>
            {qrUrl ? (
              <a download={`qr-${company.name.replace(/\s+/g, "-").toLowerCase()}.png`} href={qrUrl}>
                <Button variant="secondary">
                  <Download className="h-4 w-4" /> QR seul (PNG)
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
