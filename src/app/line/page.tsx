"use client";

import { ClothesLine } from "@/features/line/clothes-line";
import { WindowShell } from "@/shared/ui/window-shell";

export default function LineWindow() {
  return (
    <WindowShell window="line">
      <ClothesLine />
    </WindowShell>
  );
}
