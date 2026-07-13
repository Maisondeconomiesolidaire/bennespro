import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, ScanLine } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { parseScannedCompanyId } from "../lib/qr";
import { Modal } from "./ui/Modal";
import { Spinner } from "./ui/Spinner";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

/**
 * Scanner de QR code entreprise (caméra arrière). Utilise l'API native
 * BarcodeDetector quand elle existe, sinon jsQR sur un canvas.
 */
export function QrScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (companyId: Id<"bpCompanies">) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setInvalidCode(false);
    setStarting(true);

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let detector: BarcodeDetectorLike | null = null;

    const BarcodeDetectorCtor = (
      window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }
    ).BarcodeDetector;
    if (BarcodeDetectorCtor) {
      try {
        detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    const canvas = document.createElement("canvas");
    const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });

    function found(rawValue: string) {
      const companyId = parseScannedCompanyId(rawValue);
      if (!companyId) {
        setInvalidCode(true);
        return;
      }
      stopped = true;
      onScan(companyId);
    }

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
        if (detector) {
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0 && codes[0].rawValue) found(codes[0].rawValue);
          } catch {
            detector = null; // bascule sur jsQR
          }
        } else if (canvasCtx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvasCtx.drawImage(video, 0, 0);
          const image = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (code?.data) found(code.data);
        }
      }
      if (!stopped) raf = requestAnimationFrame(() => void tick());
    }

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (mediaStream) => {
        if (stopped) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = mediaStream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = mediaStream;
          await video.play().catch(() => undefined);
        }
        setStarting(false);
        raf = requestAnimationFrame(() => void tick());
      })
      .catch(() => {
        setStarting(false);
        setError(
          "Impossible d'accéder à la caméra. Autorisez l'accès à la caméra dans votre navigateur, ou scannez le QR code avec l'appareil photo du téléphone.",
        );
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onScan]);

  return (
    <Modal open={open} onClose={onClose} title="Scanner un QR code entreprise">
      <div className="space-y-3">
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-6 py-10 text-center">
            <CameraOff className="h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="max-w-sm text-sm text-[var(--muted-foreground)]">{error}</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black">
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            {starting ? (
              <div className="absolute inset-0 grid place-items-center bg-black/60">
                <Spinner className="h-6 w-6 text-white" />
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="relative h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <ScanLine className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/70" />
                </div>
              </div>
            )}
          </div>
        )}
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          {invalidCode
            ? "Ce QR code n'est pas un code entreprise Bennes & Pro."
            : "Placez l'étiquette QR de l'entreprise dans le cadre."}
        </p>
      </div>
    </Modal>
  );
}
