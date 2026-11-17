/**
 * Contrato IPC que inyecta Tauri en el WebView, tipado para las pruebas E2E.
 */
declare global {
  interface Window {
    readonly __TAURI_INTERNALS__: {
      readonly invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

export {};
