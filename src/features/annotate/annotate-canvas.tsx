"use client";

/**
 * The annotate canvas: the capture fitted to the window with vector
 * annotations on top (Konva). Pencil strokes use perfect-freehand for a
 * natural look; finished strokes become selectable, movable objects.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import getStroke from "perfect-freehand";
import { Image as KonvaImage, Layer, Path, Stage, Transformer } from "react-konva";

import type { Annotation, EditorAction, EditorState } from "./store";


const PENCIL_TOOL = "pencil";
const SELECT_TOOL = "select";

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

function annotationPath(annotation: Annotation): string {
  return annotation.kind === "pencil" ? strokePath(annotation.points, annotation.width) : "";
}

interface CanvasProps {
  readonly imageUrl: string;
  readonly naturalSize: { width: number; height: number };
  readonly state: EditorState;
  readonly dispatch: (action: EditorAction) => void;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
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
  const [draftPoints, setDraftPoints] = useState<readonly number[]>([]);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

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

  // Image coordinates regardless of the fitted display scale.
  const toImageCoords = useCallback((point: Konva.Vector2d | null): [number, number] => {
    const scale = stageRef.current?.scaleX() ?? 1;
    const safe = point ?? { x: 0, y: 0 };
    return [safe.x / scale, safe.y / scale];
  }, []);

  // "A tamaño ajustado": fit inside the window, never upscale beyond 2x.
  const fittedSize = useMemo(() => {
    const maxWidth = Math.max(320, window.innerWidth - 64);
    const maxHeight = Math.max(240, window.innerHeight - 140);
    const scale = Math.min(2, maxWidth / naturalSize.width, maxHeight / naturalSize.height);
    return { width: naturalSize.width * scale, height: naturalSize.height * scale, scale };
  }, [naturalSize]);

  const drawing = state.tool === PENCIL_TOOL;

  const onStagePointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (state.tool === SELECT_TOOL && event.target === event.target.getStage()) {
      onSelect(null);
      return;
    }
    // Dibuja en cualquier parte vacía del lienzo: solo un Path existente
    // (target de una anotación) bloquea un trazo nuevo.
    if (!drawing || event.target.getStage()?.find("Path").some((path) => path === event.target)) {
      return;
    }
    setDraftPoints(toImageCoords(event.target.getStage()?.getPointerPosition() ?? null));
  };

  const onStagePointerMove = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (!drawing || draftPoints.length === 0) return;
    const [x, y] = toImageCoords(event.target.getStage()?.getPointerPosition() ?? null);
    setDraftPoints((current) => [...current, x, y]);
  };

  const onStagePointerUp = () => {
    if (!drawing) return;
    if (draftPoints.length < 4) {
      setDraftPoints([]);
      return;
    }
    dispatch({
      type: "commit",
      annotation: {
        kind: "pencil",
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        points: draftPoints,
        color: state.color,
        width: state.strokeWidth,
      },
    });
    setDraftPoints([]);
  };

  return (
    <div data-testid="annotate-canvas" className="grid place-items-center overflow-auto p-4">
      <Stage
        ref={stageRef}
        width={fittedSize.width}
        height={fittedSize.height}
        scaleX={fittedSize.scale}
        scaleY={fittedSize.scale}
        style={{ cursor: drawing ? "crosshair" : "default" }}
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
          {state.annotations.map((annotation) => (
            <Path
              key={annotation.id}
              id={annotation.id}
              data={annotationPath(annotation)}
              fill={annotation.color}
              draggable={state.tool === SELECT_TOOL}
              onClick={() => state.tool === SELECT_TOOL && onSelect(annotation.id)}
              onTap={() => state.tool === SELECT_TOOL && onSelect(annotation.id)}
              onDragEnd={(event) => {
                dispatch({
                  type: "move",
                  id: annotation.id,
                  dx: event.target.x(),
                  dy: event.target.y(),
                });
                event.target.position({ x: 0, y: 0 });
              }}
            />
          ))}
          {draftPoints.length >= 4 && (
            <Path data={strokePath(draftPoints, state.strokeWidth)} fill={state.color} listening={false} />
          )}
          <Transformer ref={transformerRef} rotateEnabled={false} keepRatio={false} />
        </Layer>
      </Stage>
    </div>
  );
}

export const CANVAS_TOOLS = { PENCIL_TOOL, SELECT_TOOL } as const;
