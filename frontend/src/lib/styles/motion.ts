import type { Transition, Variants } from "framer-motion";

/**
 * FulfilmentKit Motion System (V1.1 Locked)
 *
 * Rules:
 * - Subtle transitions only
 * - No bouncy motion (no spring defaults)
 * - Consistent durations across the app
 * - Prefer opacity + small translate shifts
 */

export const fkMotion = {
  duration: {
    fast: 0.12,
    base: 0.18,
    slow: 0.24,
  },

  ease: {
    // Smooth, non-bouncy easing
    standard: [0.2, 0.0, 0.2, 1.0] as const,
    exit: [0.4, 0.0, 1.0, 1.0] as const,
  },

  transition: {
    fast: {
      duration: 0.12,
      ease: [0.2, 0.0, 0.2, 1.0],
    } satisfies Transition,
    base: {
      duration: 0.18,
      ease: [0.2, 0.0, 0.2, 1.0],
    } satisfies Transition,
    exit: {
      duration: 0.18,
      ease: [0.4, 0.0, 1.0, 1.0],
    } satisfies Transition,
  },

  variants: {
    // Used for page content transitions (inside a module)
    page: {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 6 },
    } satisfies Variants,

    // Used for module switch transitions (top bar content area)
    module: {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 4 },
    } satisfies Variants,

    // Subtle card hover micro interaction (no scaling bounce)
    cardHover: {
      rest: { y: 0 },
      hover: { y: -2 },
    } satisfies Variants,

    // Optional very subtle skeleton shimmer (can also be disabled)
    shimmer: {
      initial: { opacity: 0.6 },
      animate: { opacity: 1 },
    } satisfies Variants,
  },
} as const;