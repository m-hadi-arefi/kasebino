"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { POS_UI_COPY_FA } from "@/modules/pos/ui/copy";

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function CameraBarcodeSheet({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const lastValue = useRef<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }

    let cancelled = false;
    let raf = 0;

    async function start() {
      setError(null);
      if (typeof window === "undefined" || !window.BarcodeDetector) {
        setSupported(false);
        setError(POS_UI_COPY_FA.cameraUnsupported);
        return;
      }
      setSupported(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        const detector = new window.BarcodeDetector!({
          formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"],
        });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue?.trim();
            if (value && value !== lastValue.current) {
              lastValue.current = value;
              onDetected(value);
              onClose();
              return;
            }
          } catch {
            /* frame decode miss — keep scanning */
          }
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
        };
        raf = window.requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        setError(POS_UI_COPY_FA.cameraPermissionDenied);
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      stop();
    };
  }, [open, onClose, onDetected, stop]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={POS_UI_COPY_FA.scanCamera}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white">{POS_UI_COPY_FA.scanning}</p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-fg)]"
          >
            {POS_UI_COPY_FA.closeCamera}
          </button>
        </div>
        {supported ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="min-h-0 flex-1 rounded-[var(--radius-lg)] bg-black object-cover"
          />
        ) : null}
        {error ? (
          <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
