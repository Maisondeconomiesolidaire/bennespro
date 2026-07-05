import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "./ui/Button";

/**
 * Zone de signature (canvas HTML5, souris + tactile). Émet le PNG en data URL
 * via `onChange` (null quand la zone est effacée).
 */
export function SignaturePad({
  onChange,
  className,
}: {
  onChange: (dataUrl: string | null) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Adapte la résolution du canvas à sa taille CSS (netteté sur écrans HiDPI).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
    }
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
    if (empty) setEmpty(false);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasDrawn.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl border border-dashed border-brand-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-44 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {empty ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Signez ici
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={empty}>
          <Eraser className="h-4 w-4" /> Effacer
        </Button>
      </div>
    </div>
  );
}
