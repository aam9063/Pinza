/**
 * Minimal logger for the web side.
 *
 * The Tauri log plugin owns the Rust log file; the web mirrors its messages
 * there once the `log` bridge lands with the system milestone.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

function emit(level: LogLevel, message: string, context?: unknown): void {
  if (context === undefined) {
    console[level](message);
    return;
  }
  console[level](message, context);
}

export const logger = {
  debug: (message: string, context?: unknown) => emit("debug", message, context),
  info: (message: string, context?: unknown) => emit("info", message, context),
  warn: (message: string, context?: unknown) => emit("warn", message, context),
  error: (message: string, context?: unknown) => emit("error", message, context),
};
