"use client";

import { AnimatePresence } from "motion/react";

import { useEffect, useRef, useState } from "react";

import { motion } from "motion/react";

import { onLineHidden, onLineShown, setThumbnailRects, type ThumbRect } from "@/shared/ipc";
import { logger } from "@/shared/log/logger";
import { lineHidden, slideDown } from "@/shared/motion/presets";

import { HangingThumbnail } from "./hanging-thumbnail";
import { useShelf } from "./use-shelf";

/** The clothesline: a rope across the top edge with hanging thumbnails. */
export function ClothesLine() {
  const entries = useShelf();
  const newestId = entries[0]?.id;
  const navRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unlisteners = [onLineShown(() => setVisible(true)), onLineHidden(() => setVisible(false))];
    return () => {
      for (const unlisten of unlisteners) {
        unlisten
          .then((fn) => fn())
          .catch((error) => logger.error("no se pudo quitar el suscriptor de la línea", error));
      }
    };
  }, []);

  // El shell alterna el click-through sobre estos rectángulos: mientras la
  // ventana ignora el ratón la web no recibe eventos de puntero, así que
  // Rust decide a partir de los rects físicos que publicamos aquí.
  useEffect(() => {
    const publish = () => {
      const scale = window.devicePixelRatio || 1;
      const rects: ThumbRect[] = [
        ...(navRef.current?.querySelectorAll("[data-testid^='thumbnail-']") ?? []),
      ].map((thumb) => {
        const r = thumb.getBoundingClientRect();
        return { x: r.x * scale, y: r.y * scale, width: r.width * scale, height: r.height * scale };
      });
      void setThumbnailRects(rects).catch((error) =>
        logger.error("no se pudieron publicar los rectángulos de las miniaturas", error),
      );
    };
    // Los rects solo valen con la línea desplegada: oculta, el contenedor
    // vive en translateY(-100%) y las medidas son de la posición escondida.
    if (!visible) return undefined;
    const settle = setTimeout(publish, 600);
    window.addEventListener("resize", publish);
    return () => {
      clearTimeout(settle);
      window.removeEventListener("resize", publish);
    };
    window.addEventListener("resize", publish);
    return () => window.removeEventListener("resize", publish);
  }, [entries, visible]);

  return (
    <motion.nav
      ref={navRef}
      data-testid="clothes-line"
      className="flex h-full w-full items-start overflow-hidden"
      variants={lineHidden}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      transition={slideDown}
    >
      <div className="mx-4 mt-3 h-0.5 flex-1 rounded bg-ink/30" aria-hidden />
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <HangingThumbnail key={entry.id} entry={entry} isNew={entry.id === newestId} />
        ))}
      </AnimatePresence>
      <div className="mx-4 mt-3 h-0.5 flex-1 rounded bg-ink/30" aria-hidden />
    </motion.nav>
  );
}
