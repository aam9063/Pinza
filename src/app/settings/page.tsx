"use client";

import { WindowShell } from "@/shared/ui/window-shell";

export default function SettingsWindow() {
  return (
    <WindowShell window="settings">
      <main className="p-6">
        <h1 className="text-lg font-semibold text-ink">Ajustes</h1>
        <p className="mt-2 text-sm text-ink-muted">Los ajustes llegan con el hito M4.</p>
      </main>
    </WindowShell>
  );
}
