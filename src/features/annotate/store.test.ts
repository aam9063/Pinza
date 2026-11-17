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
    const a = state.annotations.find((annotation) => annotation.id === "a");
    const b = state.annotations.find((annotation) => annotation.id === "b");
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
