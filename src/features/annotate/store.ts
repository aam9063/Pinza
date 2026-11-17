/**
 * Editor state: annotations and their history, as pure reducers so the
 * history semantics (unlimited undo/redo for the session, BRIEF flow 4) are
 * testable without Konva.
 */
export type ToolId = "select" | "pencil";

export interface PencilAnnotation {
  readonly kind: "pencil";
  readonly id: string;
  /** Flat [x0, y0, x1, y1, ...] in image coordinates. */
  readonly points: readonly number[];
  readonly color: string;
  /** Stroke width in image pixels. */
  readonly width: number;
}

export type Annotation = PencilAnnotation;

export interface EditorState {
  readonly annotations: readonly Annotation[];
  readonly past: readonly (readonly Annotation[])[];
  readonly future: readonly (readonly Annotation[])[];
  readonly tool: ToolId;
  readonly color: string;
  readonly strokeWidth: number;
}

export const INITIAL_STATE: EditorState = {
  annotations: [],
  past: [],
  future: [],
  tool: "pencil",
  color: "#1D4FBF",
  strokeWidth: 3,
};

/** The four quick colors of the style bar (BRIEF flow 4, Style table). */
export const QUICK_COLORS = ["#1D4FBF", "#D64545", "#1F9D55", "#1A1A1A"] as const;

/** The three quick widths, in image pixels. */
export const QUICK_WIDTHS = [2, 4, 8] as const;

export type EditorAction =
  | { type: "commit"; annotation: Annotation }
  | { type: "replace"; annotations: readonly Annotation[] }
  | { type: "move"; id: string; dx: number; dy: number }
  | { type: "delete"; ids: readonly string[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set-tool"; tool: ToolId }
  | { type: "set-color"; color: string }
  | { type: "set-width"; width: number };

function pushHistory(state: EditorState, annotations: readonly Annotation[]): EditorState {
  return {
    ...state,
    past: [...state.past, state.annotations],
    annotations,
    future: [],
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "commit":
      return pushHistory(state, [...state.annotations, action.annotation]);
    case "replace":
      return pushHistory(state, action.annotations);
    case "move": {
      const annotations = state.annotations.map((annotation) =>
        annotation.id === action.id && annotation.kind === "pencil"
          ? {
              ...annotation,
              points: annotation.points.map((value, index) =>
                index % 2 === 0 ? value + action.dx : value + action.dy,
              ),
            }
          : annotation,
      );
      return pushHistory(state, annotations);
    }
    case "delete": {
      const ids = new Set(action.ids);
      if (ids.size === 0 || !state.annotations.some((annotation) => ids.has(annotation.id))) {
        return state;
      }
      return pushHistory(
        state,
        state.annotations.filter((annotation) => !ids.has(annotation.id)),
      );
    }
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        annotations: previous,
        past: state.past.slice(0, -1),
        future: [state.annotations, ...state.future],
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        annotations: next,
        past: [...state.past, state.annotations],
        future: state.future.slice(1),
      };
    }
    case "set-tool":
      return { ...state, tool: action.tool };
    case "set-color":
      return { ...state, color: action.color };
    case "set-width":
      return { ...state, strokeWidth: action.width };
  }
}

export function canUndo(state: EditorState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: EditorState): boolean {
  return state.future.length > 0;
}
