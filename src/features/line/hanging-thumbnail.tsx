/**
 * One screenshot hanging on the line: a white-backed photo with a wooden peg,
 * slightly rotated, animated with the shared spring presets.
 */
import { motion } from "motion/react";

import { assetUrl, type ShelfEntry } from "@/shared/ipc";
import { springDrop, springSway, thumbnailHanging } from "@/shared/motion/presets";

/** Random-looking but stable rotation per entry, between -2 and 2 degrees. */
function tilt(id: number): number {
  return (((id * 37) % 5) - 2) as number;
}

export function HangingThumbnail({ entry, isNew }: { entry: ShelfEntry; isNew: boolean }) {
  return (
    <motion.figure
      data-testid={`thumbnail-${entry.id}`}
      className="relative mx-2 flex w-40 shrink-0 flex-col items-center"
      variants={thumbnailHanging}
      initial="hang"
      animate="hanging"
      exit="unhung"
      transition={springDrop}
      whileHover={{ transform: "translateY(-2px) rotate(0deg)" }}
    >
      <div
        className="h-3 w-2 rounded-t-sm"
        style={{ backgroundColor: "#C99A5B" }}
        data-testid={`peg-${entry.id}`}
      />
      <div
        className="overflow-hidden rounded-sm border border-black/10 bg-white shadow-md"
        style={{ transform: `rotate(${tilt(entry.id)}deg)` }}
      >
        {entry.thumbnail ? (
          <img
            src={assetUrl(entry.thumbnail)}
            alt={entry.fileName}
            className="h-24 w-40 object-cover"
            data-testid={`thumb-image-${entry.id}`}
          />
        ) : (
          <div className="grid h-24 w-40 place-items-center text-xs text-ink-muted">
            {entry.fileName}
          </div>
        )}
      </div>
      <figcaption className="mt-1 text-[10px] text-ink-muted" data-testid={`thumb-time-${entry.id}`}>
        {new Date(entry.capturedAt).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </figcaption>
      {isNew && (
        <span
          className="absolute -top-1 right-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white"
          data-testid={`thumb-new-${entry.id}`}
        >
          Nueva
        </span>
      )}
      <motion.span
        aria-hidden
        className="absolute -inset-y-1 left-1/2 w-px bg-ink/20"
        animate={{ transform: ["rotate(0deg)", "rotate(1.5deg)", "rotate(-1.5deg)", "rotate(0deg)"] }}
        transition={{ ...springSway, repeat: Infinity, repeatDelay: 4, duration: 2.4 }}
      />
    </motion.figure>
  );
}
