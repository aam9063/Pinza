/**
 * The only module in the web app allowed to touch `@tauri-apps/api`.
 *
 * Everything else imports the typed wrappers from `src/shared/ipc`.
 */
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { CommandMap } from "./contract";
import { logger } from "../log/logger";

export type Unlisten = UnlistenFn;

export function invokeCommand<K extends keyof CommandMap>(
  command: K,
  args: CommandMap[K]["args"],
): Promise<CommandMap[K]["result"]> {
  return invoke<CommandMap[K]["result"]>(command, args);
}

export function listenEvent<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  return listen<T>(event, (message) => handler(message.payload));
}

/**
 * Starts the native drag of a file with the drag plugin. The plugin command
 * takes a Tauri Channel for its events; Pinza ignores drag completion events,
 * so the channel is bound to a no-op listener (an unbound channel can drop
 * events or warn at runtime).
 */
export async function startFileDrag(path: string, iconPath?: string): Promise<void> {
  const { Channel } = await import("@tauri-apps/api/core");
  const onEvent = new Channel<{ result?: string }>();
  // El plugin informa del desenlace del arrastre; dejarlo mudo escondía los
  // fallos (el usuario veía que no arrastraba y el log no decía nada).
  onEvent.onmessage = (message) => {
    if (message?.result === "Cancel") {
      logger.warn("el arrastre nativo terminó sin soltar sobre un destino válido");
    }
  };
  // El plugin espera el contrato serde del crate `drag`: `item` es el array
  // de rutas (untagged Files) y `image` una RUTA a la imagen del fantasma
  // (untagged File). Pasar `{ files: [...] }` o bytes vacíos hace fallar la
  // deserialización y el arrastre no llega a empezar.
  await invoke("plugin:drag|start_drag", {
    item: [path],
    image: iconPath ?? path,
    options: { mode: "copy" },
    onEvent,
  });
}

/** Closes the current Tauri window (window.close() does not work for
 * webviews the shell created). */
export async function closeCurrentWindow(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().close();
}

/** Turns a filesystem path into an asset-protocol URL served by the shell. */
export function assetUrl(filePath: string): string {
  return convertFileSrc(filePath);
}
