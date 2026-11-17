"use client";

import { WindowShell } from "@/shared/ui/window-shell";

export default function OnboardingWindow() {
  return (
    <WindowShell window="onboarding">
      <main className="p-6">
        <h1 className="text-lg font-semibold text-ink">Primeros pasos</h1>
        <p className="mt-2 text-sm text-ink-muted">
          El asistente de tres pasos llega con el hito M5.
        </p>
      </main>
    </WindowShell>
  );
}
