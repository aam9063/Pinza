import type { ArrowAnnotation } from "./store";

/** Test helper: an arrow annotation. */
export function arrow(id: string, x0: number, y0: number, x1: number, y1: number): ArrowAnnotation {
  return { kind: "arrow", id, x0, y0, x1, y1, color: "#1D4FBF", width: 3 };
}
