"use client";

import { AnimatePresence } from "motion/react";

import { useEffect, useRef, useState } from "react";

import { motion } from "motion/react";

import { onLineHidden, onLineShown, setLineInteractive } from "@/shared/ipc";
import { lineHidden, slideDown } from "@/shared/motion/presets";

import { HangingThumbnail } from "./hanging-thumbnail";
import { useShelf } from "./use-shelf";

/** The clothesline: a rope across the top edge with hanging thumbnails. */
export function ClothesLine() {
  const entries = useShelf();
  const newestId = entries[0]?.id;
  const interactive = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unlisteners = [onLineShown(() => setVisible(true)), onLineHidden(() => setVisible(false))];
    return () => {
      for (const unlisten of unlisteners) void unlisten.then((fn) => fn());
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const overThumbnail = (event.target as HTMLElement).closest("[data-testid^='thumbnail-']");
    const next = overThumbnail !== null;
    if (interactive.current === next) return;
    interactive.current = next;
    void setLineInteractive(next);
  };

  return (
    <motion.nav
      data-testid="clothes-line"
      className="flex h-full w-full items-start overflow-hidden"
      variants={lineHidden}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      transition={slideDown}
      onPointerMove={handlePointerMove}
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
