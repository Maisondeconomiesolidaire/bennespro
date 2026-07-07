import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import { downloadCompanyLabelPng, generateCompanyLabelPngDataUrl } from "../lib/companyLabelPng";
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
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company) {
      setLabelUrl(null);
      return;
    }
    let cancelled = false;
    void generateCompanyLabelPngDataUrl(company).then((url) => {
      if (!cancelled) setLabelUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [company]);

  async function handleDownload() {
    if (!company) return;
    setBusy(true);
    try {
      await downloadCompanyLabelPng(company);
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
          <div className="flex w-full max-w-[360px] items-center justify-center rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)]">
            {labelUrl ? (
              <img
                src={labelUrl}
                alt={`Étiquette QR 62 x 29 mm pour ${company.name}`}
                className="aspect-[62/29] w-full max-w-[320px] object-contain"
              />
            ) : (
              <div className="grid aspect-[62/29] w-full max-w-[320px] place-items-center text-neutral-400">
                <QrCode className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={handleDownload} disabled={busy || !labelUrl}>
              {busy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              Étiquette PNG (62 × 29 mm)
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
