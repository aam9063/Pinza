import { describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
  editorReducer,
  INITIAL_STATE,
  type EditorState,
  type PencilAnnotation,
} from "./store";

function stroke(id: string, points: number[] = [0, 0, 10, 10]): PencilAnnotation {
  return { kind: "pencil", id, points, color: "#1D4FBF", width: 3 };
}

describe("editor history", () => {
  it("commits an annotation and undoes and redoes it", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: stroke("a") });
    expect(state.annotations).toHaveLength(1);
    expect(canUndo(state)).toBe(true);
    expect(canRedo(state)).toBe(false);

    state = editorReducer(state, { type: "undo" });
    expect(state.annotations).toHaveLength(0);
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(true);

    state = editorReducer(state, { type: "redo" });
    expect(state.annotations).toHaveLength(1);
    expect(canRedo(state)).toBe(false);
  });

  it("a new commit drops the redo branch", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: stroke("a") });
    state = editorReducer(state, { type: "undo" });
    state = editorReducer(state, { type: "commit", annotation: stroke("b") });
    expect(canRedo(state)).toBe(false);
    expect(state.annotations.map((annotation) => annotation.id)).toEqual(["b"]);
  });

  it("undo and redo are unlimited during the session", () => {
    let state = INITIAL_STATE;
    for (let index = 0; index < 50; index++) {
      state = editorReducer(state, { type: "commit", annotation: stroke(`s${index}`) });
    }
    for (let index = 0; index < 50; index++) {
      state = editorReducer(state, { type: "undo" });
    }
    expect(state.annotations).toHaveLength(0);
    for (let index = 0; index < 50; index++) {
      state = editorReducer(state, { type: "redo" });
    }
    expect(state.annotations).toHaveLength(50);
  });

  it("undo with nothing to undo is a no-op", () => {
    const state = editorReducer(INITIAL_STATE, { type: "undo" });
    expect(state).toBe(INITIAL_STATE);
  });

  it("moves only the requested pencil annotation", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: stroke("a", [0, 0, 10, 10]) });
    state = editorReducer(state, { type: "commit", annotation: stroke("b", [50, 50, 60, 60]) });
    state = editorReducer(state, { type: "move", id: "a", dx: 5, dy: -3 });
    const a = state.annotations.find(
      (annotation): annotation is PencilAnnotation => annotation.id === "a" && annotation.kind === "pencil",
    );
    const b = state.annotations.find(
      (annotation): annotation is PencilAnnotation => annotation.id === "b" && annotation.kind === "pencil",
    );
    expect(a?.points).toEqual([5, -3, 15, 7]);
    expect(b?.points).toEqual([50, 50, 60, 60]);
    expect(canUndo(state)).toBe(true);
  });

  it("deletes the requested annotations and ignores unknown ids", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: stroke("a") });
    state = editorReducer(state, { type: "commit", annotation: stroke("b") });
    state = editorReducer(state, { type: "delete", ids: ["a", "missing"] });
    expect(state.annotations.map((annotation) => annotation.id)).toEqual(["b"]);
    expect(editorReducer(state, { type: "delete", ids: [] })).toBe(state);
  });

  it("style actions do not grow the history", () => {
    let state: EditorState = INITIAL_STATE;
    state = editorReducer(state, { type: "set-color", color: "#D64545" });
    state = editorReducer(state, { type: "set-width", width: 8 });
    state = editorReducer(state, { type: "set-tool", tool: "select" });
    expect(state.past).toHaveLength(0);
    expect(state.color).toBe("#D64545");
    expect(state.strokeWidth).toBe(8);
    expect(state.tool).toBe("select");
  });
});

import { arrow, type ArrowAnnotation } from "./store.helpers";

describe("two-point annotations", () => {
  it("commits an arrow and moves it without touching others", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: arrow("a", 0, 0, 100, 50) });
    state = editorReducer(state, { type: "commit", annotation: arrow("b", 200, 200, 300, 260) });
    state = editorReducer(state, { type: "move", id: "a", dx: 10, dy: -5 });
    const a = state.annotations.find((annotation) => annotation.id === "a") as ArrowAnnotation;
    const b = state.annotations.find((annotation) => annotation.id === "b") as ArrowAnnotation;
    expect([a.x0, a.y0, a.x1, a.y1]).toEqual([10, -5, 110, 45]);
    expect([b.x0, b.y0, b.x1, b.y1]).toEqual([200, 200, 300, 260]);
  });

  it("moving an unknown id does not consume history", () => {
    const state = editorReducer(INITIAL_STATE, { type: "move", id: "fantasma", dx: 5, dy: 5 });
    expect(state).toBe(INITIAL_STATE);
  });

  it("scales a rectangle from the origin and records it in history", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: arrow("r", 10, 20, 110, 120) });
    state = editorReducer(state, { type: "transform", id: "r", dx: 5, dy: 5, scaleX: 2, scaleY: 1.5 });
    const r = state.annotations.find((annotation) => annotation.id === "r") as ArrowAnnotation;
    expect([r.x0, r.y0, r.x1, r.y1]).toEqual([30, 37.5, 230, 187.5]);
    expect(canUndo(state)).toBe(true);
  });

  it("restyles color and width after drawing", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: arrow("a", 0, 0, 10, 10) });
    state = editorReducer(state, { type: "style", id: "a", color: "#D64545", width: 8 });
    const a = state.annotations.find((annotation) => annotation.id === "a") as ArrowAnnotation;
    expect(a.color).toBe("#D64545");
    expect(a.width).toBe(8);
  });

  it("duplicates with an offset and keeps the original", () => {
    let state = editorReducer(INITIAL_STATE, { type: "commit", annotation: arrow("a", 0, 0, 10, 10) });
    state = editorReducer(state, { type: "duplicate", id: "a" });
    expect(state.annotations).toHaveLength(2);
    const clone = state.annotations[1] as ArrowAnnotation;
    expect([clone.x0, clone.y0]).toEqual([12, 12]);
    expect(clone.id).not.toBe("a");
    expect(canUndo(state)).toBe(true);
  });

  it("duplicating an unknown id is a no-op", () => {
    const state = editorReducer(INITIAL_STATE, { type: "duplicate", id: "nada" });
    expect(state).toBe(INITIAL_STATE);
  });

  it("scales pencil points and text fonts", () => {
    let state = editorReducer(INITIAL_STATE, {
      type: "commit",
      annotation: { kind: "pencil", id: "p", points: [10, 20, 30, 40], color: "#000", width: 4 },
    });
    state = editorReducer(state, { type: "transform", id: "p", dx: 0, dy: 0, scaleX: 2, scaleY: 2 });
    const pencil = state.annotations.find((a) => a.id === "p");
    expect(pencil?.kind === "pencil" && pencil.points).toEqual([20, 40, 60, 80]);
    expect(pencil?.kind === "pencil" && pencil.width).toBe(8);

    let textState = editorReducer(INITIAL_STATE, {
      type: "commit",
      annotation: { kind: "text", id: "t", x: 10, y: 10, text: "hola", color: "#000", fontSize: 20 },
    });
    textState = editorReducer(textState, { type: "transform", id: "t", dx: 0, dy: 0, scaleX: 2, scaleY: 2 });
    const text = textState.annotations.find((a) => a.id === "t");
    expect(text?.kind === "text" && text.fontSize).toBe(40);
  });
});
