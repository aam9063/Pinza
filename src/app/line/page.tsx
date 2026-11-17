"use client";

import { WindowShell } from "@/shared/ui/window-shell";

export default function LineWindow() {
  return (
    <WindowShell window="line">
      <p className="px-6 py-4 text-sm text-ink-muted">Línea de capturas</p>
    </WindowShell>
  );
}
