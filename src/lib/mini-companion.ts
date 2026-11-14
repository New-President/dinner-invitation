/** The sprite is drawn in a 76x92 viewBox and rendered at 1.25x. */
export const MINI_SPRITE_SCALE = 1.25;
export const MINI_WIDTH = 76 * MINI_SPRITE_SCALE;
export const MINI_HEIGHT = 92 * MINI_SPRITE_SCALE;
export const FLOOR_BOTTOM_OFFSET = 6;
export const DRAG_ACTIVATION_PX = 4;
export const KEYBOARD_STEP_PX = 15;
export const GRAVITY_PX_PER_S2 = 1950;
export const ANXIOUS_WALK_SPEED_PX_PER_S = 64;
export const TABLE_WALK_SPEED_PX_PER_S = 152;
/** Window event fired the moment the cheer cat crash-lands behind the dinner table. */
export const CAT_IMPACT_EVENT = 'cheer-cat:impact';
/** Window event fired when the cheer cat lands on the dinner table and eats the food. */
export const CAT_SNACK_EVENT = 'cheer-cat:snack';
/** Attribute marking the dinner table scene so the cheer cat can find where to jump. */
export const DINNER_TABLE_ATTR = 'data-dinner-table';
/** Bottom space pages reserve so content never sits underneath the companion stage. */
export const MINI_STAGE_CLEARANCE_PX = MINI_HEIGHT + FLOOR_BOTTOM_OFFSET + 8;

export type WizardStepKind = 'region' | 'restaurant' | 'comment' | 'thank-you';
export type FacingDirection = 'left' | 'right';

export type MiniExpression =
  | 'anxious-walk'
  | 'anxious-peek'
  | 'anxious-fidget'
  | 'surprised-drag'
  | 'bracing-fall'
  | 'dizzy-land'
  | 'happy-walk'
  | 'casual-eating';

export type CompanionPhase =
  | {
      readonly kind: 'roaming-anxious';
      readonly action: 'pacing' | 'peeking' | 'checking-watch' | 'fidgeting';
      readonly remainingMs: number;
      readonly targetX: number;
    }
  | {
      readonly kind: 'dragging';
      readonly offsetX: number;
      readonly offsetY: number;
      readonly vx: number;
    }
  | {
      readonly kind: 'falling';
      readonly vx: number;
      readonly vy: number;
    }
  | {
      readonly kind: 'landed';
      readonly remainingMs: number;
    }
  | {
      readonly kind: 'walking-to-table';
      readonly seatX: number;
    }
  | {
      readonly kind: 'seated-eating';
      readonly seatX: number;
      readonly biteTick: number;
    };

export interface CompanionViewport {
  readonly width: number;
  readonly height: number;
  /**
   * Viewport y of the surface Mini stands on (e.g. the top edge of a
   * page footer). Defaults to just above the bottom of the viewport.
   */
  readonly floor?: number;
}

export interface CompanionState {
  readonly x: number;
  readonly y: number;
  readonly facing: FacingDirection;
  readonly phase: CompanionPhase;
  readonly step: WizardStepKind;
  readonly paused: boolean;
}

export function computeFloorSurface(viewport: CompanionViewport): number {
  return viewport.floor ?? viewport.height - FLOOR_BOTTOM_OFFSET;
}

export function computeFloorY(viewport: CompanionViewport): number {
  return Math.max(8, computeFloorSurface(viewport) - MINI_HEIGHT);
}

export function computeTableLayout(viewport: CompanionViewport): {
  readonly tableLeft: number;
  readonly tableWidth: number;
  readonly seatX: number;
} {
  const isCompact = viewport.width < 640;
  const tableWidth = (isCompact ? 176 : 224) * MINI_SPRITE_SCALE;
  const rightMargin = isCompact
    ? 10
    : Math.min(64, Math.round(viewport.width * 0.045));
  const tableLeft = Math.max(84, viewport.width - tableWidth - rightMargin);
  const maxCompanionX = Math.max(8, viewport.width - MINI_WIDTH - 8);
  const seatX = Math.min(maxCompanionX, Math.max(8, tableLeft - 4 * MINI_SPRITE_SCALE));
  return { tableLeft, tableWidth, seatX };
}

export function clampCompanionPosition(
  x: number,
  y: number,
  viewport: CompanionViewport
): { readonly x: number; readonly y: number } {
  const maxX = Math.max(8, viewport.width - MINI_WIDTH - 8);
  const maxY = computeFloorY(viewport);
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  };
}

export function describeHorizontalZone(
  x: number,
  viewportWidth: number
): 'left side' | 'center' | 'right side' {
  if (viewportWidth <= 0) {
    return 'center';
  }
  const centerRatio = (x + MINI_WIDTH / 2) / viewportWidth;
  if (centerRatio < 0.34) {
    return 'left side';
  }
  if (centerRatio > 0.66) {
    return 'right side';
  }
  return 'center';
}

export function deriveMiniExpression(phase: CompanionPhase): MiniExpression {
  switch (phase.kind) {
    case 'roaming-anxious':
      if (phase.action === 'pacing') return 'anxious-walk';
      return phase.action === 'fidgeting' ? 'anxious-fidget' : 'anxious-peek';
    case 'dragging':
      return 'surprised-drag';
    case 'falling':
      return 'bracing-fall';
    case 'landed':
      return 'dizzy-land';
    case 'walking-to-table':
      return 'happy-walk';
    case 'seated-eating':
      return 'casual-eating';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function pickAnxiousTargetX(
  currentX: number,
  viewport: CompanionViewport,
  unitSample: number
): number {
  const minWalkX = 16;
  const maxWalkX = Math.max(
    minWalkX,
    viewport.width - MINI_WIDTH - 16
  );
  const span = maxWalkX - minWalkX;
  if (span <= 80) {
    return currentX - minWalkX > maxWalkX - currentX ? minWalkX : maxWalkX;
  }

  const candidate = Math.round(minWalkX + Math.min(0.999, Math.max(0, unitSample)) * span);
  if (Math.abs(candidate - currentX) >= 80) {
    return candidate;
  }

  const pushRight = currentX + 96;
  if (pushRight <= maxWalkX) {
    return pushRight;
  }
  return Math.max(minWalkX, currentX - 96);
}

export function createInitialCompanionState(
  step: WizardStepKind,
  viewport: CompanionViewport
): CompanionState {
  const floorY = computeFloorY(viewport);
  const start = clampCompanionPosition(
    step === 'thank-you' ? 8 : Math.round(viewport.width * 0.2),
    floorY,
    viewport
  );

  if (step === 'thank-you') {
    const { seatX } = computeTableLayout(viewport);
    return {
      x: start.x,
      y: floorY,
      facing: seatX >= start.x ? 'right' : 'left',
      phase: { kind: 'walking-to-table', seatX },
      step,
      paused: false,
    };
  }

  const targetX = pickAnxiousTargetX(start.x, viewport, 0.72);
  return {
    x: start.x,
    y: floorY,
    facing: targetX >= start.x ? 'right' : 'left',
    phase: {
      kind: 'roaming-anxious',
      action: 'pacing',
      remainingMs: 4200,
      targetX,
    },
    step,
    paused: false,
  };
}

/**
 * Reacts to the floor moving (e.g. the footer appears or disappears between
 * steps). If the floor dropped away beneath him he falls to the new floor; if
 * it rose he steps up onto it. Held or already-falling companions are left alone.
 */
export function settleOnNewFloor(
  state: CompanionState,
  viewport: CompanionViewport
): CompanionState {
  if (state.phase.kind === 'dragging' || state.phase.kind === 'falling') {
    return state;
  }
  const floorY = computeFloorY(viewport);
  if (state.y < floorY - 2) {
    return { ...state, phase: { kind: 'falling', vx: 0, vy: 0 } };
  }
  if (state.y > floorY) {
    return { ...state, y: floorY };
  }
  return state;
}

/**
 * Arrow-key movement. The companion is held (dragging phase) while keys are
 * pressed; the caller drops him with endCompanionDrag once keys stop.
 */
export function nudgeCompanion(
  state: CompanionState,
  dx: number,
  dy: number,
  viewport: CompanionViewport
): CompanionState {
  const held =
    state.phase.kind === 'dragging' ? state : startCompanionDrag(state, 0, 0);
  const clamped = clampCompanionPosition(held.x + dx, held.y + dy, viewport);
  const facing: FacingDirection = dx > 0 ? 'right' : dx < 0 ? 'left' : held.facing;
  return {
    ...held,
    x: clamped.x,
    y: clamped.y,
    facing,
    phase: {
      kind: 'dragging',
      offsetX: 0,
      offsetY: 0,
      vx: Math.max(-900, Math.min(900, dx * 12)),
    },
  };
}

export function syncCompanionStep(
  state: CompanionState,
  nextStep: WizardStepKind,
  viewport: CompanionViewport
): CompanionState {
  if (state.step === nextStep) {
    return state;
  }

  const floorY = computeFloorY(viewport);
  if (state.phase.kind === 'dragging' || state.phase.kind === 'falling') {
    return {
      ...state,
      step: nextStep,
    };
  }

  if (nextStep === 'thank-you') {
    const { seatX } = computeTableLayout(viewport);
    const startX = clampCompanionPosition(8, floorY, viewport).x;
    if (state.paused) {
      return {
        ...state,
        x: seatX,
        y: floorY,
        facing: 'right',
        step: nextStep,
        phase: { kind: 'seated-eating', seatX, biteTick: 0 },
      };
    }
    return {
      ...state,
      x: startX,
      y: floorY,
      facing: seatX >= startX ? 'right' : 'left',
      step: nextStep,
      phase: { kind: 'walking-to-table', seatX },
    };
  }

  if (
    state.phase.kind === 'walking-to-table' ||
    state.phase.kind === 'seated-eating'
  ) {
    const clampedX = clampCompanionPosition(state.x, floorY, viewport).x;
    const targetX = pickAnxiousTargetX(clampedX, viewport, 0.28);
    return {
      ...state,
      x: clampedX,
      y: floorY,
      facing: targetX >= clampedX ? 'right' : 'left',
      step: nextStep,
      phase: {
        kind: 'roaming-anxious',
        action: 'pacing',
        remainingMs: 3800,
        targetX,
      },
    };
  }

  return {
    ...state,
    step: nextStep,
  };
}

export function startCompanionDrag(
  state: CompanionState,
  offsetX: number,
  offsetY: number
): CompanionState {
  return {
    ...state,
    phase: {
      kind: 'dragging',
      offsetX,
      offsetY,
      vx: 0,
    },
  };
}

export function moveCompanionDrag(
  state: CompanionState,
  clientX: number,
  clientY: number,
  dtMs: number,
  viewport: CompanionViewport
): CompanionState {
  if (state.phase.kind !== 'dragging') {
    return state;
  }

  const { offsetX, offsetY } = state.phase;
  const clamped = clampCompanionPosition(
    clientX - offsetX,
    clientY - offsetY,
    viewport
  );
  const dx = clamped.x - state.x;
  const safeDtSec = Math.max(0.008, Math.min(0.1, dtMs / 1000));
  const rawVx = dx / safeDtSec;
  const vx = Math.max(-900, Math.min(900, rawVx * 0.65 + state.phase.vx * 0.35));
  const facing: FacingDirection =
    Math.abs(dx) > 0.5 ? (dx > 0 ? 'right' : 'left') : state.facing;

  return {
    ...state,
    x: clamped.x,
    y: clamped.y,
    facing,
    phase: {
      kind: 'dragging',
      offsetX,
      offsetY,
      vx,
    },
  };
}

export function endCompanionDrag(
  state: CompanionState,
  viewport: CompanionViewport
): CompanionState {
  const floorY = computeFloorY(viewport);
  const clamped = clampCompanionPosition(state.x, state.y, viewport);
  const releaseVx = state.phase.kind === 'dragging' ? state.phase.vx * 0.25 : 0;

  if (clamped.y < floorY - 2) {
    return {
      ...state,
      x: clamped.x,
      y: clamped.y,
      phase: {
        kind: 'falling',
        vx: releaseVx,
        vy: 0,
      },
    };
  }

  return {
    ...state,
    x: clamped.x,
    y: floorY,
    phase: {
      kind: 'landed',
      remainingMs: 320,
    },
  };
}

export function stepCompanionTick(
  state: CompanionState,
  dtMs: number,
  viewport: CompanionViewport,
  randomUnit: () => number = Math.random
): CompanionState {
  const clampedDtMs = Math.max(0, Math.min(64, dtMs));
  if (clampedDtMs === 0) {
    return state;
  }

  const dtSec = clampedDtMs / 1000;
  const floorY = computeFloorY(viewport);

  switch (state.phase.kind) {
    case 'dragging': {
      return state;
    }

    case 'falling': {
      const nextVy = state.phase.vy + GRAVITY_PX_PER_S2 * dtSec;
      const nextVx = state.phase.vx * Math.pow(0.92, clampedDtMs / 16.67);
      const rawX = state.x + nextVx * dtSec;
      const rawY = state.y + nextVy * dtSec;
      const clamped = clampCompanionPosition(rawX, rawY, viewport);
      const facing: FacingDirection =
        Math.abs(nextVx) > 8 ? (nextVx > 0 ? 'right' : 'left') : state.facing;

      if (rawY >= floorY - 0.5 || clamped.y >= floorY - 0.5) {
        return {
          ...state,
          x: clamped.x,
          y: floorY,
          facing,
          phase: {
            kind: 'landed',
            remainingMs: 360,
          },
        };
      }

      return {
        ...state,
        x: clamped.x,
        y: clamped.y,
        facing,
        phase: {
          kind: 'falling',
          vx: nextVx,
          vy: nextVy,
        },
      };
    }

    case 'landed': {
      const clampedX = clampCompanionPosition(state.x, floorY, viewport).x;
      const remainingMs = state.phase.remainingMs - clampedDtMs;
      if (remainingMs > 0) {
        return {
          ...state,
          x: clampedX,
          y: floorY,
          phase: {
            kind: 'landed',
            remainingMs,
          },
        };
      }

      if (state.step === 'thank-you') {
        const { seatX } = computeTableLayout(viewport);
        if (state.paused) {
          return {
            ...state,
            x: seatX,
            y: floorY,
            facing: 'right',
            phase: {
              kind: 'seated-eating',
              seatX,
              biteTick: 0,
            },
          };
        }
        return {
          ...state,
          x: clampedX,
          y: floorY,
          facing: seatX >= clampedX ? 'right' : 'left',
          phase: {
            kind: 'walking-to-table',
            seatX,
          },
        };
      }

      const targetX = pickAnxiousTargetX(clampedX, viewport, randomUnit());
      return {
        ...state,
        x: clampedX,
        y: floorY,
        facing: targetX >= clampedX ? 'right' : 'left',
        phase: {
          kind: 'roaming-anxious',
          action: 'pacing',
          remainingMs: 3600,
          targetX,
        },
      };
    }

    case 'roaming-anxious': {
      const clampedStart = clampCompanionPosition(state.x, floorY, viewport);
      if (state.paused) {
        return {
          ...state,
          x: clampedStart.x,
          y: floorY,
        };
      }

      if (state.phase.action === 'pacing') {
        const clampedTargetX = clampCompanionPosition(
          state.phase.targetX,
          floorY,
          viewport
        ).x;
        const delta = clampedTargetX - clampedStart.x;
        const maxStep = ANXIOUS_WALK_SPEED_PX_PER_S * dtSec;
        const nextRemaining = state.phase.remainingMs - clampedDtMs;

        if (Math.abs(delta) <= Math.max(2, maxStep) || nextRemaining <= 0) {
          const arrivalX =
            Math.abs(delta) <= Math.max(2, maxStep)
              ? clampedTargetX
              : clampedStart.x;
          const branchRoll = randomUnit();
          if (branchRoll < 0.3) {
            return {
              ...state,
              x: arrivalX,
              y: floorY,
              phase: {
                kind: 'roaming-anxious',
                action: 'peeking',
                remainingMs: Math.round(1400 + randomUnit() * 800),
                targetX: arrivalX,
              },
            };
          }
          if (branchRoll < 0.55) {
            return {
              ...state,
              x: arrivalX,
              y: floorY,
              phase: {
                kind: 'roaming-anxious',
                action: 'checking-watch',
                remainingMs: Math.round(1450 + randomUnit() * 750),
                targetX: arrivalX,
              },
            };
          }
          if (branchRoll < 0.85) {
            // Stops to fidget nervously: wringing hands or biting nails.
            return {
              ...state,
              x: arrivalX,
              y: floorY,
              phase: {
                kind: 'roaming-anxious',
                action: 'fidgeting',
                remainingMs: Math.round(1600 + randomUnit() * 900),
                targetX: arrivalX,
              },
            };
          }
          const nextTargetX = pickAnxiousTargetX(
            arrivalX,
            viewport,
            randomUnit()
          );
          return {
            ...state,
            x: arrivalX,
            y: floorY,
            facing: nextTargetX >= arrivalX ? 'right' : 'left',
            phase: {
              kind: 'roaming-anxious',
              action: 'pacing',
              remainingMs: Math.round(3200 + randomUnit() * 2200),
              targetX: nextTargetX,
            },
          };
        }

        const nextX = clampedStart.x + Math.sign(delta) * maxStep;
        return {
          ...state,
          x: nextX,
          y: floorY,
          facing: delta >= 0 ? 'right' : 'left',
          phase: {
            kind: 'roaming-anxious',
            action: 'pacing',
            remainingMs: nextRemaining,
            targetX: clampedTargetX,
          },
        };
      }

      const nextRemaining = state.phase.remainingMs - clampedDtMs;
      if (nextRemaining > 0) {
        return {
          ...state,
          x: clampedStart.x,
          y: floorY,
          phase: {
            ...state.phase,
            remainingMs: nextRemaining,
          },
        };
      }

      const nextTargetX = pickAnxiousTargetX(
        clampedStart.x,
        viewport,
        randomUnit()
      );
      return {
        ...state,
        x: clampedStart.x,
        y: floorY,
        facing: nextTargetX >= clampedStart.x ? 'right' : 'left',
        phase: {
          kind: 'roaming-anxious',
          action: 'pacing',
          remainingMs: Math.round(3200 + randomUnit() * 2400),
          targetX: nextTargetX,
        },
      };
    }

    case 'walking-to-table': {
      const { seatX } = computeTableLayout(viewport);
      const clampedStart = clampCompanionPosition(state.x, floorY, viewport);
      if (state.paused) {
        return {
          ...state,
          x: clampedStart.x,
          y: floorY,
          phase: {
            kind: 'walking-to-table',
            seatX,
          },
        };
      }

      const delta = seatX - clampedStart.x;
      const maxStep = TABLE_WALK_SPEED_PX_PER_S * dtSec;
      if (Math.abs(delta) <= Math.max(4, maxStep)) {
        return {
          ...state,
          x: seatX,
          y: floorY,
          facing: 'right',
          phase: {
            kind: 'seated-eating',
            seatX,
            biteTick: 0,
          },
        };
      }

      const nextX = clampedStart.x + Math.sign(delta) * maxStep;
      return {
        ...state,
        x: nextX,
        y: floorY,
        facing: delta >= 0 ? 'right' : 'left',
        phase: {
          kind: 'walking-to-table',
          seatX,
        },
      };
    }

    case 'seated-eating': {
      const { seatX } = computeTableLayout(viewport);
      if (state.paused) {
        return {
          ...state,
          x: seatX,
          y: floorY,
          facing: 'right',
          phase: {
            ...state.phase,
            seatX,
          },
        };
      }

      return {
        ...state,
        x: seatX,
        y: floorY,
        facing: 'right',
        phase: {
          kind: 'seated-eating',
          seatX,
          biteTick: (state.phase.biteTick + clampedDtMs) % 72000,
        },
      };
    }

    default: {
      const _exhaustive: never = state.phase;
      return _exhaustive;
    }
  }
}
