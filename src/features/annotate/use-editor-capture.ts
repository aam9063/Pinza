/**
 * Loads the capture the editor was opened for, from the shell (Rust owns the
 * target) and through the asset protocol: the web never touches the disk.
 */
import { useEffect, useState } from "react";

import { assetUrl, getEditorCapture } from "@/shared/ipc";
import { logger } from "@/shared/log/logger";

export interface LoadedCapture {
  readonly path: string;
  readonly url: string;
  readonly size: { width: number; height: number };
}

/** Reads the editor target and measures the image once it decodes. */
export function useEditorCapture(): LoadedCapture | null {
  const [capture, setCapture] = useState<LoadedCapture | null>(null);

  useEffect(() => {
    let alive = true;
    void getEditorCapture()
      .then(async (path) => {
        if (!alive || !path) return;
        const url = assetUrl(path);
        const size = await new Promise<{ width: number; height: number }>((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () => resolve({ width: 0, height: 0 });
          image.src = url;
        });
        if (alive) setCapture({ path, url, size });
      })
      .catch((error) => logger.error("no se pudo leer la captura del editor", error));
    return () => {
      alive = false;
    };
  }, []);

  return capture;
}
