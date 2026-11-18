/** Typed command wrappers. Components call these, never `invoke` directly. */
import { closeCurrentWindow, invokeCommand, listenEvent, startFileDrag, type Unlisten } from "./client";
import {
  LINE_HIDE_EVENT,
  LINE_SHOW_EVENT,
  SETTINGS_CHANGED_EVENT,
  SCREENSHOT_ADDED_EVENT,
  SCREENSHOT_REMOVED_EVENT,
  type AppInfo,
  type FileOutcome,
  type ThumbRect,
  type OpenableWindowLabel,
  type Settings,
  type SettingsPayload,
  type ShelfEntry,
} from "./contract";

export function getAppInfo(): Promise<AppInfo> {
  return invokeCommand("app_info", {});
}

export function openWindow(label: OpenableWindowLabel, capturePath?: string): Promise<null> {
  return invokeCommand("open_window", capturePath ? { label, capturePath } : { label });
}

/** La captura abierta en el editor, si la hay. */
export function getEditorCapture(): Promise<string | null> {
  return invokeCommand("get_editor_capture", {});
}

/** Los bytes PNG de la captura del editor, servidos como `data:` URL para
 * que el lienzo de exportación no quede tainted. */
export async function getEditorCaptureDataUrl(): Promise<string | null> {
  const bytes = await invokeCommand("get_editor_capture_png", {});
  if (bytes.length === 0) return null;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/png;base64,${btoa(binary)}`;
}

/** Capturas colgadas, de la más antigua a la más nueva. */
export function getShelf(): Promise<readonly ShelfEntry[]> {
  return invokeCommand("get_shelf", {});
}

export function pauseWatching(): Promise<null> {
  return invokeCommand("pause_watching", {});
}

export function resumeWatching(): Promise<null> {
  return invokeCommand("resume_watching", {});
}

/** Publishes the physical rects of the thumbnails so the shell can toggle the
 * click-through exactly over them (the web cannot see the cursor while the
 * window ignores mouse events, so Rust decides). */
export function setThumbnailRects(thumbnails: ThumbRect[]): Promise<null> {
  return invokeCommand("set_thumbnail_rects", { thumbnails });
}

export function onScreenshotAdded(
  handler: (entry: ShelfEntry) => void,
): Promise<Unlisten> {
  return listenEvent<ShelfEntry>(SCREENSHOT_ADDED_EVENT, handler);
}

export function onScreenshotRemoved(
  handler: (entry: ShelfEntry) => void,
): Promise<Unlisten> {
  return listenEvent<ShelfEntry>(SCREENSHOT_REMOVED_EVENT, handler);
}

/** The line reveals itself: edge dwell or the Ctrl+Alt+T global shortcut. */
export function onLineShown(handler: () => void): Promise<Unlisten> {
  return listenEvent<void>(LINE_SHOW_EVENT, handler);
}

/** The line hides itself: cursor left the strip, fullscreen app or shortcut. */
export function onLineHidden(handler: () => void): Promise<Unlisten> {
  return listenEvent<void>(LINE_HIDE_EVENT, handler);
}

/** Copies the screenshot image to the clipboard as a PNG image. */
export function copyImage(path: string): Promise<FileOutcome> {
  return invokeCommand("copy_image", { path });
}

/** Opens the screenshot with the default Windows viewer. */
export function openFile(path: string): Promise<FileOutcome> {
  return invokeCommand("open_file", { path });
}

/** Moves the screenshot to the Recycle Bin (never a permanent delete). */
export function trashFile(path: string): Promise<FileOutcome> {
  return invokeCommand("trash_file", { path });
}

/** Saves the annotated copy next to the original; Rust owns the file name
 * (`captura_<fecha>_<hora>_anotada.png`) and hangs it on the line. */
export function saveAnnotated(original: string, annotatedPng: Uint8Array): Promise<FileOutcome> {
  return invokeCommand("save_annotated", { original, annotatedPng: Array.from(annotatedPng) });
}

/** Reinicia la vigilancia sobre la carpeta elegida (asistente, flujo 6). */
export function restartWatching(folder: string): Promise<null> {
  return invokeCommand("restart_watching", { folder });
}

/** Carpeta conocida de capturas de Windows, propuesta por el asistente. */
export function knownScreenshotsFolder(): Promise<string> {
  return invokeCommand("suggest_watch_folder", {});
}

/** Ajustes actuales de Pinza (Rust es la fuente de verdad). */
export function getSettings(): Promise<SettingsPayload> {
  return invokeCommand("get_settings", {});
}

/** Aplica y persiste ajustes; emite `settings:changed`. */
export function setSettings(settings: Settings): Promise<null> {
  return invokeCommand("set_settings", { settings });
}

/** Suscripción a los cambios de ajustes. */
export function onSettingsChanged(handler: (settings: Settings) => void): Promise<Unlisten> {
  return listenEvent<Settings>(SETTINGS_CHANGED_EVENT, handler);
}

/** Closes the editor window after Guardar y cerrar. */
export function closeWindow(): Promise<void> {
  return closeCurrentWindow();
}

/** Starts the native OS drag of the screenshot file to other apps.
 * `iconPath` is the thumbnail shown as the drag ghost (defaults to the file). */
export async function startDrag(path: string, iconPath?: string): Promise<FileOutcome> {
  await startFileDrag(path, iconPath);
  return { path };
}
