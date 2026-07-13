import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { useUpload } from "../../lib/useUpload";

/**
 * Upload d'une seule photo, hébergée sur le stockage Convex.
 * `value` est le storageId courant (null si aucun), `previewUrl` permet
 * d'afficher une image déjà enregistrée (ex. lien hérité).
 */
export function SinglePhotoUpload({
  value,
  previewUrl,
  onChange,
  className,
  aspect = "video",
}: {
  value: Id<"_storage"> | null;
  previewUrl?: string | null;
  onChange: (id: Id<"_storage"> | null) => void;
  className?: string;
  aspect?: "video" | "square";
}) {
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const shownPreview = localPreview ?? (value ? previewUrl ?? null : previewUrl ?? null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const storageId = await upload(file);
      setLocalPreview(URL.createObjectURL(file));
      onChange(storageId);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function clear() {
    setLocalPreview(null);
    onChange(null);
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-dashed border-brand-300 bg-[var(--muted)]",
          aspect === "video" ? "aspect-video" : "aspect-square",
        )}
      >
        {shownPreview ? (
          <img src={shownPreview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-3 text-brand-700">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  <Camera className="h-4 w-4" /> Prendre une photo
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-[var(--card)] px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  <ImagePlus className="h-4 w-4" /> Importer
                </button>
              </div>
            )}
          </div>
        )}

        {shownPreview ? (
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
              title="Reprendre une photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/70"
            >
              {uploading ? "..." : "Remplacer"}
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {/* Caméra directe (mobile) : capture arrière. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
