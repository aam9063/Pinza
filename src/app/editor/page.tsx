"use client";

/**
 * The annotate editor page (BRIEF flow 4): the capture fitted to the window,
 * pencil + select tools with their one-letter shortcuts, unlimited history,
 * the four quick colors with a picker and the three quick widths with a
 * slider. Copy / save / the rest of the tools land in M3b.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  Copy,
  Circle,
  CircleDot,
  Highlighter,
  MousePointer2,
  Pencil,
  Redo2,
  Slash,
  Square,
  Type,
  Undo2,
  Waypoints,
} from "lucide-react";

import { closeWindow, copyImage, saveAnnotated } from "@/shared/ipc";
import { logger } from "@/shared/log/logger";
import { WindowShell } from "@/shared/ui/window-shell";

import { AnnotateCanvas } from "@/features/annotate/annotate-canvas";
import {
  canRedo,
  canUndo,
  editorReducer,
  INITIAL_STATE,
  QUICK_COLORS,
  QUICK_WIDTHS,
  TOOL_SHORTCUTS,
  type ToolId,
} from "@/features/annotate/store";
import { useEditorCapture } from "@/features/annotate/use-editor-capture";

const KEY_TO_TOOL: Record<string, ToolId> = Object.fromEntries(
  TOOL_SHORTCUTS.map(({ tool, key }) => [key.toLowerCase(), tool]),
);

export default function EditorWindow() {
  const capture = useEditorCapture();
  const originalPath = capture?.path ?? null;
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const exporterRef = useRef<(() => Promise<Uint8Array>) | null>(null);
  const handleExporterReady = useCallback((exporter: (() => Promise<Uint8Array>) | null) => {
    logger.debug("exporter registrado:", exporter !== null);
    exporterRef.current = exporter;
  }, []);
  const dirty = state.annotations.length > 0;

  // Ctrl+C copies the annotated image; Ctrl+S saves and closes. The clipboard
  // write goes through the copy_image command over the shell; save_annotated
  // writes the file and hangs the copy on the line.
  const copyAnnotatedToClipboard = useCallback(
    async (png: Uint8Array): Promise<void> => {
      const pngPath = await saveAnnotated(originalPath ?? "", png).catch(() => null);
      if (!pngPath) {
        logger.error("no se pudo preparar la copia de la anotada");
        return;
      }
      await copyImage(pngPath.path).catch((error: unknown) =>
        logger.error("no se pudo copiar", error),
      );
    },
    [originalPath],
  );

  const saveAnnotatedPng = useCallback(
    async (png: Uint8Array): Promise<void> => {
      if (!originalPath) {
        logger.error("el editor no tiene captura abierta");
        return;
      }
      const outcome = await saveAnnotated(originalPath, png).catch((error: unknown) => {
        logger.error("no se pudo guardar la anotada", error);
        return null;
      });
      if (outcome) void closeWindow();
    },
    [originalPath],
  );

  /** Renders annotations at original resolution into a PNG. */
  const renderAnnotatedPng = useCallback(async (): Promise<Uint8Array | null> => {
    const exporter = exporterRef.current;
    if (!exporter) return null;
    return exporter();
  }, []);
  const copyAnnotated = useCallback(async () => {
    const png = await renderAnnotatedPng();
    if (!png) return;
    await copyAnnotatedToClipboard(png);
  }, [copyAnnotatedToClipboard, renderAnnotatedPng]);

  const saveAndClose = useCallback(async () => {
    logger.debug("guardar y cerrar: iniciado");
    const png = await renderAnnotatedPng();
    if (!png) {
      logger.error("guardar y cerrar: el export devolvió null");
      return;
    }
    logger.debug("guardar y cerrar: png listo", png.length);
    await saveAnnotatedPng(png);
  }, [renderAnnotatedPng, saveAnnotatedPng]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        event.preventDefault();
        void copyAnnotated();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "s") {
        event.preventDefault();
        void saveAndClose();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "d") {
        event.preventDefault();
        if (selectedId) dispatch({ type: "duplicate", id: selectedId });
        return;
      }
      if (event.key === "Delete" && selectedId) {
        event.preventDefault();
        dispatch({ type: "delete", ids: [selectedId] });
        setSelectedId(null);
        return;
      }
      const tool = KEY_TO_TOOL[key];
      if (tool && !event.ctrlKey && !event.metaKey && !event.altKey) {
        dispatch({ type: "set-tool", tool });
      }
    },
    [copyAnnotated, saveAndClose, selectedId],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);


  // Confirm before losing unsaved annotations (BRIEF flow 4, Salida table).
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const setTool = (tool: ToolId) => dispatch({ type: "set-tool", tool });

  const applyColor = (color: string) => {
    dispatch({ type: "set-color", color });
    if (selectedId) dispatch({ type: "style", id: selectedId, color });
  };

  const applyWidth = (width: number) => {
    dispatch({ type: "set-width", width });
    if (selectedId) dispatch({ type: "style", id: selectedId, width });
  };

  return (
    <WindowShell window="editor">
      <div className="flex h-full flex-col" data-testid="editor-root-pane">
        <div
          className="flex items-center gap-1 border-b border-ink/10 px-3 py-2"
          data-testid="editor-toolbar"
        >
          <ToolButton
            testId="editor-tool-select"
            label="Seleccionar y mover (V)"
            active={state.tool === "select"}
            onClick={() => setTool("select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-pencil"
            label="Lápiz libre (P)"
            active={state.tool === "pencil"}
            onClick={() => setTool("pencil")}
          >
            <Pencil className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-highlighter"
            label="Resaltador (H)"
            active={state.tool === "highlighter"}
            onClick={() => setTool("highlighter")}
          >
            <Highlighter className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-arrow"
            label="Flecha (A)"
            active={state.tool === "arrow"}
            onClick={() => setTool("arrow")}
          >
            <Waypoints className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-line"
            label="Línea (L)"
            active={state.tool === "line"}
            onClick={() => setTool("line")}
          >
            <Slash className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-rectangle"
            label="Rectángulo (R)"
            active={state.tool === "rectangle"}
            onClick={() => setTool("rectangle")}
          >
            <Square className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-ellipse"
            label="Elipse (E)"
            active={state.tool === "ellipse"}
            onClick={() => setTool("ellipse")}
          >
            <Circle className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-text"
            label="Texto (T)"
            active={state.tool === "text"}
            onClick={() => setTool("text")}
          >
            <Type className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-tool-step"
            label="Paso numerado (N)"
            active={state.tool === "step"}
            onClick={() => setTool("step")}
          >
            <CircleDot className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-undo"
            label="Deshacer (Ctrl+Z)"
            disabled={!canUndo(state)}
            onClick={() => dispatch({ type: "undo" })}
          >
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            testId="editor-redo"
            label="Rehacer (Ctrl+Y)"
            disabled={!canRedo(state)}
            onClick={() => dispatch({ type: "redo" })}
          >
            <Redo2 className="h-4 w-4" />
          </ToolButton>

          <span className="mx-2 h-5 w-px bg-ink/10" aria-hidden />
          {QUICK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={`Color ${color}`}
              aria-label={`Color ${color}`}
              data-testid={`editor-color-${color.replace("#", "")}`}
              className={`h-6 w-6 rounded-full border-2 ${state.color === color ? "border-accent" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => applyColor(color)}
            />
          ))}
          <input
            type="color"
            aria-label="Elegir color"
            title="Elegir color"
            data-testid="editor-color-picker"
            value={state.color}
            onChange={(event) => applyColor(event.target.value)}
            className="h-6 w-8 cursor-pointer rounded"
          />

          <span className="mx-2 h-5 w-px bg-ink/10" aria-hidden />
          {QUICK_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              title={`Grosor ${width} px`}
              aria-label={`Grosor ${width} px`}
              data-testid={`editor-width-${width}`}
              className={`grid h-7 w-7 place-items-center rounded ${state.strokeWidth === width ? "bg-ink/10" : ""}`}
              onClick={() => applyWidth(width)}
            >
              <span
                className="block rounded-full bg-ink"
                style={{ width: width + 2, height: width + 2 }}
              />
            </button>
          ))}
          <input
            type="range"
            min={1}
            max={24}
            aria-label="Grosor del trazo"
            title="Grosor del trazo"
            data-testid="editor-width-slider"
            value={state.strokeWidth}
            onChange={(event) => applyWidth(Number(event.target.value))}
            className="w-24"
          />

          <span className="mx-2 h-5 w-px bg-ink/10" aria-hidden />
          <button
            type="button"
            title="Copiar la imagen anotada (Ctrl+C)"
            aria-label="Copiar la imagen anotada"
            data-testid="editor-copy"
            className="grid h-8 w-8 place-items-center rounded text-ink hover:bg-ink/10"
            onClick={() => void copyAnnotated()}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Guardar y cerrar (Ctrl+S)"
            aria-label="Guardar y cerrar"
            data-testid="editor-save"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
            onClick={() => void saveAndClose()}
          >
            Guardar y cerrar
          </button>
        </div>

        {capture && capture.size.width > 0 ? (
          <AnnotateCanvas
            imageUrl={capture.url}
            naturalSize={capture.size}
            state={state}
            dispatch={dispatch}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onExporterReady={handleExporterReady}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-ink-muted" data-testid="editor-empty">
            {capture ? "La captura no se pudo cargar" : "Abre el editor desde una miniatura"}
          </div>
        )}
      </div>
    </WindowShell>
  );
}

function ToolButton({
  testId,
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  testId: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-testid={testId}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded ${active ? "bg-accent text-white" : "text-ink hover:bg-ink/10"} disabled:opacity-40`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
