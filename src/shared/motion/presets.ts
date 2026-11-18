/**
 * Motion presets shared by every window.
 *
 * Only `transform` and `opacity` may be animated; these transitions are tuned
 * for that. `MotionConfig reducedMotion="user"` downgrades all of them to a
 * short cross-fade when Windows reports "Show animations" disabled.
 */
import type { Transition, Variants } from "motion/react";

/** New thumbnail dropping onto the line. */
export const springDrop: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 26,
  mass: 0.9,
};

/** Peg sway after the drop settles. */
export const springSway: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 12,
};

/** Line sliding down from the top edge. */
export const slideDown: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 30,
};

/** Unhanging: the peg opens and the thumbnail falls out of the line. */
export const unhang: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 18,
  velocity: 2,
};

/** Lifting a thumbnail out of the line while dragging it. */
export const lift: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 32,
};

export const lineHidden: Variants = {
  hidden: { opacity: 0, transform: "translateY(-100%)" },
  visible: { opacity: 1, transform: "translateY(0%)" },
};

export const thumbnailHanging: Variants = {
  hanging: { opacity: 1, transform: "translateY(0%) scale(1)" },
  hang: { opacity: 1, transform: "translateY(0%) scale(1)" },
  unhung: { opacity: 0, transform: "translateY(120%) scale(0.92)" },
};

/**
 * Tendedero-style hang: the new capture flies up from below the strip toward
 * the rope and settles with the spring. Starts slightly oversized (closer to
 * the viewer) and fades in while traveling.
 */
export const thumbnailFlying: Variants = {
  flying: { opacity: 0, transform: "translateY(560%) scale(1.35) rotate(6deg)" },
  hanging: { opacity: 1, transform: "translateY(0%) scale(1) rotate(0deg)" },
  hang: { opacity: 1, transform: "translateY(0%) scale(1) rotate(0deg)" },
  unhung: { opacity: 0, transform: "translateY(120%) scale(0.92)" },
};
