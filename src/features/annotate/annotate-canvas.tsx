"use client";

/**
 * The annotate canvas: the capture fitted to the window with vector
 * annotations on top (Konva). Every annotation is an object: selectable,
 * movable, resizable (Transformer bakes the geometry into the store), and
 * restyleable after drawing. Drawing tools: pencil and highlighter with
 * perfect-freehand, arrow, line, rectangle, ellipse, inline text and
 * auto-incremented numbered steps (BRIEF flow 4).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import getStroke from "perfect-freehand";
import {
  Arrow as KonvaArrow,
  Circle,
  Ellipse as KonvaEllipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer,
} from "react-konva";

import type {
  Annotation,
  EditorAction,
  EditorState,
  TwoPointTool,
} from "./store";
import { isTwoPointTool } from "./store";

const PENCIL_TOOL = "pencil";
const SELECT_TOOL = "select";
const HIGHLIGHTER_TOOL = "highlighter";
const TEXT_TOOL = "text";
const STEP_TOOL = "step";

const FREEHAND_TOOLS = [PENCIL_TOOL, HIGHLIGHTER_TOOL];

/** Outline points for a perfect-freehand stroke, as a closed SVG path. */
export function strokePath(points: readonly number[], width: number): string {
  const pairs: number[][] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    pairs.push([points[index] ?? 0, points[index + 1] ?? 0]);
  }
  const outline = getStroke(pairs, {
    size: width * 4,
    thinning: 0.6,
    smoothing: 0.6,
    streamline: 0.5,
    ...(width > 10 ? { easing: (t: number) => t } : {}),
  });
  const first = outline.at(0);
  if (!first) return "";
  let path = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
  for (let index = 1; index < outline.length; index++) {
    const previous = outline.at(index - 1);
    const current = outline.at(index);
    if (!previous || !current) continue;
    const midX = ((previous[0] + current[0]) / 2).toFixed(2);
    const midY = ((previous[1] + current[1]) / 2).toFixed(2);
    path += ` Q ${previous[0].toFixed(2)} ${previous[1].toFixed(2)} ${midX} ${midY}`;
  }
  path += " Z";
  return path;
}

interface CanvasProps {
  readonly imageUrl: string;
  readonly naturalSize: { width: number; height: number };
  readonly state: EditorState;
  readonly dispatch: (action: EditorAction) => void;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}

interface Draft {
  readonly tool: TwoPointTool;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export function AnnotateCanvas({
  imageUrl,
  naturalSize,
  state,
  dispatch,
  selectedId,
  onSelect,
}: CanvasProps) {
  const [htmlImage, setHtmlImage] = useState<HTMLImageElement | null>(null);
  const [freehand, setFreehand] = useState<readonly number[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editingText, setEditingText] = useState<{ x: number; y: number; value: string } | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => setHtmlImage(image);
    return () => {
      image.onload = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const selected = selectedId
      ? (stage.findOne(`#${selectedId}`) as Konva.Node | undefined)
      : undefined;
    transformer.nodes(selected ? [selected] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, state.annotations]);

  useEffect(() => {
    if (!editingText) return;
    textAreaRef.current?.focus();
  }, [editingText]);

  const toImageCoords = useCallback((point: Konva.Vector2d | null): [number, number] => {
    const scale = stageRef.current?.scaleX() ?? 1;
    const safe = point ?? { x: 0, y: 0 };
    return [safe.x / scale, safe.y / scale];
  }, []);

  const fittedSize = useMemo(() => {
    const maxWidth = Math.max(320, window.innerWidth - 64);
    const maxHeight = Math.max(240, window.innerHeight - 140);
    const scale = Math.min(2, maxWidth / naturalSize.width, maxHeight / naturalSize.height);
    return { width: naturalSize.width * scale, height: naturalSize.height * scale, scale };
  }, [naturalSize]);

  const drawingFreehand = FREEHAND_TOOLS.includes(state.tool);
  const drawingTwoPoint = isTwoPointTool(state.tool);

  const commitFreehand = useCallback(() => {
    const points = freehand;
    if (points.length < 4) return;
    dispatch({
      type: "commit",
      annotation: {
        kind: state.tool === HIGHLIGHTER_TOOL ? "highlighter" : "pencil",
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        points,
        color: state.color,
        width: state.tool === HIGHLIGHTER_TOOL ? state.strokeWidth * 6 : state.strokeWidth,
      },
    });
  }, [dispatch, freehand, state.color, state.strokeWidth, state.tool]);

  const commitDraft = useCallback(
    (two: Draft) => {
      dispatch({
        type: "commit",
        annotation: {
          kind: two.tool,
          id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          x0: two.x0,
          y0: two.y0,
          x1: two.x1,
          y1: two.y1,
          color: state.color,
          width: state.strokeWidth,
        },
      });
    },
    [dispatch, state.color, state.strokeWidth],
  );

  const onStagePointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const [x, y] = toImageCoords(event.target.getStage()?.getPointerPosition() ?? null);

    if (state.tool === SELECT_TOOL) {
      if (event.target === event.target.getStage()) onSelect(null);
      return;
    }
    if (event.target.getStage()?.find("Path").some((path) => path === event.target) && !drawingFreehand) {
      return;
    }

    if (drawingFreehand) {
      setFreehand([x, y]);
      return;
    }
    if (drawingTwoPoint) {
      setDraft({ tool: state.tool as TwoPointTool, x0: x, y0: y, x1: x, y1: y });
      return;
    }
    if (state.tool === STEP_TOOL) {
      dispatch({
        type: "commit",
        annotation: {
          kind: "step",
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          x,
          y,
          number: state.nextStep,
          color: state.color,
          radius: 16,
        },
      });
      dispatch({ type: "set-tool", tool: "select" });
      return;
    }
    if (state.tool === TEXT_TOOL) {
      setEditingText({ x, y, value: "" });
      dispatch({ type: "set-tool", tool: "select" });
      return;
    }
  };

  const onStagePointerMove = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const [x, y] = toImageCoords(event.target.getStage()?.getPointerPosition() ?? null);
    if (drawingFreehand && freehand.length > 0) {
      setFreehand((current) => [...current, x, y]);
      return;
    }
    if (draft) setDraft({ ...draft, x1: x, y1: y });
  };

  const onStagePointerUp = () => {
    if (drawingFreehand) {
      commitFreehand();
      setFreehand([]);
      return;
    }
    if (draft) {
      const moved = Math.abs(draft.x1 - draft.x0) > 2 || Math.abs(draft.y1 - draft.y0) > 2;
      if (moved) commitDraft(draft);
      setDraft(null);
    }
  };

  const commitEditingText = () => {
    if (editingText && editingText.value.trim()) {
      dispatch({
        type: "commit",
        annotation: {
          kind: "text",
          id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          x: editingText.x,
          y: editingText.y,
          text: editingText.value,
          color: state.color,
          fontSize: state.fontSize,
        },
      });
    }
    setEditingText(null);
  };

  // Transformer end: bake the visual transform into the stored geometry.
  const onTransformEnd = (annotation: Annotation) => (event: Konva.KonvaEventObject<Event>) => {
    const node = event.target;
    dispatch({
      type: "transform",
      id: annotation.id,
      dx: node.x(),
      dy: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
    node.position({ x: 0, y: 0 });
    node.scale({ x: 1, y: 1 });
  };

  const onDragEnd = (annotation: Annotation) => (event: Konva.KonvaEventObject<DragEvent>) => {
    const node = event.target;
    dispatch({ type: "move", id: annotation.id, dx: node.x(), dy: node.y() });
    node.position({ x: 0, y: 0 });
  };

  const cursor = state.tool === SELECT_TOOL ? "default" : "crosshair";

  return (
    <div data-testid="annotate-canvas" className="relative grid place-items-center overflow-auto p-4">
      <Stage
        ref={stageRef}
        width={fittedSize.width}
        height={fittedSize.height}
        scaleX={fittedSize.scale}
        scaleY={fittedSize.scale}
        style={{ cursor }}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
      >
        <Layer listening={false}>
          {htmlImage && (
            <KonvaImage image={htmlImage} width={naturalSize.width} height={naturalSize.height} />
          )}
        </Layer>
        <Layer>
          {state.annotations.map((annotation) => {
            const selectable = state.tool === SELECT_TOOL;
            const common = {
              id: annotation.id,
              draggable: selectable,
              onClick: () => selectable && onSelect(annotation.id),
              onTap: () => selectable && onSelect(annotation.id),
              onDragEnd: onDragEnd(annotation),
              onTransformEnd: onTransformEnd(annotation),
            };
            switch (annotation.kind) {
              case "pencil":
              case "highlighter":
                return (
                  <Path
                    key={annotation.id}
                    {...common}
                    data={strokePath(annotation.points, annotation.width)}
                    fill={annotation.color}
                    opacity={annotation.kind === "highlighter" ? 0.45 : 1}
                  />
                );
              case "arrow":
                return (
                  <KonvaArrow
                    key={annotation.id}
                    {...common}
                    points={[annotation.x0, annotation.y0, annotation.x1, annotation.y1]}
                    fill={annotation.color}
                    stroke={annotation.color}
                    strokeWidth={annotation.width}
                    pointerLength={12}
                    pointerWidth={10}
                  />
                );
              case "line":
                return (
                  <Line
                    key={annotation.id}
                    {...common}
                    points={[annotation.x0, annotation.y0, annotation.x1, annotation.y1]}
                    stroke={annotation.color}
                    strokeWidth={annotation.width}
                    lineCap="round"
                  />
                );
              case "rectangle":
                return (
                  <Rect
                    key={annotation.id}
                    {...common}
                    x={Math.min(annotation.x0, annotation.x1)}
                    y={Math.min(annotation.y0, annotation.y1)}
                    width={Math.abs(annotation.x1 - annotation.x0)}
                    height={Math.abs(annotation.y1 - annotation.y0)}
                    stroke={annotation.color}
                    strokeWidth={annotation.width}
                  />
                );
              case "ellipse":
                return (
                  <KonvaEllipse
                    key={annotation.id}
                    {...common}
                    x={(annotation.x0 + annotation.x1) / 2}
                    y={(annotation.y0 + annotation.y1) / 2}
                    radiusX={Math.abs(annotation.x1 - annotation.x0) / 2}
                    radiusY={Math.abs(annotation.y1 - annotation.y0) / 2}
                    stroke={annotation.color}
                    strokeWidth={annotation.width}
                  />
                );
              case "text":
                return (
                  <KonvaText
                    key={annotation.id}
                    {...common}
                    x={annotation.x}
                    y={annotation.y}
                    text={annotation.text}
                    fill={annotation.color}
                    fontSize={annotation.fontSize}
                  />
                );
              case "step":
                return (
                  <Group key={annotation.id} {...common} x={annotation.x} y={annotation.y}>
                    <Circle
                      radius={annotation.radius}
                      fill={annotation.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <KonvaText
                      text={String(annotation.number)}
                      x={-annotation.radius}
                      y={-10 + annotation.radius / 2 - 2}
                      width={annotation.radius * 2}
                      align="center"
                      fill="#ffffff"
                      fontSize={16}
                      fontStyle="bold"
                      listening={false}
                    />
                  </Group>
                );
            }
          })}
          {freehand.length >= 2 && (
            <Path data={strokePath(freehand, state.strokeWidth)} fill={state.color} listening={false} />
          )}
          {draft && (
            <TwoPointPreview draft={draft} color={state.color} width={state.strokeWidth} />
          )}
          <Transformer ref={transformerRef} rotateEnabled={false} keepRatio={false} />
        </Layer>
      </Stage>

      {editingText && (
        <textarea
          ref={textAreaRef}
          data-testid="editor-text-input"
          className="absolute z-10 rounded border-2 border-accent bg-white p-1 text-ink"
          style={{
            left: 16 + editingText.x * fittedSize.scale,
            top: 16 + editingText.y * fittedSize.scale,
            minWidth: 180,
            fontSize: Math.max(12, editingText ? state.fontSize * fittedSize.scale : 14),
          }}
          value={editingText.value}
          onChange={(event) => setEditingText({ ...editingText, value: event.target.value })}
          onBlur={commitEditingText}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditingText(null);
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commitEditingText();
            }
          }}
        />
      )}
    </div>
  );
}

/** Live preview of a two-point shape being dragged. */
function TwoPointPreview({ draft, color, width }: { draft: Draft; color: string; width: number }) {
  const common = {
    stroke: color,
    strokeWidth: width,
    listening: false,
    opacity: 0.8,
  };
  switch (draft.tool) {
    case "arrow":
      return (
        <KonvaArrow
          points={[draft.x0, draft.y0, draft.x1, draft.y1]}
          fill={color}
          pointerLength={12}
          pointerWidth={10}
          {...common}
        />
      );
    case "line":
      return <Line points={[draft.x0, draft.y0, draft.x1, draft.y1]} lineCap="round" {...common} />;
    case "rectangle":
      return (
        <Rect
          x={Math.min(draft.x0, draft.x1)}
          y={Math.min(draft.y0, draft.y1)}
          width={Math.abs(draft.x1 - draft.x0)}
          height={Math.abs(draft.y1 - draft.y0)}
          {...common}
        />
      );
    case "ellipse":
      return (
        <KonvaEllipse
          x={(draft.x0 + draft.x1) / 2}
          y={(draft.y0 + draft.y1) / 2}
          radiusX={Math.abs(draft.x1 - draft.x0) / 2}
          radiusY={Math.abs(draft.y1 - draft.y0) / 2}
          {...common}
        />
      );
  }
}
