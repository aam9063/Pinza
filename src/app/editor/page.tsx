"use client";

/**
 * The annotate editor page (BRIEF flow 4): the capture fitted to the window,
 * pencil + select tools with their one-letter shortcuts, unlimited history,
 * the four quick colors with a picker and the three quick widths with a
 * slider. Copy / save / the rest of the tools land in M3b.
 */
import { useCallback, useEffect, useReducer, useState } from "react";
import { MousePointer2, Pencil, Redo2, Undo2 } from "lucide-react";

import { WindowShell } from "@/shared/ui/window-shell";

import { AnnotateCanvas } from "@/features/annotate/annotate-canvas";
import {
  canRedo,
  canUndo,
  editorReducer,
  INITIAL_STATE,
  QUICK_COLORS,
  QUICK_WIDTHS,
  type ToolId,
} from "@/features/annotate/store";
import { useEditorCapture } from "@/features/annotate/use-editor-capture";

const TOOL_SHORTCUTS: Record<string, ToolId> = {
  v: "select",
  p: "pencil",
};

export default function EditorWindow() {
  const capture = useEditorCapture();
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      if (event.key === "Delete" && selectedId) {
        event.preventDefault();
        dispatch({ type: "delete", ids: [selectedId] });
        setSelectedId(null);
        return;
      }
      const tool = TOOL_SHORTCUTS[key];
      if (tool && !event.ctrlKey && !event.metaKey && !event.altKey) {
        dispatch({ type: "set-tool", tool });
      }
    },
    [selectedId],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const setTool = (tool: ToolId) => dispatch({ type: "set-tool", tool });

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
              onClick={() => dispatch({ type: "set-color", color })}
            />
          ))}
          <input
            type="color"
            aria-label="Elegir color"
            title="Elegir color"
            data-testid="editor-color-picker"
            value={state.color}
            onChange={(event) => dispatch({ type: "set-color", color: event.target.value })}
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
              onClick={() => dispatch({ type: "set-width", width })}
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
            onChange={(event) => dispatch({ type: "set-width", width: Number(event.target.value) })}
            className="w-24"
          />
        </div>

        {capture && capture.size.width > 0 ? (
          <AnnotateCanvas
            imageUrl={capture.url}
            naturalSize={capture.size}
            state={state}
            dispatch={dispatch}
            selectedId={selectedId}
            onSelect={setSelectedId}
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
