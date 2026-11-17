/**
 * Editor state: annotations and their history, as pure reducers so the
 * history semantics (unlimited undo/redo for the session, BRIEF flow 4) are
 * testable without Konva.
 */
export type ToolId =
  | "select"
  | "pencil"
  | "highlighter"
  | "arrow"
  | "line"
  | "rectangle"
  | "ellipse"
  | "text"
  | "step"
  | "redact"
  | "crop";

/** Every shape drawn from two points (drag start → drag end). */
interface TwoPointBase {
  readonly id: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly color: string;
  /** Stroke width in image pixels. */
  readonly width: number;
}

export interface PencilAnnotation {
  readonly kind: "pencil";
  readonly id: string;
  /** Flat [x0, y0, x1, y1, ...] in image coordinates. */
  readonly points: readonly number[];
  readonly color: string;
  /** Stroke width in image pixels. */
  readonly width: number;
}

export interface HighlighterAnnotation {
  readonly kind: "highlighter";
  readonly id: string;
  readonly points: readonly number[];
  readonly color: string;
  readonly width: number;
}

export interface ArrowAnnotation extends TwoPointBase {
  readonly kind: "arrow";
}

export interface LineAnnotation extends TwoPointBase {
  readonly kind: "line";
}

export interface RectangleAnnotation extends TwoPointBase {
  readonly kind: "rectangle";
}

export interface EllipseAnnotation extends TwoPointBase {
  readonly kind: "ellipse";
}

export interface TextAnnotation {
  readonly kind: "text";
  readonly id: string;
  /** Top-left anchor in image coordinates. */
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly color: string;
  readonly fontSize: number;
}

/** Numbered step: a circle with the next auto-incremented number. */
export interface StepAnnotation {
  readonly kind: "step";
  readonly id: string;
  /** Circle center in image coordinates. */
  readonly x: number;
  readonly y: number;
  readonly number: number;
  readonly color: string;
  readonly radius: number;
}

/** A sensitive-data region: the underlying image pixels, blurred. */
export interface RedactAnnotation extends TwoPointBase {
  readonly kind: "redact";
  /** "pixelate" or "blur"; the export rasterizes the region. */
  readonly effect: "pixelate" | "blur";
}

export type Annotation =
  | RedactAnnotation
  | PencilAnnotation
  | HighlighterAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | RectangleAnnotation
  | EllipseAnnotation
  | TextAnnotation
  | StepAnnotation;

/** Tools whose annotation is dragged from start to end. */
export type TwoPointTool = Extract<ToolId, "arrow" | "line" | "rectangle" | "ellipse">;
export const TWO_POINT_TOOLS: readonly TwoPointTool[] = ["arrow", "line", "rectangle", "ellipse"];

/** Is this annotation a region-based effect (pixelate/blur)? */
export function isRedact(annotation: Annotation): annotation is RedactAnnotation {
  return annotation.kind === "redact";
}

/** Tools in the toolbar order, with their shortcut letter (BRIEF flow 4). */
export const TOOL_SHORTCUTS: readonly { readonly tool: ToolId; readonly key: string }[] = [
  { tool: "select", key: "V" },
  { tool: "pencil", key: "P" },
  { tool: "highlighter", key: "H" },
  { tool: "arrow", key: "A" },
  { tool: "line", key: "L" },
  { tool: "rectangle", key: "R" },
  { tool: "ellipse", key: "E" },
  { tool: "text", key: "T" },
  { tool: "step", key: "N" },
];

export function isTwoPointTool(tool: ToolId): tool is TwoPointTool {
  return (TWO_POINT_TOOLS as readonly string[]).includes(tool);
}

/** One history frame: annotations plus the image size at that moment. */
interface HistoryFrame {
  readonly annotations: readonly Annotation[];
  readonly imageSize: { width: number; height: number };
}

export interface EditorState {
  readonly annotations: readonly Annotation[];
  readonly past: readonly HistoryFrame[];
  readonly future: readonly HistoryFrame[];
  readonly tool: ToolId;
  readonly color: string;
  readonly strokeWidth: number;
  readonly fontSize: number;
  /** Next number for the step tool (auto-increments per placed step). */
  readonly nextStep: number;
  /** Current image size after crops (starts as the capture size). */
  readonly imageSize: { width: number; height: number };
}

export const INITIAL_STATE: EditorState = {
  annotations: [],
  past: [],
  future: [],
  tool: "pencil",
  color: "#1D4FBF",
  strokeWidth: 3,
  fontSize: 20,
  nextStep: 1,
  imageSize: { width: 0, height: 0 },
};

/** The four quick colors of the style bar (BRIEF flow 4, Style table). */
export const QUICK_COLORS = ["#1D4FBF", "#D64545", "#1F9D55", "#1A1A1A"] as const;

/** The three quick widths, in image pixels. */
export const QUICK_WIDTHS = [2, 4, 8] as const;

export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type EditorAction =
  | { type: "crop"; rect: CropRect }
  | { type: "commit"; annotation: Annotation }
  | { type: "replace"; annotations: readonly Annotation[] }
  | { type: "move"; id: string; dx: number; dy: number }
  | { type: "transform"; id: string; dx: number; dy: number; scaleX: number; scaleY: number }
  | { type: "style"; id: string; color?: string; width?: number; fontSize?: number }
  | { type: "duplicate"; id: string }
  | { type: "delete"; ids: readonly string[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set-tool"; tool: ToolId }
  | { type: "set-color"; color: string }
  | { type: "set-width"; width: number }
  | { type: "set-font-size"; fontSize: number };

function pushHistory(state: EditorState, annotations: readonly Annotation[]): EditorState {
  return pushFrame(state, { annotations, imageSize: state.imageSize });
}

function pushFrame(state: EditorState, frame: HistoryFrame): EditorState {
  return {
    ...state,
    past: [...state.past, { annotations: state.annotations, imageSize: state.imageSize }],
    annotations: frame.annotations,
    imageSize: frame.imageSize,
    future: [],
  };
}

/** Shifts every coordinate of an annotation by (dx, dy). */
function shiftAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  switch (annotation.kind) {
    case "pencil":
    case "highlighter":
      return {
        ...annotation,
        points: annotation.points.map((value, index) =>
          index % 2 === 0 ? value + dx : value + dy,
        ),
      };
    case "text":
      return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
    case "step":
      return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
    default:
      return {
        ...annotation,
        x0: annotation.x0 + dx,
        y0: annotation.y0 + dy,
        x1: annotation.x1 + dx,
        y1: annotation.y1 + dy,
      };
  }
}

/** Scales an annotation's geometry from the origin by (scaleX, scaleY). */
function scaleAnnotation(annotation: Annotation, scaleX: number, scaleY: number): Annotation {
  switch (annotation.kind) {
    case "pencil":
    case "highlighter":
      return {
        ...annotation,
        points: annotation.points.map((value, index) =>
          index % 2 === 0 ? value * scaleX : value * scaleY,
        ),
        width: Math.max(1, annotation.width * ((scaleX + scaleY) / 2)),
      };
    case "text":
      return {
        ...annotation,
        x: annotation.x * scaleX,
        y: annotation.y * scaleY,
        fontSize: Math.max(6, annotation.fontSize * ((scaleX + scaleY) / 2)),
      };
    case "step":
      return {
        ...annotation,
        x: annotation.x * scaleX,
        y: annotation.y * scaleY,
        radius: Math.max(4, annotation.radius * ((scaleX + scaleY) / 2)),
      };
    default:
      return {
        ...annotation,
        x0: annotation.x0 * scaleX,
        y0: annotation.y0 * scaleY,
        x1: annotation.x1 * scaleX,
        y1: annotation.y1 * scaleY,
      };
  }
}

/** Restyles the editable properties of an annotation. */
function restyleAnnotation(
  annotation: Annotation,
  style: { color?: string; width?: number; fontSize?: number },
): Annotation {
  const color = style.color ?? annotation.color;
  switch (annotation.kind) {
    case "text":
      return { ...annotation, color, fontSize: style.fontSize ?? annotation.fontSize };
    case "step":
      return { ...annotation, color };
    case "redact":
      return { ...annotation, color };
    default:
      return { ...annotation, color, width: style.width ?? annotation.width };
  }
}

function withId(annotation: Annotation, id: string): Annotation {
  return { ...annotation, id } as Annotation;
}

/** True when every coordinate of the annotation stays inside the crop. */
function annotationBoundsInside(annotation: Annotation, width: number, height: number): boolean {
  switch (annotation.kind) {
    case "pencil":
    case "highlighter":
      return annotation.points.every((value, index) =>
        index % 2 === 0 ? value >= 0 && value <= width : value >= 0 && value <= height,
      );
    case "text":
    case "step":
      return annotation.x >= 0 && annotation.y >= 0 && annotation.x <= width && annotation.y <= height;
    default:
      return (
        Math.min(annotation.x0, annotation.x1) >= 0 &&
        Math.min(annotation.y0, annotation.y1) >= 0 &&
        Math.max(annotation.x0, annotation.x1) <= width &&
        Math.max(annotation.y0, annotation.y1) <= height
      );
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "crop": {
      const rect = action.rect;
      if (rect.width < 8 || rect.height < 8) return state;
      // The crop shifts every annotation into the new coordinate space and
      // drops whatever fell outside; the image itself is cropped on export
      // and the background layer re-fits to the new size.
      const cropped = state.annotations
        .map((annotation) => shiftAnnotation(annotation, -rect.x, -rect.y))
        .filter((annotation) => annotationBoundsInside(annotation, rect.width, rect.height));
      return pushFrame(state, {
        annotations: cropped,
        imageSize: { width: rect.width, height: rect.height },
      });
    }
    case "commit":
      return pushHistory(state, [...state.annotations, action.annotation]);
    case "replace":
      return pushHistory(state, action.annotations);
    case "move": {
      if (!state.annotations.some((annotation) => annotation.id === action.id)) {
        return state;
      }
      return pushHistory(
        state,
        state.annotations.map((annotation) =>
          annotation.id === action.id ? shiftAnnotation(annotation, action.dx, action.dy) : annotation,
        ),
      );
    }
    case "transform": {
      if (!state.annotations.some((annotation) => annotation.id === action.id)) {
        return state;
      }
      return pushHistory(
        state,
        state.annotations.map((annotation) =>
          annotation.id === action.id
            ? scaleAnnotation(shiftAnnotation(annotation, action.dx, action.dy), action.scaleX, action.scaleY)
            : annotation,
        ),
      );
    }
    case "style": {
      if (!state.annotations.some((annotation) => annotation.id === action.id)) {
        return state;
      }
      return pushHistory(
        state,
        state.annotations.map((annotation) =>
          annotation.id === action.id ? restyleAnnotation(annotation, action) : annotation,
        ),
      );
    }
    case "duplicate": {
      const source = state.annotations.find((annotation) => annotation.id === action.id);
      if (!source) return state;
      const clone = withId(shiftAnnotation(source, 12, 12), `copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      return pushHistory(state, [...state.annotations, clone]);
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
        annotations: previous.annotations,
        imageSize: previous.imageSize,
        past: state.past.slice(0, -1),
        future: [{ annotations: state.annotations, imageSize: state.imageSize }, ...state.future],
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        annotations: next.annotations,
        imageSize: next.imageSize,
        past: [...state.past, { annotations: state.annotations, imageSize: state.imageSize }],
        future: state.future.slice(1),
      };
    }
    case "set-tool":
      return { ...state, tool: action.tool };
    case "set-color":
      return { ...state, color: action.color };
    case "set-width":
      return { ...state, strokeWidth: action.width };
    case "set-font-size":
      return { ...state, fontSize: action.fontSize };
  }
}

export function canUndo(state: EditorState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: EditorState): boolean {
  return state.future.length > 0;
}
