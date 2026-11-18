/**
 * One screenshot hanging on the line: a white-backed photo with a wooden peg,
 * slightly rotated, animated with the shared spring presets. Gestures of
 * BRIEF §3 flow 3: hover shows the action bar, click copies, a 0.4 s hold
 * opens the annotate editor, double click opens the default viewer, drag
 * detaches the file to other apps and the trash button recycles it.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Copy, FileEdit, Trash2, ExternalLink } from "lucide-react";

import {
  assetUrl,
  copyImage,
  openFile,
  openWindow,
  trashFile,
  startDrag,
  type ShelfEntry,
} from "@/shared/ipc";
import { logger } from "@/shared/log/logger";
import { springDrop, springSway, thumbnailFlying } from "@/shared/motion/presets";

const HOLD_TO_ANNOTATE_MS = 400;
const COPIED_PILL_MS = 1200;

/** Random-looking but stable rotation per entry, between -2 and 2 degrees. */
function tilt(id: number): number {
  return (((id * 37) % 5) - 2) as number;
}

export function HangingThumbnail({ entry, isNew }: { entry: ShelfEntry; isNew: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartedAt = useRef(0);
  const holdStarted = useRef(false);
  /** True after a completed hold: the release click must not copy. */
  const suppressClick = useRef(false);

  useEffect(() => {
    return () => {
      holdStarted.current = false;
    };
  }, []);

  const stopHold = () => {
    holdStarted.current = false;
    setHoldProgress(0);
  };

  const beginHold = () => {
    holdStarted.current = true;
    holdStartedAt.current = Date.now();
    setHoldProgress(0.0001);
  };

  const openWindowAnnotate = () => {
    void openWindow("editor", entry.path).catch((error) =>
      logger.error("no se pudo abrir el editor", error),
    );
  };

  // El anillo vive en un efecto: ningún temporizador se define en el render
  // (react-hooks/purity exige funciones puras en el cuerpo del componente).
  useEffect(() => {
    if (holdProgress <= 0 || !holdStarted.current) return undefined;
    if (holdProgress >= 1) {
      holdStarted.current = false;
      // El gesto de mantener completa: el clic que el soltar genera después
      // no debe copiar (los gestos del flujo 3 son excluyentes).
      suppressClick.current = true;
      openWindowAnnotate();
      return undefined;
    }
    const timer = setTimeout(() => {
      setHoldProgress(Math.min(1, (Date.now() - holdStartedAt.current) / HOLD_TO_ANNOTATE_MS));
    }, 16);
    return () => clearTimeout(timer);
  }, [holdProgress]);


  const onPointerDown = () => {
    suppressClick.current = false;
    beginHold();
  };
  const onPointerUp = () => stopHold();

  const onClick = () => {
    if (suppressClick.current) return;
    void copyImage(entry.path)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_PILL_MS);
      })
      .catch((error) => logger.error("no se pudo copiar la captura", error));
  };

  const onDoubleClick = () => {
    void openFile(entry.path).catch((error) => logger.error("no se pudo abrir la captura", error));
  };

  const onTrash = () => {
    void trashFile(entry.path).catch((error) => logger.error("no se pudo enviar a la papelera", error));
  };

  return (
    <motion.figure
      data-testid={`thumbnail-${entry.id}`}
      className="relative mx-2 flex w-40 shrink-0 flex-col items-center origin-top"
      variants={thumbnailFlying}
      initial="flying"
      animate="hanging"
      exit="unhung"
      transition={{ ...springDrop, opacity: { duration: 0.2 } }}
      whileHover={{ transform: "translateY(-2px) rotate(0deg)" }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        stopHold();
      }}
      draggable
      onDragStart={(event) => {
        event.preventDefault();
        void startDrag(entry.path).catch((error) => logger.error("no se pudo arrastrar", error));
      }}
    >
      <div
        className="h-3 w-2 rounded-t-sm"
        style={{ backgroundColor: "#C99A5B" }}
        data-testid={`peg-${entry.id}`}
      />
      <motion.div
        className="overflow-hidden rounded-sm border border-black/10 bg-white shadow-md"
        style={{ transform: `rotate(${tilt(entry.id)}deg)` }}
        animate={{ transform: [`rotate(${tilt(entry.id) + 3}deg)`, `rotate(${tilt(entry.id)}deg)`] }}
        transition={{ ...springSway, delay: 0.35 }}
      >
        {entry.thumbnail ? (
          <img
            src={assetUrl(entry.thumbnail)}
            alt={entry.fileName}
            className="h-24 w-40 cursor-pointer select-none object-cover"
            data-testid={`thumb-image-${entry.id}`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            draggable
          />
        ) : (
          <div className="grid h-24 w-40 place-items-center text-xs text-ink-muted">
            {entry.fileName}
          </div>
        )}
        {/* Anillo de progreso del mantener 0,4 s (S3). */}
        {holdProgress > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 m-auto h-10 w-10"
            viewBox="0 0 40 40"
            data-testid={`thumb-hold-ring-${entry.id}`}
          >
            <circle cx="20" cy="20" r="16" fill="none" stroke="#1D4FBF" strokeWidth="3"
              strokeDasharray={`${holdProgress * 2 * Math.PI * 16} ${2 * Math.PI * 16}`}
              transform="rotate(-90 20 20)" />
          </svg>
        )}
        {copied && (
          <span
            className="absolute inset-0 m-auto h-6 w-fit rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white"
            data-testid={`thumb-copied-${entry.id}`}
          >
            Copiada
          </span>
        )}
      </motion.div>
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
      {hovered && (
        <div
          className="absolute bottom-6 flex gap-1 rounded-full bg-surface-raised/95 px-2 py-1 shadow-md"
          data-testid={`thumb-actions-${entry.id}`}
        >
          <ActionButton label="Copiar" testId="thumb-action-copy" onClick={onClick}>
            <Copy className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton label="Anotar" testId="thumb-action-annotate" onClick={openWindowAnnotate}>
            <FileEdit className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton label="Abrir" testId="thumb-action-open" onClick={onDoubleClick}>
            <ExternalLink className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton label="Papelera" testId="thumb-action-trash" onClick={onTrash}>
            <Trash2 className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      )}
    </motion.figure>
  );
}

function ActionButton({
  label,
  testId,
  onClick,
  children,
}: {
  label: string;
  testId: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-testid={testId}
      className="grid h-6 w-6 place-items-center rounded-full text-ink transition-colors hover:bg-ink/10"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
