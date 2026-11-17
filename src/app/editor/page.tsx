"use client";

import { WindowShell } from "@/shared/ui/window-shell";

export default function EditorWindow() {
  return (
    <WindowShell window="editor">
      <main className="p-6">
        <h1 className="text-lg font-semibold text-ink">Anotar captura</h1>
        <p className="mt-2 text-sm text-ink-muted">El editor llega con el hito M3.</p>
      </main>
    </WindowShell>
  );
}
