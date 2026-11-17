/**
 * The only module in the web app allowed to touch `@tauri-apps/api`.
 *
 * Everything else imports the typed wrappers from `src/shared/ipc`.
 */
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { CommandMap } from "./contract";

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
export async function startFileDrag(path: string): Promise<void> {
  const { Channel } = await import("@tauri-apps/api/core");
  const onEvent = new Channel<unknown>();
  onEvent.onmessage = () => undefined;
  await invoke("plugin:drag|start_drag", {
    item: { files: [path] },
    image: { raw: [] },
    options: {},
    onEvent,
  });
}

/** Turns a filesystem path into an asset-protocol URL served by the shell. */
export function assetUrl(filePath: string): string {
  return convertFileSrc(filePath);
}
