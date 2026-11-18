'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  DRAG_ACTIVATION_PX,
  createSeatedGuest,
  grabGuest,
  moveGuest,
  nudgeGuest,
  releaseGuest,
  stepGuestTick,
  type GuestPhase,
  type GuestState,
  KEYBOARD_STEP_PX,
  MINI_SPRITE_SCALE,
  MINI_HEIGHT,
  MINI_WIDTH,
  CAT_IMPACT_EVENT,
  CAT_SNACK_EVENT,
  DINNER_TABLE_ATTR,
  computeFloorSurface,
  computeTableLayout,
  createInitialCompanionState,
  deriveMiniExpression,
  describeHorizontalZone,
  endCompanionDrag,
  moveCompanionDrag,
  nudgeCompanion,
  settleOnNewFloor,
  startCompanionDrag,
  stepCompanionTick,
  syncCompanionStep,
  type CompanionPhase,
  type CompanionState,
  type CompanionViewport,
  type MiniExpression,
  type WizardStepKind,
} from '@/lib/mini-companion';

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

type RoamingStep = Exclude<WizardStepKind, 'thank-you'>;

/** Lines Mini says while pacing; one pops up every few seconds. */
const CHATTER_LINES: Readonly<Record<RoamingStep, readonly string[]>> = {
  region: [
    'Where should we eat? 🤔',
    'Exam ends at 7 PM… ⏰',
    'West is closest to NUS!',
    'Tap a region on the map 🗺️',
    'So hungry already…',
    'Drag me if I’m in the way!',
    'Vegetarian feast incoming 🥬',
    '*gulp* 😰',
    'W-what if you pick the far one? 😵',
  ],
  restaurant: [
    'Ooh, which one? 👀',
    'The gold one’s on my list ✨',
    'They all look so good…',
    'Tap a card to pick!',
    'Check the opening hours 🕒',
    'I’d eat anything here 😋',
    'Eek, so many choices 😬',
    'Hope you like it… 🥺',
  ],
  comment: [
    'Write anything! 📝',
    'I’ll read it after my paper',
    'No pressure… (very nervous)',
    'Almost done!',
    'Dietary notes welcome 🥗',
    'Can’t wait for dinner!',
    'W-what are you typing? 😳',
    'My palms are sweaty… 😅',
  ],
};

const PEEK_LINES: Readonly<Record<RoamingStep, readonly string[]>> = {
  region: ['Hmm… where to? 👀', 'Any region works, I’ll hurry!', 'Ooh, the map!'],
  restaurant: ['Which one, which one… 👀', 'That one looks good!', 'So many choices…'],
  comment: ['What are you writing? 👀', 'I’m not peeking!', 'Ooh, a note?'],
};

const WATCH_LINES = ['Exam ends 7:00 PM… ⏰', '*checks watch nervously*', '6:59… 7:00… food!'] as const;

const FIDGET_LINES = [
  '*fidgets nervously* 😬',
  'Ahaha… I’m totally fine 😅',
  'Don’t panic, don’t panic…',
  '*bites nails*',
  'Breathe in… breathe out… 😮‍💨',
  'Is my hair okay?? 😰',
] as const;

const POKE_LINES: Readonly<Record<WizardStepKind, readonly string[]>> = {
  region: ['Hi! Pick a region 🗺️', 'Hehe, that tickles', 'I’m studying… sort of'],
  restaurant: ['All vegetarian, all good 🥬', 'Pick whatever looks yummy!', 'I’m not nervous. You’re nervous.'],
  comment: ['Leave me a note? ✍️', 'Almost done!', 'Don’t mind me, just pacing'],
  'thank-you': ['Exam’s over, let’s eat! 🥢', 'This is so good', 'Thanks for coming 😊'],
};

/** Dinner conversation; the guest opens with a greeting. */
const DINNER_CHAT = [
  { speaker: 'guest', line: 'Nice to meet you! 😊' },
  { speaker: 'mini', line: 'Nice to meet you too! 😄' },
  { speaker: 'guest', line: 'How did the exam go?' },
  { speaker: 'mini', line: 'Survived it 😮‍💨 This helps!' },
  { speaker: 'guest', line: 'This place is so good 🥢' },
  { speaker: 'mini', line: 'Try this one, it’s amazing!' },
  { speaker: 'guest', line: 'Cheers to being done! 🥤' },
  { speaker: 'mini', line: 'Cheers! 🥤' },
] as const;

const GUEST_POKE_LINES = ['Hi there! 👋', 'Hehe, that tickles 😊', 'This food is so good!', 'Don’t drop me! 😳'] as const;

/** 72 s bite cycle / 4.5 s = 16 lines, a whole number of passes through DINNER_CHAT. */
const DINNER_LINE_MS = 4500;
/** One ambient line every SPEECH_EVERY_MS, each held on screen for SPEECH_SHOW_MS. */
const SPEECH_FIRST_MS = 1500;
const SPEECH_EVERY_MS = 7500;
const SPEECH_SHOW_MS = 5000;
const POKE_SHOW_MS = 3200;
/** After a touch elsewhere on the page Mini stays quiet so his bubble doesn't cover what you're tapping. */
const QUIET_AFTER_TOUCH_MS = 6000;
/** Narrow screens put Mini's bubble beside him instead of over the content above. */
const COMPACT_MAX_WIDTH = 640;
const SIDE_BUBBLE_OVERLAP = 18;
const FLOOR_POLL_MS = 150;
const SNACK_REACT_MS = 1900;
const SNACK_REFILL_MS = 7000;
const JOLT_MS = 650;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Viewport plus the floor Mini stands on: the top edge of the first visible
 * page footer marked with data-mini-floor, or the bottom of the screen.
 */
function readViewport(): CompanionViewport {
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = window.innerHeight;
  for (const el of document.querySelectorAll<HTMLElement>('[data-mini-floor]')) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.top > MINI_HEIGHT + 16 && rect.top < height) {
      return { width, height, floor: Math.round(rect.top) + 1 };
    }
  }
  return { width, height };
}

function sameViewport(a: CompanionViewport | null, b: CompanionViewport): boolean {
  return !!a && a.width === b.width && a.height === b.height && a.floor === b.floor;
}

function dinnerChatIndex(phase: CompanionPhase): number {
  return phase.kind === 'seated-eating'
    ? Math.floor(phase.biteTick / DINNER_LINE_MS) % DINNER_CHAT.length
    : -1;
}

type RoamingAction = Extract<CompanionPhase, { kind: 'roaming-anxious' }>['action'];

/** The line pool for what Mini is doing right now, with a key for cycling through it. */
function ambientPool(step: RoamingStep, action: RoamingAction): { readonly key: string; readonly lines: readonly string[] } {
  switch (action) {
    case 'peeking':
      return { key: `peek-${step}`, lines: PEEK_LINES[step] };
    case 'checking-watch':
      return { key: 'watch', lines: WATCH_LINES };
    case 'fidgeting':
      return { key: 'fidget', lines: FIDGET_LINES };
    case 'pacing':
      return { key: `chatter-${step}`, lines: CHATTER_LINES[step] };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function isGuestVisuallyDifferent(a: GuestState, b: GuestState): boolean {
  return (
    Math.abs(a.x - b.x) > 0.05 ||
    Math.abs(a.y - b.y) > 0.05 ||
    a.facing !== b.facing ||
    a.phase.kind !== b.phase.kind ||
    (a.phase.kind === 'held' && b.phase.kind === 'held' && Math.round(a.phase.vx / 60) !== Math.round(b.phase.vx / 60))
  );
}

function guestPose(phase: GuestPhase): MiniPose {
  switch (phase.kind) {
    case 'seated':
      return 'seated';
    case 'held':
      return 'dangle';
    case 'falling':
      return 'fall';
    case 'landed':
      return 'land';
    case 'returning':
      return 'walk';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Drag handle: pointer drag, arrow-key nudging, tap                   */
/* ------------------------------------------------------------------ */

interface DragCallbacks {
  /** Top-left of the draggable box, or null when it can't be grabbed yet. */
  readonly origin: () => { readonly x: number; readonly y: number } | null;
  readonly grab: (offsetX: number, offsetY: number) => void;
  readonly move: (clientX: number, clientY: number, dtMs: number) => void;
  readonly nudge: (dx: number, dy: number) => void;
  readonly release: () => void;
  readonly isHeld: () => boolean;
  readonly tap: () => void;
}

const ARROW_DELTAS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-KEYBOARD_STEP_PX, 0],
  ArrowRight: [KEYBOARD_STEP_PX, 0],
  ArrowUp: [0, -KEYBOARD_STEP_PX],
  ArrowDown: [0, KEYBOARD_STEP_PX],
};

function useDragHandle(callbacks: DragCallbacks) {
  const callbacksRef = useRef(callbacks);
  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });
  const pointerRef = useRef<PointerSession | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const keyboardDropTimerRef = useRef<number | null>(null);

  const drop = useCallback(() => {
    if (keyboardDropTimerRef.current !== null) {
      window.clearTimeout(keyboardDropTimerRef.current);
      keyboardDropTimerRef.current = null;
    }
    if (callbacksRef.current.isHeld()) callbacksRef.current.release();
  }, []);

  useEffect(
    () => () => {
      if (keyboardDropTimerRef.current !== null) window.clearTimeout(keyboardDropTimerRef.current);
    },
    []
  );

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = pointerRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (session.dragging) drop();
  };

  return {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      const origin = callbacksRef.current.origin();
      if (!origin || !event.isPrimary || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - origin.x,
        offsetY: event.clientY - origin.y,
        lastMoveAt: event.timeStamp,
        dragging: false,
      };
    },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      const session = pointerRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (!session.dragging) {
        const travel = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
        if (travel < DRAG_ACTIVATION_PX) return;
        session.dragging = true;
        suppressClickRef.current = true;
        callbacksRef.current.grab(session.offsetX, session.offsetY);
      }
      callbacksRef.current.move(event.clientX, event.clientY, event.timeStamp - session.lastMoveAt);
      session.lastMoveAt = event.timeStamp;
    },
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerRef.current?.pointerId === event.pointerId) finishPointer(event);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const delta = ARROW_DELTAS[event.key];
      if (delta) {
        event.preventDefault();
        callbacksRef.current.nudge(delta[0], delta[1]);
        if (keyboardDropTimerRef.current !== null) window.clearTimeout(keyboardDropTimerRef.current);
        keyboardDropTimerRef.current = window.setTimeout(drop, 900);
        return;
      }
      if (callbacksRef.current.isHeld() && ['Enter', ' ', 'Escape'].includes(event.key)) {
        event.preventDefault();
        drop();
      }
    },
    onBlur: drop,
    onClick: () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      callbacksRef.current.tap();
    },
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  };
}

function tiltBucket(phase: CompanionPhase): number {
  return phase.kind === 'dragging' ? Math.round(phase.vx / 60) : 0;
}

/** Only re-render React when something visible changed (biteTick alone is invisible). */
function isVisuallyDifferent(a: CompanionState, b: CompanionState): boolean {
  return (
    Math.abs(a.x - b.x) > 0.05 ||
    Math.abs(a.y - b.y) > 0.05 ||
    a.facing !== b.facing ||
    a.step !== b.step ||
    a.phase.kind !== b.phase.kind ||
    (a.phase.kind === 'roaming-anxious' &&
      b.phase.kind === 'roaming-anxious' &&
      a.phase.action !== b.phase.action) ||
    tiltBucket(a.phase) !== tiltBucket(b.phase) ||
    dinnerChatIndex(a.phase) !== dinnerChatIndex(b.phase)
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface MiniCompanionProps {
  readonly step: WizardStepKind;
  /** Name typed into the form; the dinner guest is labelled with it (falls back to "Guest"). */
  readonly guestName?: string;
}

interface PointerSession {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  lastMoveAt: number;
  dragging: boolean;
}

export function MiniCompanion({ step, guestName }: MiniCompanionProps) {
  const [state, setState] = useState<CompanionState | null>(null);
  const [viewport, setViewport] = useState<CompanionViewport | null>(null);
  const [guest, setGuest] = useState<GuestState | null>(null);
  const [nervousIndex, setNervousIndex] = useState<number>(0);
  const [jolt, setJolt] = useState<boolean>(false);
  /** Mini's ambient line while roaming; changes on a slow timer, not on every action. */
  const [ambientLine, setAmbientLine] = useState<string | null>(null);
  const [pokeLine, setPokeLine] = useState<string | null>(null);
  const [guestPokeLine, setGuestPokeLine] = useState<string | null>(null);
  const [guestLandingKey, setGuestLandingKey] = useState<number>(0);
  const [landingKey, setLandingKey] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string>('');
  /** Easter-egg state: bowls emptied by the cat, and who is currently reacting (they take turns). */
  const [snack, setSnack] = useState<{
    readonly foodGone: boolean;
    readonly reacting: 'mini' | 'guest' | null;
  }>({ foodGone: false, reacting: null });

  const stateRef = useRef<CompanionState | null>(null);
  const viewportRef = useRef<CompanionViewport | null>(null);
  const guestRef = useRef<GuestState | null>(null);
  const pokeTimerRef = useRef<number | null>(null);
  const pokeCountRef = useRef<number>(0);
  const guestPokeTimerRef = useRef<number | null>(null);
  const guestPokeCountRef = useRef<number>(0);
  const quietUntilRef = useRef<number>(0);

  const commit = useCallback((next: CompanionState) => {
    const prev = stateRef.current;
    stateRef.current = next;
    if (prev === next) return;

    if (prev && prev.phase.kind !== next.phase.kind) {
      if (next.phase.kind === 'landed') {
        setLandingKey((k) => k + 1);
        const vp = viewportRef.current;
        if (vp) {
          setAnnouncement(
            `Mini Zi Ren landed on the ${describeHorizontalZone(next.x, vp.width)} of the screen.`
          );
        }
      } else if (next.phase.kind === 'seated-eating') {
        setAnnouncement('Mini Zi Ren sat down at the dinner table and started eating.');
      }
    }
    if (!prev || isVisuallyDifferent(prev, next)) {
      setState(next);
    }
  }, []);

  const commitGuest = useCallback((next: GuestState | null) => {
    const prev = guestRef.current;
    guestRef.current = next;
    if (prev === next) return;
    if (next?.phase.kind === 'landed' && prev?.phase.kind !== 'landed') {
      setGuestLandingKey((k) => k + 1);
    }
    if (!prev || !next || isGuestVisuallyDifferent(prev, next)) {
      setGuest(next);
    }
  }, []);

  // Mount: measure the viewport and floor, then place Mini.
  useEffect(() => {
    const vp = readViewport();
    viewportRef.current = vp;
    setViewport(vp);
    commit(createInitialCompanionState(step, vp));
    // Initial placement only (step deliberately omitted); later step changes go
    // through syncCompanionStep in the effect below.
  }, [commit]);

  // Follow wizard step changes.
  useEffect(() => {
    const current = stateRef.current;
    const vp = viewportRef.current;
    if (current && vp) {
      commit(syncCompanionStep(current, step, vp));
    }
    // The guest only exists at the dinner table.
    if (step !== 'thank-you') commitGuest(null);
    else if (!guestRef.current && vp) commitGuest(createSeatedGuest(vp));
    // A line about the previous step shouldn't linger into the next one.
    setAmbientLine(null);
  }, [step, commit, commitGuest]);

  // Animation loop; also re-measures the viewport and footer floor.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastMeasure = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (now - lastMeasure > FLOOR_POLL_MS) {
        lastMeasure = now;
        const measured = readViewport();
        if (!sameViewport(viewportRef.current, measured)) {
          viewportRef.current = measured;
          setViewport(measured);
          if (stateRef.current) commit(settleOnNewFloor(stateRef.current, measured));
        }
      }
      const current = stateRef.current;
      const vp = viewportRef.current;
      if (current && vp && !document.hidden) {
        commit(stepCompanionTick(current, dt, vp));
      }
      const currentGuest = guestRef.current;
      if (currentGuest && vp && !document.hidden) {
        commitGuest(stepGuestTick(currentGuest, dt, vp));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [commit, commitGuest]);

  // Ambient speech: one line every SPEECH_EVERY_MS, matched to what he's doing
  // at that moment and held for SPEECH_SHOW_MS so it can actually be read.
  useEffect(() => {
    const counters = new Map<string, number>();
    let nextTimer: number | null = null;
    let hideTimer: number | null = null;
    const speak = () => {
      const current = stateRef.current;
      if (!current || current.phase.kind !== 'roaming-anxious' || current.step === 'thank-you') return;
      if (document.hidden || performance.now() < quietUntilRef.current) return;
      const pool = ambientPool(current.step, current.phase.action);
      const n = counters.get(pool.key) ?? 0;
      counters.set(pool.key, n + 1);
      setAmbientLine(pool.lines[n % pool.lines.length]);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setAmbientLine(null), SPEECH_SHOW_MS);
    };
    const loop = () => {
      speak();
      nextTimer = window.setTimeout(loop, SPEECH_EVERY_MS);
    };
    nextTimer = window.setTimeout(loop, SPEECH_FIRST_MS);
    return () => {
      if (nextTimer !== null) window.clearTimeout(nextTimer);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, []);

  // Touching the page anywhere else hushes Mini for a while, so on phones his
  // bubble never sits over the region or card you're about to tap.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (event.target instanceof Element && event.target.closest('.mini-drag-handle')) return;
      quietUntilRef.current = performance.now() + QUIET_AFTER_TOUCH_MS;
      setAmbientLine(null);
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, []);

  // Cycle through nervous faces so he never looks calm before dinner is set.
  useEffect(() => {
    const timer = window.setInterval(() => setNervousIndex((i) => i + 1), NERVOUS_FACE_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Cheer-cat easter egg: the fat cat crash-lands behind the table and everything jolts.
  useEffect(() => {
    let timer: number | null = null;
    const onImpact = () => {
      setJolt(true);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setJolt(false), JOLT_MS);
    };
    window.addEventListener(CAT_IMPACT_EVENT, onImpact);
    return () => {
      window.removeEventListener(CAT_IMPACT_EVENT, onImpact);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  // Cheer-cat easter egg: the cat ate the dinner. Empty the bowls, react, then refill.
  useEffect(() => {
    let timers: number[] = [];
    const clearTimers = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const onSnack = () => {
      clearTimers();
      setSnack({ foodGone: true, reacting: 'mini' });
      setAnnouncement('The cheer cat jumped onto the dinner table and ate the food!');
      timers.push(
        window.setTimeout(() => setSnack((s) => ({ ...s, reacting: 'guest' })), SNACK_REACT_MS),
        window.setTimeout(() => setSnack((s) => ({ ...s, reacting: null })), SNACK_REACT_MS * 2),
        window.setTimeout(() => setSnack({ foodGone: false, reacting: null }), SNACK_REFILL_MS)
      );
    };
    window.addEventListener(CAT_SNACK_EVENT, onSnack);
    return () => {
      window.removeEventListener(CAT_SNACK_EVENT, onSnack);
      clearTimers();
    };
  }, []);

  useEffect(
    () => () => {
      if (pokeTimerRef.current !== null) window.clearTimeout(pokeTimerRef.current);
      if (guestPokeTimerRef.current !== null) window.clearTimeout(guestPokeTimerRef.current);
    },
    []
  );

  /* ---------------- Drag handles ---------------- */

  const miniHandlers = useDragHandle({
    origin: () => stateRef.current,
    grab: (offsetX, offsetY) => {
      const current = stateRef.current;
      if (current) commit(startCompanionDrag(current, offsetX, offsetY));
    },
    move: (clientX, clientY, dtMs) => {
      const current = stateRef.current;
      const vp = viewportRef.current;
      if (current && vp) commit(moveCompanionDrag(current, clientX, clientY, dtMs, vp));
    },
    nudge: (dx, dy) => {
      const current = stateRef.current;
      const vp = viewportRef.current;
      if (current && vp) commit(nudgeCompanion(current, dx, dy, vp));
    },
    release: () => {
      const current = stateRef.current;
      const vp = viewportRef.current;
      if (current && vp) commit(endCompanionDrag(current, vp));
    },
    isHeld: () => stateRef.current?.phase.kind === 'dragging',
    tap: () => {
      const current = stateRef.current;
      if (!current) return;
      const lines = POKE_LINES[current.step];
      setPokeLine(lines[pokeCountRef.current % lines.length]);
      pokeCountRef.current += 1;
      if (pokeTimerRef.current !== null) window.clearTimeout(pokeTimerRef.current);
      pokeTimerRef.current = window.setTimeout(() => setPokeLine(null), POKE_SHOW_MS);
    },
  });

  const guestHandlers = useDragHandle({
    origin: () => guestRef.current,
    grab: (offsetX, offsetY) => {
      const current = guestRef.current;
      if (current) commitGuest(grabGuest(current, offsetX, offsetY));
    },
    move: (clientX, clientY, dtMs) => {
      const current = guestRef.current;
      const vp = viewportRef.current;
      if (current && vp) commitGuest(moveGuest(current, clientX, clientY, dtMs, vp));
    },
    nudge: (dx, dy) => {
      const current = guestRef.current;
      const vp = viewportRef.current;
      if (current && vp) commitGuest(nudgeGuest(current, dx, dy, vp));
    },
    release: () => {
      const current = guestRef.current;
      const vp = viewportRef.current;
      if (current && vp) commitGuest(releaseGuest(current, vp));
    },
    isHeld: () => guestRef.current?.phase.kind === 'held',
    tap: () => {
      setGuestPokeLine(GUEST_POKE_LINES[guestPokeCountRef.current % GUEST_POKE_LINES.length]);
      guestPokeCountRef.current += 1;
      if (guestPokeTimerRef.current !== null) window.clearTimeout(guestPokeTimerRef.current);
      guestPokeTimerRef.current = window.setTimeout(() => setGuestPokeLine(null), POKE_SHOW_MS);
    },
  });

  if (!state || !viewport) {
    return null;
  }

  /* ---------------- Render ---------------- */

  const expression = deriveMiniExpression(state.phase);
  const pose = derivePose(state.phase);
  const tilt =
    state.phase.kind === 'dragging' ? Math.max(-16, Math.min(16, state.phase.vx / 45)) : 0;
  const zone = describeHorizontalZone(state.x, viewport.width);

  const chatIndex = dinnerChatIndex(state.phase);
  const chat = chatIndex >= 0 ? DINNER_CHAT[chatIndex] : null;

  const guestAway = state.step === 'thank-you' && !!guest && guest.phase.kind !== 'seated';
  const resolvedGuestName = guestName?.trim() || 'Guest';

  let miniBubble: string | null = pokeLine;
  if (!miniBubble) {
    if (state.phase.kind === 'dragging') miniBubble = 'Whoa! Put me down! 😳';
    else if (state.phase.kind === 'falling') miniBubble = 'Aaah!';
    else if (state.phase.kind === 'landed') miniBubble = 'Oof… I’m okay';
    else if (guestAway && guest?.phase.kind === 'held') miniBubble = 'Hey, careful with her! 😂';
    else if (guestAway) miniBubble = 'Come back, the food’s getting cold! 🥢';
    else if (state.phase.kind === 'walking-to-table') miniBubble = 'Phew, dinner’s on! 😮‍💨';
    else if (chat?.speaker === 'mini') miniBubble = chat.line;
    else if (state.phase.kind === 'roaming-anxious' && state.step !== 'thank-you') miniBubble = ambientLine;
  }
  let guestBubble: string | null = guestPokeLine;
  if (!guestBubble && guestAway && guest) {
    if (guest.phase.kind === 'held') guestBubble = 'Eek! Put me down! 😳';
    else if (guest.phase.kind === 'falling') guestBubble = 'Whoaaa!';
    else if (guest.phase.kind === 'landed') guestBubble = 'Oof! I’m okay 😅';
    else guestBubble = 'Coming back to my seat!';
  } else if (!guestBubble && !pokeLine) {
    if (state.phase.kind === 'walking-to-table') guestBubble = 'Nice to meet you! 😊';
    else if (chat?.speaker === 'guest') guestBubble = chat.line;
  }
  if (jolt && state.step === 'thank-you') {
    miniBubble = 'WAAH?! 😱';
    guestBubble = 'Eek!! 😳';
  } else if (snack.reacting && state.step === 'thank-you') {
    miniBubble = snack.reacting === 'mini' ? 'Hey! My food! 😱' : null;
    guestBubble = snack.reacting === 'guest' ? 'Hahaha, the cat! 🐱' : null;
  }

  const bubbleAlign: BubbleAlign =
    zone === 'left side' ? 'left' : zone === 'right side' ? 'right' : 'center';

  // On phones the region map and cards sit right above Mini, so his bubble goes
  // beside him (on the roomier side) instead of on top of them.
  let miniBubbleSide: BubbleSide | undefined;
  if (viewport.width < COMPACT_MAX_WIDTH && state.step !== 'thank-you') {
    const rightRoom = viewport.width - (state.x + MINI_WIDTH - SIDE_BUBBLE_OVERLAP) - 8;
    const leftRoom = state.x + SIDE_BUBBLE_OVERLAP - 8;
    miniBubbleSide = {
      dir: rightRoom >= leftRoom ? 'right' : 'left',
      inset: MINI_WIDTH - SIDE_BUBBLE_OVERLAP,
      maxWidth: Math.max(110, Math.min(180, Math.max(rightRoom, leftRoom))),
    };
  }

  return (
    <div className="mini-stage fixed inset-0 z-40 pointer-events-none">
      {state.step === 'thank-you' && (
        <BistroTableScene
          viewport={viewport}
          guestName={resolvedGuestName}
          guestBubble={guestAway ? null : guestBubble}
          guestSeated={!guestAway}
          foodGone={snack.foodGone}
          jolt={jolt}
        />
      )}

      {state.step === 'thank-you' && guest && (
        <button
          type="button"
          aria-label={`${resolvedGuestName}, your dinner guest. Drag her anywhere, or use the arrow keys to move her.`}
          aria-describedby="mini-companion-help"
          className={`mini-drag-handle pointer-events-auto absolute left-0 top-0 rounded-2xl bg-transparent p-0 border-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-pink-300 ${
            guest.phase.kind === 'held' ? 'dragging' : ''
          }`}
          style={{
            width: MINI_WIDTH,
            height: MINI_HEIGHT,
            transform: `translate3d(${guest.x}px, ${guest.y}px, 0)`,
          }}
          data-guest-phase={guest.phase.kind}
          {...guestHandlers}
        >
          {guestAway && guestBubble && (
            <ChatBubble
              key={guestBubble}
              name={resolvedGuestName}
              text={guestBubble}
              accent="#f472b6"
              align={
                describeHorizontalZone(guest.x, viewport.width) === 'left side'
                  ? 'left'
                  : describeHorizontalZone(guest.x, viewport.width) === 'right side'
                    ? 'right'
                    : 'center'
              }
              tailOffset={MINI_WIDTH / 2}
            />
          )}
          {guestAway && (
            <span
              className="block h-full w-full"
              style={{
                transform: `rotate(${guest.phase.kind === 'held' ? Math.max(-16, Math.min(16, guest.phase.vx / 45)) : 0}deg)`,
                transformOrigin: '50% 12%',
                transition: 'transform 120ms ease-out',
              }}
            >
              <span
                key={guestLandingKey}
                className={`block h-full w-full ${guest.phase.kind === 'landed' ? 'animate-mini-land' : ''}`}
              >
                <svg
                  viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`}
                  width={MINI_WIDTH}
                  height={MINI_HEIGHT}
                  aria-hidden="true"
                  className="block overflow-visible"
                >
                  {(guest.phase.kind === 'landed' || guest.phase.kind === 'returning') && (
                    <ellipse cx="38" cy="90" rx="17" ry="2.6" fill="rgba(0,0,0,0.4)" />
                  )}
                  <g transform={guest.facing === 'left' ? `translate(${SPRITE_W} 0) scale(-1 1)` : undefined}>
                    <GuestSprite pose={guestPose(guest.phase)} />
                  </g>
                </svg>
              </span>
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        aria-label="Mini Zi Ren. Drag him anywhere, or use the arrow keys to move him."
        aria-describedby="mini-companion-help"
        className={`mini-drag-handle pointer-events-auto absolute left-0 top-0 rounded-2xl bg-transparent p-0 border-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
          state.phase.kind === 'dragging' ? 'dragging' : ''
        }`}
        style={{
          width: MINI_WIDTH,
          height: MINI_HEIGHT,
          transform: `translate3d(${state.x}px, ${state.y}px, 0)`,
        }}
        data-phase={state.phase.kind}
        data-expression={expression}
        data-nervous={isAnxious(expression) ? NERVOUS_FACES[nervousIndex % NERVOUS_FACES.length] : undefined}
        {...miniHandlers}
      >
        {miniBubble && (
          <ChatBubble
            key={miniBubble}
            name="Zi Ren"
            text={miniBubble}
            accent="#22d3ee"
            align={bubbleAlign}
            tailOffset={MINI_WIDTH / 2}
            side={miniBubbleSide}
          />
        )}
        <span
          className="block h-full w-full"
          style={{
            transform: `rotate(${tilt}deg)`,
            transformOrigin: '50% 12%',
            transition: 'transform 120ms ease-out',
          }}
        >
          <span
            key={landingKey}
            className={`block h-full w-full ${pose === 'land' ? 'animate-mini-land' : ''} ${jolt ? 'animate-scene-jolt' : ''}`}
          >
            <MiniSprite
              expression={expression}
              pose={pose}
              facing={state.facing}
              nervous={NERVOUS_FACES[nervousIndex % NERVOUS_FACES.length]}
            />
          </span>
        </span>
      </button>

      <p id="mini-companion-help" className="visually-hidden">
        Press Enter, Space, or Escape to let go, or wait a moment and they drop back to the floor.
      </p>
      <p className="visually-hidden" aria-live="polite" role="status">
        {announcement}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat bubble                                                         */
/* ------------------------------------------------------------------ */

type BubbleAlign = 'left' | 'center' | 'right';

/** Puts the bubble beside the speaker's head instead of above them. */
interface BubbleSide {
  readonly dir: 'left' | 'right';
  /** Distance (px) from the parent's near edge to the bubble's near edge. */
  readonly inset: number;
  readonly maxWidth: number;
}

/**
 * A chat-message style speech bubble: speaker name header, wrapped message,
 * and a tail pointing at whoever is speaking (down, or sideways with `side`).
 */
function ChatBubble({
  name,
  text,
  accent,
  align,
  tailOffset,
  bottom,
  side,
}: {
  readonly name: string;
  readonly text: string;
  readonly accent: string;
  readonly align: BubbleAlign;
  /** Distance (px) from the aligned edge to the speaker's head; ignored when centered. */
  readonly tailOffset: number;
  /** Explicit bottom offset (px); defaults to sitting just above the parent. */
  readonly bottom?: number;
  readonly side?: BubbleSide;
}) {
  const horizontal = side
    ? ''
    : align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';
  const placement = side ? '' : bottom === undefined ? 'bottom-full mb-3' : '';
  const outerStyle: React.CSSProperties | undefined = side
    ? { top: 0, maxWidth: side.maxWidth, [side.dir === 'right' ? 'left' : 'right']: side.inset }
    : bottom === undefined
      ? undefined
      : { bottom };
  const tailClass = side
    ? side.dir === 'right'
      ? 'top-4 -left-[9px] border-b-2 border-l-2'
      : 'top-4 -right-[9px] border-t-2 border-r-2'
    : '-bottom-[9px] border-b-2 border-r-2';
  const tailStyle: React.CSSProperties = side
    ? {}
    : align === 'left'
      ? { left: tailOffset - 7 }
      : align === 'right'
        ? { right: tailOffset - 7 }
        : { left: 'calc(50% - 7px)' };

  return (
    <span
      aria-hidden="true"
      className={`mini-bubble pointer-events-none absolute ${placement} ${horizontal} block w-max max-w-[220px] text-left`}
      style={outerStyle}
    >
      <span
        className="relative block rounded-2xl border-2 bg-white px-3 pb-2 pt-1.5"
        style={{ borderColor: accent, boxShadow: `0 8px 22px ${accent}55, 0 2px 0 ${accent}` }}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
          <span className="truncate">{name}</span>
        </span>
        <span className="mt-0.5 block whitespace-normal text-[12.5px] font-bold leading-snug text-[#231728]">
          {text}
        </span>
        <span
          className={`absolute ${tailClass} block h-3.5 w-3.5 rotate-45 bg-white`}
          style={{ ...tailStyle, borderColor: accent }}
        />
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Palette (anime cel-shaded, neon rim light)                          */
/* ------------------------------------------------------------------ */

const SPRITE_W = 76;
const SPRITE_H = 92;

const INK = '#1a1124';
const NEON_CYAN = '#4fe6f2';
const NEON_PURPLE = '#b57bff';

const SKIN = '#e9b896';
const SKIN_SHADE = '#c48a7c';
const HAIR = '#15111d';
const HAIR_SHINE = '#5b4c86';
const SHIRT = '#14111b';
const STRAP = '#2f2842';
const PANTS = '#231e30';
const SHOE = '#16131d';
const SOLE = '#f8fafc';
const SILVER = '#e2e6ee';
const SILVER_DARK = '#8d93a3';
const IRIS = '#2b1d33';
const IRIS_LIGHT = '#7c6aa6';
const MOUTH = '#6b2a2a';
const BLUSH = '#f472b6';

/** Mini's V-line face: defined cheekbones tapering to a neat chin. */
const MINI_FACE =
  'M21 21.5 C21 12.5 28.5 8 38 8 C47.5 8 55 12.5 55 21.5 L55 29.5 C55 34.5 54 38 51.6 41.2 C48.4 45.4 43.6 49 39.4 49.8 Q38 50.1 36.6 49.8 C32.4 49 27.6 45.4 24.4 41.2 C22 38 21 34.5 21 29.5 Z';
/** The guest's soft heart-shaped face. */
const GUEST_FACE =
  'M19.5 23.5 C19.5 13 28 8 38 8 C48 8 56.5 13 56.5 23.5 C56.5 33.5 54.2 39.6 50.6 43.6 C47 47.4 42.6 49.8 38 49.8 C33.4 49.8 29 47.4 25.4 43.6 C21.8 39.6 19.5 33.5 19.5 23.5 Z';
const EYE_L = 30.6;
const EYE_R = 45.4;
const EYE_Y = 30;

/* ------------------------------------------------------------------ */
/* Mini sprite                                                         */
/* ------------------------------------------------------------------ */

type MiniPose = 'walk' | 'peek' | 'watch' | 'fidget' | 'dangle' | 'fall' | 'land' | 'seated';

/** Nervous faces Mini cycles through on steps 1 to 3. */
type NervousFace = 'worried' | 'glance-away' | 'lip-bite' | 'nervous-laugh';
const NERVOUS_FACES: readonly NervousFace[] = ['worried', 'glance-away', 'lip-bite', 'nervous-laugh'];
const NERVOUS_FACE_MS = 1700;

function derivePose(phase: CompanionPhase): MiniPose {
  switch (phase.kind) {
    case 'roaming-anxious':
      switch (phase.action) {
        case 'pacing':
          return 'walk';
        case 'peeking':
          return 'peek';
        case 'checking-watch':
          return 'watch';
        case 'fidgeting':
          return 'fidget';
        default: {
          const _exhaustive: never = phase.action;
          return _exhaustive;
        }
      }
    case 'dragging':
      return 'dangle';
    case 'falling':
      return 'fall';
    case 'landed':
      return 'land';
    case 'walking-to-table':
      return 'walk';
    case 'seated-eating':
      return 'seated';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

interface MiniSpriteProps {
  readonly expression: MiniExpression;
  readonly pose: MiniPose;
  readonly facing: 'left' | 'right';
  readonly nervous: NervousFace;
}

function MiniSprite({ expression, pose, facing, nervous }: MiniSpriteProps) {
  const seated = pose === 'seated';
  const isMoving = pose === 'walk';
  const anxious = isAnxious(expression);
  const headTilt = pose === 'peek' ? -6 : pose === 'watch' || pose === 'fidget' ? 5 : 0;
  // Standing still while nervous: he trembles.
  const bodyClass = isMoving ? 'animate-mini-bob' : anxious ? 'animate-mini-tremble' : undefined;

  return (
    <svg
      viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`}
      width={MINI_WIDTH}
      height={MINI_HEIGHT}
      aria-hidden="true"
      className="block overflow-visible"
    >
      {!seated && pose !== 'dangle' && pose !== 'fall' && (
        <ellipse cx="38" cy="90" rx="17" ry="2.6" fill="rgba(0,0,0,0.4)" />
      )}

      <g transform={facing === 'left' ? `translate(${SPRITE_W} 0) scale(-1 1)` : undefined}>
        <g className={bodyClass}>
          {seated ? <SeatedLegs pants={PANTS} shoe={SHOE} sole={SOLE} /> : <StandingLegs pose={pose} />}

          <g transform={seated ? 'translate(0 3)' : undefined}>
            {/* Backpack behind the torso */}
            <rect x="19" y="55" width="38" height="20" rx="6" fill="#262033" stroke={INK} strokeWidth="0.8" />
            {/* Black crew-neck tee */}
            <path
              d="M22.5 58 Q23 53.5 29.5 52.5 L46.5 52.5 Q53 53.5 53.5 58 L54.5 74.5 Q54.5 77 52 77 L24 77 Q21.5 77 21.5 74.5 Z"
              fill={SHIRT}
              stroke={INK}
              strokeWidth="0.9"
            />
            <path d="M23.2 59 Q23.6 54.4 29.5 53.4" fill="none" stroke={NEON_PURPLE} strokeWidth="0.9" strokeLinecap="round" />
            <path d="M52.8 59 Q52.4 54.4 46.5 53.4" fill="none" stroke={NEON_CYAN} strokeWidth="0.9" strokeLinecap="round" />
            {/* Neck */}
            <path d="M34 44 L42 44 L42 54 Q38 55.4 34 54 Z" fill={SKIN_SHADE} stroke={INK} strokeWidth="0.8" />
            <path d="M32.4 52.6 Q38 57 43.6 52.6" fill="none" stroke="#2c2736" strokeWidth="1.4" />
            {/* Silver chain */}
            <path
              d="M32.2 53 Q38 59.6 43.8 53"
              fill="none"
              stroke={SILVER}
              strokeWidth="1"
              strokeDasharray="1.4 0.7"
            />
            <circle cx="38" cy="56.6" r="0.7" fill="#ffffff" />
            {/* Backpack straps */}
            <path d="M27 53.5 L28.8 76.5" stroke={STRAP} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M49 53.5 L47.2 76.5" stroke={STRAP} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M26 54 L27.6 76" stroke="#4d4470" strokeWidth="0.6" strokeLinecap="round" />
            <rect x="26.6" y="65" width="3.4" height="2.4" rx="0.6" fill={SILVER} />
            <rect x="46" y="65" width="3.4" height="2.4" rx="0.6" fill={SILVER} />

            <Arms pose={pose} nervous={nervous} />

            <g transform={headTilt ? `rotate(${headTilt} 38 48)` : undefined}>
              <MiniHead
                expression={expression}
                pose={pose}
                nervous={nervous}
                hairSway={isMoving || pose === 'dangle' || pose === 'fall'}
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function Sneaker({ cx, shoe = SHOE, sole = SOLE }: { readonly cx: number; readonly shoe?: string; readonly sole?: string }) {
  return (
    <>
      <path
        d={`M${cx - 6} 88.6 Q${cx - 6.4} 84 ${cx - 1.5} 84 Q${cx + 4} 84 ${cx + 6.4} 87.6 L${cx + 6.4} 88.6 Z`}
        fill={shoe}
        stroke={INK}
        strokeWidth="0.7"
      />
      <rect x={cx - 6.4} y="88.2" width="13.2" height="2.2" rx="1.1" fill={sole} stroke={INK} strokeWidth="0.5" />
      <path d={`M${cx - 3} 86.6 L${cx + 3} 86`} stroke={sole} strokeWidth="0.7" strokeLinecap="round" />
    </>
  );
}

function StandingLegs({
  pose,
  pants = PANTS,
  shoe = SHOE,
  sole = SOLE,
}: {
  readonly pose: MiniPose;
  readonly pants?: string;
  readonly shoe?: string;
  readonly sole?: string;
}) {
  const kicking = pose === 'dangle';
  const walking = pose === 'walk';
  const legA = kicking ? 'animate-mini-kick-a' : walking ? 'animate-mini-walk-leg-a' : undefined;
  const legB = kicking ? 'animate-mini-kick-b' : walking ? 'animate-mini-walk-leg-b' : undefined;
  const together = pose === 'fall';
  const leftX = together ? 30.5 : 29;
  const rightX = together ? 37.5 : 39;
  return (
    <>
      <g className={legA}>
        <rect x={leftX} y="72" width="8" height="13.5" rx="3" fill={pants} stroke={INK} strokeWidth="0.8" />
        <Sneaker cx={leftX + 5} shoe={shoe} sole={sole} />
      </g>
      <g className={legB}>
        <rect x={rightX} y="72" width="8" height="13.5" rx="3" fill={pants} stroke={INK} strokeWidth="0.8" />
        <Sneaker cx={rightX + 5} shoe={shoe} sole={sole} />
      </g>
    </>
  );
}

function SeatedLegs({ pants, shoe, sole }: { readonly pants: string; readonly shoe: string; readonly sole: string }) {
  return (
    <g>
      <rect x="25" y="71" width="31" height="8.4" rx="3.6" fill={pants} stroke={INK} strokeWidth="0.8" />
      <rect x="48.6" y="73" width="8" height="13.4" rx="3" fill={pants} stroke={INK} strokeWidth="0.8" />
      <path d="M50 88.6 Q49.6 84.6 54 84.4 Q59.6 84.4 62.2 87.8 L62.2 88.6 Z" fill={shoe} stroke={INK} strokeWidth="0.7" />
      <rect x="49.6" y="88.2" width="12.8" height="2.2" rx="1.1" fill={sole} stroke={INK} strokeWidth="0.5" />
    </g>
  );
}

function Limb({
  shoulder,
  elbow,
  hand,
  sleeve = SHIRT,
  skin = SKIN,
}: {
  readonly shoulder: readonly [number, number];
  readonly elbow: readonly [number, number];
  readonly hand: readonly [number, number];
  readonly sleeve?: string;
  readonly skin?: string;
}) {
  const upper = `M${shoulder[0]} ${shoulder[1]} L${elbow[0]} ${elbow[1]}`;
  const lower = `M${elbow[0]} ${elbow[1]} L${hand[0]} ${hand[1]}`;
  return (
    <>
      <path d={lower} stroke={INK} strokeWidth="5.8" strokeLinecap="round" />
      <path d={lower} stroke={skin} strokeWidth="4.2" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r="3.1" fill={INK} />
      <circle cx={hand[0]} cy={hand[1]} r="2.4" fill={skin} />
      <path d={upper} stroke={INK} strokeWidth="7.4" strokeLinecap="round" />
      <path d={upper} stroke={sleeve} strokeWidth="5.8" strokeLinecap="round" />
    </>
  );
}

function Arms({ pose, nervous }: { readonly pose: MiniPose; readonly nervous: NervousFace }) {
  switch (pose) {
    case 'fidget':
      // Nail biting for the tense faces, hand wringing for the rest.
      return nervous === 'lip-bite' ? (
        <>
          <Limb shoulder={[24, 56]} elbow={[23, 65]} hand={[34, 66]} />
          <g className="animate-mini-nail-bite">
            <Limb shoulder={[52, 56]} elbow={[52, 61]} hand={[40.5, 44.6]} />
          </g>
        </>
      ) : (
        <g className="animate-mini-wring">
          <Limb shoulder={[24, 56]} elbow={[25, 64]} hand={[36, 63.4]} />
          <Limb shoulder={[52, 56]} elbow={[51, 64]} hand={[40, 63.4]} />
        </g>
      );
    case 'dangle':
      return (
        <>
          <g className="animate-mini-flail-left">
            <Limb shoulder={[24, 56]} elbow={[17, 50]} hand={[14, 42]} />
          </g>
          <g className="animate-mini-flail-right">
            <Limb shoulder={[52, 56]} elbow={[59, 50]} hand={[62, 42]} />
          </g>
        </>
      );
    case 'fall':
      return (
        <>
          <Limb shoulder={[24, 56]} elbow={[18, 48]} hand={[16, 40]} />
          <Limb shoulder={[52, 56]} elbow={[58, 48]} hand={[60, 40]} />
        </>
      );
    case 'watch':
      return (
        <>
          <Limb shoulder={[24, 56]} elbow={[20, 63]} hand={[19, 71]} />
          <Limb shoulder={[52, 56]} elbow={[55, 63]} hand={[45, 61]} />
          <rect x="47" y="59.4" width="3.8" height="4.2" rx="1" fill={SILVER} stroke={SILVER_DARK} strokeWidth="0.5" />
          <circle cx="48.9" cy="61.5" r="1.1" fill="#0f172a" />
          <circle cx="48.9" cy="61.5" r="0.4" fill={NEON_CYAN} />
        </>
      );
    case 'seated':
      return (
        <>
          <Limb shoulder={[25, 57]} elbow={[29, 65]} hand={[37, 67]} />
          <g className="animate-mini-bite">
            <Limb shoulder={[51, 57]} elbow={[57, 64]} hand={[66, 62]} />
            <path d="M65 61.5 L75 65.5" stroke="#c08a4a" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M65.5 60 L75.5 63.5" stroke="#c08a4a" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        </>
      );
    default:
      return (
        <>
          <Limb shoulder={[24, 56]} elbow={[20, 63]} hand={[19, 71]} />
          <Limb shoulder={[52, 56]} elbow={[56, 63]} hand={[57, 71]} />
        </>
      );
  }
}

function isAnxious(expression: MiniExpression): boolean {
  return expression === 'anxious-walk' || expression === 'anxious-peek' || expression === 'anxious-fidget';
}

function MiniHead({
  expression,
  pose,
  nervous,
  hairSway,
}: {
  readonly expression: MiniExpression;
  readonly pose: MiniPose;
  readonly nervous: NervousFace;
  readonly hairSway: boolean;
}) {
  const anxious = isAnxious(expression);
  const happy = expression === 'happy-walk' || expression === 'casual-eating';

  return (
    <>
      {/* Back hair: volume on top, short tapered sides */}
      <path
        d="M18.5 30 C16 13 25.5 2.6 38.5 2.6 C51.5 2.6 60.5 12.5 57.5 30 L56 34 L55 22 L21 22 L20 34 Z"
        fill={HAIR}
        stroke={INK}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Ears + white earbuds */}
      <ellipse cx="20.6" cy="31" rx="2.6" ry="3.9" fill={SKIN} stroke={INK} strokeWidth="0.85" />
      <ellipse cx="55.4" cy="31" rx="2.6" ry="3.9" fill={SKIN} stroke={INK} strokeWidth="0.85" />
      <ellipse cx="20.2" cy="32.4" rx="1.7" ry="2.1" fill="#ffffff" stroke={INK} strokeWidth="0.55" />
      <path d="M20.2 34.3 L20.2 37.6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M20.2 34.3 L20.2 37.6" stroke="#ffffff" strokeWidth="1.15" strokeLinecap="round" />
      <ellipse cx="55.8" cy="32.4" rx="1.7" ry="2.1" fill="#ffffff" stroke={INK} strokeWidth="0.55" />
      <path d="M55.8 34.3 L55.8 37.6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M55.8 34.3 L55.8 37.6" stroke="#ffffff" strokeWidth="1.15" strokeLinecap="round" />

      {/* V-line face: defined cheekbones tapering to a neat chin */}
      <path d={MINI_FACE} fill={SKIN} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M21 21 L55 21 L55 26.5 Q38 22.4 21 26.5 Z" fill={SKIN_SHADE} opacity="0.5" />
      <path
        d="M24.4 41.2 C27.6 45.4 32.4 49 36.6 49.8 Q38 50.1 39.4 49.8 C43.6 49 48.4 45.4 51.6 41.2 C47.6 44.6 43 46.6 38 46.8 C33 46.6 28.4 44.6 24.4 41.2 Z"
        fill={SKIN_SHADE}
        opacity="0.45"
      />
      <path d="M22.8 35 Q23.8 38.6 26.6 41.2" fill="none" stroke={SKIN_SHADE} strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
      <path d="M53.2 35 Q52.2 38.6 49.4 41.2" fill="none" stroke={SKIN_SHADE} strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
      <FaceRimLight
        face={MINI_FACE}
        rightPath="M55 24 L55 29.5 C55 34.5 54 38 51.6 41.2 C48.4 45.4 43.6 49 40.6 49.6"
        leftPath="M35.4 49.6 C32.4 49 27.6 45.4 24.4 41.2 C22 38 21 34.5 21 29.5 L21 24"
        right={NEON_CYAN}
        left={NEON_PURPLE}
      />


      {anxious ? <NervousEyes face={nervous} pose={pose} /> : <MiniEyes expression={expression} pose={pose} />}

      {/* Slim round silver glasses */}
      <g fill="rgba(200,230,255,0.1)">
        <circle cx={EYE_L} cy={EYE_Y} r="6.3" stroke={SILVER_DARK} strokeWidth="1.7" />
        <circle cx={EYE_R} cy={EYE_Y} r="6.3" stroke={SILVER_DARK} strokeWidth="1.7" />
        <circle cx={EYE_L} cy={EYE_Y} r="6.3" stroke={SILVER} strokeWidth="0.9" fill="none" />
        <circle cx={EYE_R} cy={EYE_Y} r="6.3" stroke={SILVER} strokeWidth="0.9" fill="none" />
      </g>
      <path d="M36.9 29.2 Q38 28 39.1 29.2" fill="none" stroke={SILVER} strokeWidth="1" />
      <path d="M24.3 29.4 L21 29" stroke={SILVER} strokeWidth="0.9" />
      <path d="M51.7 29.4 L55 29" stroke={SILVER} strokeWidth="0.9" />
      <path d="M25.8 27 L28.2 24.8 L29 25.4 L26.6 28 Z" fill="#ffffff" opacity="0.7" />
      <path d="M40.6 27 L43 24.8 L43.8 25.4 L41.4 28 Z" fill="#ffffff" opacity="0.7" />
      <path d="M35.6 31 Q35.2 33.6 33 35" fill="none" stroke={NEON_CYAN} strokeWidth="0.65" opacity="0.7" />
      <path d="M50.4 31 Q50 33.6 47.8 35" fill="none" stroke={NEON_CYAN} strokeWidth="0.65" opacity="0.7" />

      {/* Textured side-swept fringe with a little ahoge */}
      <g className={hairSway ? 'animate-mini-hair' : undefined}>
        <path
          d="M19.4 29 C17.6 14 27 4.2 39 4.2 C50.6 4.2 58.6 12 57.4 25.5 L56 30 L55 22.4 C53.4 19.8 51 18.2 48 17.6 L48.8 22 L44.6 17.4 C41.6 18.4 38.6 20.4 35.8 23 L36.4 19 L32 22.6 L32.4 18.8 C28.6 20.2 24.8 23 22.2 26.8 L21 31 Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <path d="M41 4.6 Q44.6 0.2 48.6 1 Q45 2.2 43.6 5.4 Z" fill={HAIR} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      </g>
      <g fill="none" stroke={HAIR_SHINE} strokeLinecap="round" opacity="0.8">
        <path d="M27 11.4 Q31 8 36 7.6" strokeWidth="1.3" />
        <path d="M30.6 15.2 Q35 12 40.6 11.6" strokeWidth="1" />
        <path d="M43 8 Q47.6 8.4 51.2 11.6" strokeWidth="1.3" />
      </g>

      {anxious ? <NervousBrows face={nervous} /> : <MiniBrows expression={expression} />}

      {/* Nose */}
      <path d="M38.6 34.4 L37.8 37.2 L39 37.4" fill="none" stroke={SKIN_SHADE} strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" />

      {(happy || (anxious && nervous === 'nervous-laugh')) && <Blush left={25.6} right={50.4} y={37.4} />}

      {anxious ? <NervousMouth face={nervous} /> : <MiniMouth expression={expression} />}

      {anxious && <NervousEffects face={nervous} />}

      {expression === 'dizzy-land' && (
        <g className="animate-mini-dizzy" fill="#fde047" stroke={INK} strokeWidth="0.4">
          <path d="M24 0 l1.1 2.3 2.4 .3 -1.8 1.6 .5 2.4 -2.2 -1.2 -2.2 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z" />
          <path d="M51 -1 l1.1 2.3 2.4 .3 -1.8 1.6 .5 2.4 -2.2 -1.2 -2.2 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z" />
        </g>
      )}
    </>
  );
}

/** Neon rim light that hugs the inside of the jawline, clipped to the face. */
function FaceRimLight({
  face,
  rightPath,
  leftPath,
  right,
  left,
}: {
  readonly face: string;
  readonly rightPath: string;
  readonly leftPath?: string;
  readonly right: string;
  readonly left?: string;
}) {
  const clipId = `face-rim-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={face} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} fill="none" strokeWidth="2.6" strokeLinecap="round">
        <path d={rightPath} stroke={right} opacity="0.85" />
        {left && leftPath && <path d={leftPath} stroke={left} opacity="0.7" />}
      </g>
    </g>
  );
}

/** Short broken highlight strokes across the crown, anime "angel ring" style. */
function HairShine({ color }: { readonly color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M22.6 14.6 Q24.4 12 27 10.6" />
      <path d="M29.6 9.6 L33.6 8.8" />
      <path d="M42.4 8.8 L46.4 9.6" />
      <path d="M49 10.6 Q51.6 12 53.4 14.6" />
    </g>
  );
}

function Blush({ left, right, y }: { readonly left: number; readonly right: number; readonly y: number }) {
  return (
    <g>
      <ellipse cx={left} cy={y} rx="3" ry="1.5" fill={BLUSH} opacity="0.35" />
      <ellipse cx={right} cy={y} rx="3" ry="1.5" fill={BLUSH} opacity="0.35" />
      <g stroke={BLUSH} strokeWidth="0.55" strokeLinecap="round">
        {[-1.8, 0, 1.8].map((dx) => (
          <React.Fragment key={dx}>
            <path d={`M${left + dx - 0.6} ${y + 0.8} l1.2 -1.5`} />
            <path d={`M${right + dx - 0.6} ${y + 0.8} l1.2 -1.5`} />
          </React.Fragment>
        ))}
      </g>
    </g>
  );
}

function MiniBrows({ expression }: { readonly expression: MiniExpression }) {
  const common = { fill: 'none', stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round' as const };
  switch (expression) {
    case 'anxious-walk':
    case 'anxious-peek':
      return (
        <>
          <path d="M25.6 22 Q30 21.6 34.4 19.6" {...common} />
          <path d="M41.6 19.6 Q46 21.6 50.4 22" {...common} />
        </>
      );
    case 'surprised-drag':
      return (
        <>
          <path d="M25.4 20 Q30 17.4 34.4 19" {...common} />
          <path d="M41.6 19 Q46 17.4 50.6 20" {...common} />
        </>
      );
    case 'bracing-fall':
      return (
        <>
          <path d="M25.8 19.6 L34.2 21.8" {...common} />
          <path d="M41.8 21.8 L50.2 19.6" {...common} />
        </>
      );
    case 'dizzy-land':
      return (
        <>
          <path d="M25.8 20.6 L34.2 21.4" {...common} />
          <path d="M41.8 20.2 L50.2 22" {...common} />
        </>
      );
    default:
      return (
        <>
          <path d="M25.6 21.8 Q30 20.4 34.4 20.8" {...common} />
          <path d="M41.6 20.8 Q46 20.4 50.4 21.8" {...common} />
        </>
      );
  }
}

function MiniEyes({ expression, pose }: { readonly expression: MiniExpression; readonly pose: MiniPose }) {
  const line = {
    fill: 'none',
    stroke: INK,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (expression) {
    case 'surprised-drag':
    case 'bracing-fall':
      return (
        <>
          <path d="M27.6 27.6 L32.4 30 L27.6 32.4" {...line} />
          <path d="M48.4 27.6 L43.6 30 L48.4 32.4" {...line} />
        </>
      );
    case 'dizzy-land':
      return (
        <>
          {[EYE_L, EYE_R].map((cx) => (
            <path
              key={cx}
              d={`M${cx - 2.3} ${EYE_Y} a2.3 2.3 0 1 1 2.3 2.3 a1.3 1.3 0 1 1 -1.3 -1.4`}
              {...line}
              strokeWidth={1}
            />
          ))}
        </>
      );
    case 'happy-walk':
      return (
        <>
          {[EYE_L, EYE_R].map((cx) => (
            <path key={cx} d={`M${cx - 3.6} ${EYE_Y + 1.2} Q${cx} ${EYE_Y - 3.2} ${cx + 3.6} ${EYE_Y + 1.2}`} {...line} strokeWidth={1.8} />
          ))}
        </>
      );
    case 'casual-eating':
      return (
        <>
          {[EYE_L, EYE_R].map((cx) => (
            <path key={cx} d={`M${cx - 3.2} ${EYE_Y + 0.6} Q${cx} ${EYE_Y - 2.2} ${cx + 3.2} ${EYE_Y + 0.6}`} {...line} />
          ))}
        </>
      );
    default: {
      // Almond anime eyes: look ahead, up at the choices, or down at the watch.
      const dy = pose === 'peek' ? -1.4 : pose === 'watch' ? 1.3 : 0;
      const dx = pose === 'watch' ? 1 : 0.5;
      return (
        <g className="animate-blink">
          {[EYE_L, EYE_R].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx + dx} cy={EYE_Y + 0.8 + dy} rx="2.2" ry="2.7" fill={IRIS} />
              <ellipse cx={cx + dx} cy={EYE_Y + 1.9 + dy} rx="1.5" ry="1.3" fill={IRIS_LIGHT} opacity="0.85" />
              <circle cx={cx - 0.6 + dx} cy={EYE_Y - 0.1 + dy} r="0.9" fill="#ffffff" />
              <circle cx={cx + 0.8 + dx} cy={EYE_Y + 2.3 + dy} r="0.4" fill="#ffffff" />
              <path d={`M${cx - 3.8} ${EYE_Y - 1.2} Q${cx} ${EYE_Y - 3.8} ${cx + 3.8} ${EYE_Y - 1.8}`} {...line} />
              <path d={`M${cx - 1.8} ${EYE_Y + 4.2} L${cx + 2.2} ${EYE_Y + 4.2}`} stroke={SKIN_SHADE} strokeWidth="0.65" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    }
  }
}

function MiniMouth({ expression }: { readonly expression: MiniExpression }) {
  switch (expression) {
    case 'anxious-walk':
    case 'anxious-fidget':
      return (
        <path d="M35.2 42.2 q1 -0.8 2 0 t2 0 t2 0" fill="none" stroke={INK} strokeWidth="0.95" strokeLinecap="round" />
      );
    case 'anxious-peek':
      return <ellipse cx="38.2" cy="42.2" rx="1.2" ry="1.5" fill={MOUTH} stroke={INK} strokeWidth="0.55" />;
    case 'surprised-drag':
      return (
        <>
          <ellipse cx="38.2" cy="42.6" rx="2.2" ry="2.8" fill={MOUTH} stroke={INK} strokeWidth="0.65" />
          <ellipse cx="38.2" cy="44.2" rx="1.3" ry="0.8" fill="#f9a8d4" />
        </>
      );
    case 'bracing-fall':
      return (
        <>
          <rect x="34.4" y="41" width="7.6" height="2.8" rx="1.1" fill="#ffffff" stroke={INK} strokeWidth="0.85" />
          <path d="M34.6 42.4 L41.8 42.4" stroke={INK} strokeWidth="0.55" />
        </>
      );
    case 'dizzy-land':
      return (
        <path d="M35 42.8 q1.6 -1.4 3.2 0 t3.2 0" fill="none" stroke={INK} strokeWidth="0.95" strokeLinecap="round" />
      );
    case 'happy-walk':
      return (
        <>
          <path d="M34 40.6 Q38.2 46 42.4 40.6 Q38.2 41.8 34 40.6 Z" fill={MOUTH} stroke={INK} strokeWidth="0.75" />
          <path d="M34.8 41 Q38.2 42.2 41.6 41 L41.2 41.8 Q38.2 42.8 35.2 41.8 Z" fill="#ffffff" />
          <ellipse cx="38.2" cy="43.6" rx="1.4" ry="0.7" fill="#f9a8d4" />
        </>
      );
    case 'casual-eating':
      return <ellipse className="animate-mini-chew" cx="38.2" cy="42.2" rx="1.8" ry="1.2" fill={MOUTH} stroke={INK} strokeWidth="0.55" />;
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Nervous faces (steps 1 to 3)                                        */
/* ------------------------------------------------------------------ */

const NERVOUS_LINE = {
  fill: 'none',
  stroke: INK,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function NervousEyes({ face, pose }: { readonly face: NervousFace; readonly pose: MiniPose }) {
  const dy = pose === 'peek' ? -1.4 : pose === 'watch' || pose === 'fidget' ? 1.3 : 0;
  switch (face) {
    case 'glance-away':
      // Normal almond eyes sliding off to the side, avoiding eye contact.
      return (
        <g className="animate-blink">
          {[EYE_L, EYE_R].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx + 1.5} cy={EYE_Y + 1 + dy * 0.5} rx="2.1" ry="2.6" fill={IRIS} />
              <circle cx={cx + 0.9} cy={EYE_Y + 0.2 + dy * 0.5} r="0.8" fill="#ffffff" />
              <path d={`M${cx - 3.8} ${EYE_Y - 1.2} Q${cx} ${EYE_Y - 3.6} ${cx + 3.8} ${EYE_Y - 1.8}`} {...NERVOUS_LINE} />
            </g>
          ))}
        </g>
      );    case 'lip-bite':
      // Half-lidded, glancing down and away.
      return (
        <g>
          {[EYE_L, EYE_R].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx - 0.8} cy={EYE_Y + 1.6} rx="2.1" ry="2" fill={IRIS} />
              <circle cx={cx - 1.3} cy={EYE_Y + 1.1} r="0.6" fill="#ffffff" />
              <path d={`M${cx - 3.8} ${EYE_Y - 0.2} Q${cx} ${EYE_Y - 1.4} ${cx + 3.8} ${EYE_Y - 0.4}`} {...NERVOUS_LINE} strokeWidth={1.8} />
            </g>
          ))}
        </g>
      );
    case 'nervous-laugh':
      // Squeezed-shut "ahaha" eyes.
      return (
        <g>
          {[EYE_L, EYE_R].map((cx) => (
            <path key={cx} d={`M${cx - 3.4} ${EYE_Y + 1.4} Q${cx} ${EYE_Y - 2.4} ${cx + 3.4} ${EYE_Y + 1.4}`} {...NERVOUS_LINE} strokeWidth={1.8} />
          ))}
        </g>
      );
    default:
      return <MiniEyes expression="anxious-walk" pose={pose} />;
  }
}

function NervousBrows({ face }: { readonly face: NervousFace }) {
  const common = { fill: 'none', stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round' as const };
  const steep = face === 'nervous-laugh';
  return (
    <g>
      {steep ? (
        <>
          <path d="M25.4 22.8 Q30 22.4 34.4 18.4" {...common} />
          <path d="M41.6 18.4 Q46 22.4 50.6 22.8" {...common} />
        </>
      ) : (
        <>
          <path d="M25.6 22 Q30 21.6 34.4 19.6" {...common} />
          <path d="M41.6 19.6 Q46 21.6 50.4 22" {...common} />
        </>
      )}
    </g>
  );
}

function NervousMouth({ face }: { readonly face: NervousFace }) {
  switch (face) {
    case 'glance-away':
      // Awkward lopsided half-smile.
      return (
        <path d="M35.4 42.6 Q38.4 43.6 41.2 41.4" fill="none" stroke={INK} strokeWidth="0.95" strokeLinecap="round" />
      );
    case 'lip-bite':
      // Biting the lower lip.
      return (
        <g>
          <path d="M35.2 41.8 Q38.2 41.2 41.2 41.8" fill="none" stroke={INK} strokeWidth="0.95" strokeLinecap="round" />
          <rect x="37.3" y="41.4" width="1.8" height="1.4" rx="0.4" fill="#ffffff" stroke={INK} strokeWidth="0.45" />
        </g>
      );
    case 'nervous-laugh':
      return (
        <g>
          <path d="M34.4 40.8 Q38.2 45 42 40.8 Q38.2 41.8 34.4 40.8 Z" fill={MOUTH} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
          <path d="M35 41.1 Q38.2 42.1 41.4 41.1 L41 41.8 Q38.2 42.6 35.4 41.8 Z" fill="#ffffff" />
        </g>
      );
    default:
      return (
        <path d="M35.2 42.2 q1 -0.8 2 0 t2 0 t2 0" fill="none" stroke={INK} strokeWidth="0.95" strokeLinecap="round" />
      );
  }
}

/** Sweat drops and anime stress marks around his head. */
function NervousEffects({ face }: { readonly face: NervousFace }) {
  const extraSweat = face === 'worried' || face === 'nervous-laugh';
  const stressMarks = face === 'worried' || face === 'glance-away' || face === 'lip-bite';
  return (
    <g>
      <path
        className="animate-mini-sweat"
        d="M58.6 13 Q61.6 17.8 58.6 20 Q55.6 17.8 58.6 13 Z"
        fill="#a5f3fc"
        stroke={INK}
        strokeWidth="0.6"
      />
      {extraSweat && (
        <>
          <path
            className="animate-mini-sweat-delayed"
            d="M17.6 16 Q19.6 19.2 17.6 20.8 Q15.6 19.2 17.6 16 Z"
            fill="#a5f3fc"
            stroke={INK}
            strokeWidth="0.55"
          />
          <path
            className="animate-mini-sweat-delayed"
            d="M54.2 38.4 Q55.8 41 54.2 42.3 Q52.6 41 54.2 38.4 Z"
            fill="#a5f3fc"
            stroke={INK}
            strokeWidth="0.5"
          />
        </>
      )}
      {stressMarks && (
        <g className="animate-mini-stress" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" fill="none">
          <path d="M14.2 6.6 l-2.6 -2" />
          <path d="M13.4 10.4 l-3.4 -0.2" />
          <path d="M14.2 14 l-2.6 1.8" />
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 bistro table scene                                           */
/* ------------------------------------------------------------------ */

const SCENE_HEIGHT = 110;
const SEAT_TOP = SCENE_HEIGHT - 16;
const TABLE_TOP = SCENE_HEIGHT - 30;

function BistroTableScene({
  viewport,
  guestName,
  guestBubble,
  guestSeated,
  foodGone,
  jolt,
}: {
  readonly viewport: CompanionViewport;
  readonly guestName: string;
  readonly guestBubble: string | null;
  /** False while she's been picked up off her chair (she's drawn by her drag handle instead). */
  readonly guestSeated: boolean;
  /** True right after the cheer cat ate everything (easter egg). */
  readonly foodGone: boolean;
  /** True for a moment when the cat crash-lands behind the table. */
  readonly jolt: boolean;
}) {
  const { tableLeft, tableWidth } = computeTableLayout(viewport);
  // Scene is drawn in sprite units so the guest matches Mini's scale.
  const w = tableWidth / MINI_SPRITE_SCALE;
  const t0 = 50;
  const t1 = w - 50;
  const tableMid = (t0 + t1) / 2;
  const bottom = viewport.height - computeFloorSurface(viewport);

  return (
    <div
      {...{ [DINNER_TABLE_ATTR]: '' }}
      className={`absolute ${jolt ? 'animate-scene-jolt' : ''}`}
      style={{ left: tableLeft, bottom, width: tableWidth, height: SCENE_HEIGHT * MINI_SPRITE_SCALE }}
    >
      {guestBubble && (
        <ChatBubble
          key={guestBubble}
          name={guestName}
          text={guestBubble}
          accent="#f472b6"
          align="right"
          tailOffset={36 * MINI_SPRITE_SCALE}
          bottom={(SCENE_HEIGHT - 14) * MINI_SPRITE_SCALE}
        />
      )}
      <svg
        role="img"
        aria-label={`A casual bistro table for two with vegetarian bowls and iced drinks. ${guestName} sits on the right chair.`}
        viewBox={`0 0 ${w} ${SCENE_HEIGHT}`}
        width={tableWidth}
        height={SCENE_HEIGHT * MINI_SPRITE_SCALE}
        className="block overflow-visible"
      >
        <ellipse cx={w / 2} cy={SCENE_HEIGHT - 2} rx={w / 2} ry="4" fill="rgba(0,0,0,0.35)" />

        <Chair x0={8} x1={58} backX={8} />
        <Chair x0={w - 58} x1={w - 8} backX={w - 12} />

        {guestSeated && (
          <g transform={`translate(${w + 4} ${SCENE_HEIGHT - SPRITE_H}) scale(-1 1)`}>
            <GuestSprite />
          </g>
        )}

        <rect x={tableMid - 3} y={TABLE_TOP + 5} width="6" height={SCENE_HEIGHT - TABLE_TOP - 9} fill="#6b4226" stroke={INK} strokeWidth="0.6" />
        <ellipse cx={tableMid} cy={SCENE_HEIGHT - 4} rx="15" ry="3" fill="#6b4226" stroke={INK} strokeWidth="0.6" />
        <rect x={t0} y={TABLE_TOP} width={t1 - t0} height="6" rx="3" fill="#a86b3c" stroke={INK} strokeWidth="0.7" />
        <rect x={t0 + 2} y={TABLE_TOP + 0.6} width={t1 - t0 - 4} height="1.6" rx="0.8" fill="#d39a63" />

        <IcedDrink cx={t0 + 30} tint="#fcd34d" />
        <IcedDrink cx={t1 - 30} tint="#86efac" />

        <VeggieBowl cx={t0 + 14} empty={foodGone} />
        <VeggieBowl cx={t1 - 14} empty={foodGone} delayed />
      </svg>
    </div>
  );
}

function Chair({ x0, x1, backX }: { readonly x0: number; readonly x1: number; readonly backX: number }) {
  return (
    <g fill="#7c4a2a" stroke={INK} strokeWidth="0.6">
      <rect x={backX} y={SEAT_TOP - 36} width="4" height="40" rx="2" />
      <rect x={x0} y={SEAT_TOP} width={x1 - x0} height="4" rx="2" fill="#8d5733" />
      <rect x={x0 + 3} y={SEAT_TOP + 4} width="3" height={SCENE_HEIGHT - SEAT_TOP - 6} />
      <rect x={x1 - 6} y={SEAT_TOP + 4} width="3" height={SCENE_HEIGHT - SEAT_TOP - 6} />
    </g>
  );
}

function VeggieBowl({
  cx,
  delayed = false,
  empty = false,
}: {
  readonly cx: number;
  readonly delayed?: boolean;
  readonly empty?: boolean;
}) {
  const rim = TABLE_TOP - 9;
  if (empty) {
    return (
      <g>
        <ellipse cx={cx} cy={rim} rx="10" ry="2.6" fill="#e2e8f0" stroke={INK} strokeWidth="0.5" />
        <circle cx={cx - 3} cy={rim - 0.4} r="0.8" fill="#65a30d" />
        <circle cx={cx + 4} cy={rim + 0.2} r="0.7" fill="#fbbf24" />
        <path
          d={`M${cx - 11} ${rim} L${cx + 11} ${rim} Q${cx + 9} ${TABLE_TOP} ${cx} ${TABLE_TOP} Q${cx - 9} ${TABLE_TOP} ${cx - 11} ${rim} Z`}
          fill="#f8fafc"
          stroke={INK}
          strokeWidth="0.7"
        />
        <path d={`M${cx - 8} ${rim + 3.5} L${cx + 8} ${rim + 3.5}`} stroke="#fb7185" strokeWidth="1" />
      </g>
    );
  }
  return (
    <g>
      <g
        className={delayed ? 'animate-table-steam-delayed' : 'animate-table-steam'}
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <path d={`M${cx - 3} ${rim - 4} q-2 -3 0 -6 t0 -6`} />
        <path d={`M${cx + 3} ${rim - 3} q2 -3 0 -6 t0 -6`} />
      </g>
      <ellipse cx={cx} cy={rim} rx="10" ry="3" fill="#65a30d" stroke={INK} strokeWidth="0.5" />
      <circle cx={cx - 4} cy={rim - 1.2} r="1.6" fill="#fbbf24" />
      <circle cx={cx + 2} cy={rim - 1.6} r="1.4" fill="#f97316" />
      <circle cx={cx + 5.5} cy={rim - 0.6} r="1.2" fill="#fef3c7" />
      <path
        d={`M${cx - 11} ${rim} L${cx + 11} ${rim} Q${cx + 9} ${TABLE_TOP} ${cx} ${TABLE_TOP} Q${cx - 9} ${TABLE_TOP} ${cx - 11} ${rim} Z`}
        fill="#f8fafc"
        stroke={INK}
        strokeWidth="0.7"
      />
      <path d={`M${cx - 8} ${rim + 3.5} L${cx + 8} ${rim + 3.5}`} stroke="#fb7185" strokeWidth="1" />
    </g>
  );
}

function IcedDrink({ cx, tint }: { readonly cx: number; readonly tint: string }) {
  const top = TABLE_TOP - 16;
  return (
    <g>
      <path d={`M${cx + 1} ${top - 6} L${cx + 3} ${top + 4}`} stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d={`M${cx - 4.5} ${top} L${cx + 4.5} ${top} L${cx + 3.6} ${TABLE_TOP} L${cx - 3.6} ${TABLE_TOP} Z`}
        fill={tint}
        fillOpacity="0.85"
        stroke={INK}
        strokeWidth="0.6"
      />
      <rect x={cx - 3} y={top + 2} width="2.6" height="2.6" rx="0.6" fill="#ffffff" opacity="0.85" />
      <rect x={cx + 0.4} y={top + 4} width="2.4" height="2.4" rx="0.6" fill="#ffffff" opacity="0.75" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Guest sprite: anime chibi, drawn facing right and mirrored         */
/* ------------------------------------------------------------------ */

const G_SKIN = '#f6d2b5';
const G_SHADE = '#e0a58e';
const G_HAIR = '#4b2a20';
const G_HAIR_SHINE = '#8a5a44';
const G_CARDIGAN = '#f7e8d8';

const G_JEANS = '#6a7fb0';
const G_SHOE = '#f1f5f9';
const G_SOLE = '#cbd5e1';

function GuestArms({ pose }: { readonly pose: MiniPose }) {
  const colors = { sleeve: G_CARDIGAN, skin: G_SKIN };
  switch (pose) {
    case 'dangle':
      return (
        <>
          <g className="animate-mini-flail-left">
            <Limb shoulder={[24, 56]} elbow={[17, 50]} hand={[14, 42]} {...colors} />
          </g>
          <g className="animate-mini-flail-right">
            <Limb shoulder={[52, 56]} elbow={[59, 50]} hand={[62, 42]} {...colors} />
          </g>
        </>
      );
    case 'fall':
      return (
        <>
          <Limb shoulder={[24, 56]} elbow={[18, 48]} hand={[16, 40]} {...colors} />
          <Limb shoulder={[52, 56]} elbow={[58, 48]} hand={[60, 40]} {...colors} />
        </>
      );
    case 'seated':
      return (
        <>
          <Limb shoulder={[25, 57]} elbow={[29, 65]} hand={[37, 67]} {...colors} />
          <g className="animate-guest-wave-soft">
            <Limb shoulder={[51, 57]} elbow={[56, 63]} hand={[62, 56]} {...colors} />
          </g>
        </>
      );
    default:
      return (
        <>
          <Limb shoulder={[24, 56]} elbow={[20, 63]} hand={[19, 71]} {...colors} />
          <Limb shoulder={[52, 56]} elbow={[56, 63]} hand={[57, 71]} {...colors} />
        </>
      );
  }
}

/** Seated at the table by default; standing poses are used while she's picked up or walking back. */
function GuestSprite({ pose = 'seated' }: { readonly pose?: MiniPose }) {
  const seated = pose === 'seated';
  const startled = pose === 'dangle' || pose === 'fall';
  return (
    <g className={pose === 'walk' ? 'animate-mini-bob' : undefined}>
      {seated ? (
        <SeatedLegs pants={G_JEANS} shoe={G_SHOE} sole={G_SOLE} />
      ) : (
        <StandingLegs pose={pose} pants={G_JEANS} shoe={G_SHOE} sole={G_SOLE} />
      )}

      <g transform={seated ? 'translate(0 3)' : undefined}>
        {/* Long back hair */}
        <path
          d="M13 30 C11 12 24 3 38 3 C52 3 65 12 63 30 C64 42 63 53 59 60 Q38 64 17 60 C13 53 12 42 13 30 Z"
          fill={G_HAIR}
          stroke={INK}
          strokeWidth="0.9"
        />

        {/* Cardigan over a sage top */}
        <path
          d="M22.5 58 Q23 53.5 29.5 52.5 L46.5 52.5 Q53 53.5 53.5 58 L54.5 74.5 Q54.5 77 52 77 L24 77 Q21.5 77 21.5 74.5 Z"
          fill={G_CARDIGAN}
          stroke={INK}
          strokeWidth="0.9"
        />
        <path d="M32.6 52.6 L38 68 L43.4 52.6 Z" fill="#9ad6b8" stroke={INK} strokeWidth="0.7" />
        <path d="M33.5 46 L42.5 46 L42.5 53.5 Q38 55 33.5 53.5 Z" fill={G_SHADE} stroke={INK} strokeWidth="0.8" />
        <circle cx="38" cy="60.5" r="0.8" fill="#c08457" />
        <circle cx="38" cy="65" r="0.8" fill="#c08457" />

        <GuestArms pose={pose} />

        {/* Face */}
        <path d={GUEST_FACE} fill={G_SKIN} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        <path d="M18.5 23.5 Q38 19 57.5 23.5 L57.5 28 Q38 24 18.5 28 Z" fill={G_SHADE} opacity="0.5" />
        <FaceRimLight face={GUEST_FACE} rightPath="M56.5 25 C56.5 33.5 54.2 39.6 50.6 43.6 C47 47.4 42.6 49.8 40 49.8" right="#f9a8d4" />

        {/* Big sparkly eyes */}
        <g className="animate-blink">
          {[29.6, 46.4].map((cx, i) => {
            const flick = i === 0 ? -1 : 1;
            return (
              <g key={cx}>
                <ellipse cx={cx} cy={32.2} rx="3.4" ry="4.2" fill="#6b3a24" />
                <path d={`M${cx - 3.4} 32 A3.4 4.2 0 0 1 ${cx + 3.4} 32 Z`} fill="#3a1c12" />
                <ellipse cx={cx} cy={33.4} rx="1.4" ry="1.9" fill="#2a120a" />
                <ellipse cx={cx} cy={35.2} rx="2.2" ry="0.9" fill="#e8a560" opacity="0.8" />
                <circle cx={cx - 1.2} cy={30.6} r="1.4" fill="#ffffff" />
                <circle cx={cx + 1.3} cy={34} r="0.65" fill="#ffffff" />
                <path
                  d={`M${cx - 4.6} 29.2 Q${cx} 25.4 ${cx + 4.6} 29.2 M${cx + flick * 4.6} 29.2 L${cx + flick * 6} 27.8`}
                  fill="none"
                  stroke={INK}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d={`M${cx - 2.4} 37.2 Q${cx} 37.8 ${cx + 2.4} 37.2`} fill="none" stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
              </g>
            );
          })}
        </g>

        {/* Soft side-swept bangs + front locks */}
        <path
          d="M15.5 31 C13 14 24 5 38 5 C52 5 63 14 60.5 31 C59 25 56.5 21 52.5 18.5 L50 23 L48 17.5 C44 20 40 22 35 22.5 L37 19 C31 22 25 23 21.5 22 L20 26 C18 27.5 16.5 29 15.5 31 Z"
          fill={G_HAIR}
          stroke={INK}
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <path d="M15.5 31 C14 40 15 50 18 57 L21 48 C19 42 18.5 36 19 31 Z" fill={G_HAIR} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M60.5 31 C62 40 61 50 58 57 L55 48 C57 42 57.5 36 57 31 Z" fill={G_HAIR} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
        <HairShine color={G_HAIR_SHINE} />
        {/* Star hair clip */}
        <path d="M54 13.4 l1.3 2.6 2.8 .4 -2 2 .5 2.8 -2.6 -1.4 -2.6 1.4 .5 -2.8 -2 -2 2.8 -.4 Z" fill="#fde047" stroke={INK} strokeWidth="0.5" />

        <path d="M25.6 23.8 Q29 22.6 32.6 23.4" fill="none" stroke={G_HAIR} strokeWidth="1" strokeLinecap="round" />
        <path d="M43.4 23.4 Q47 22.6 50.4 23.8" fill="none" stroke={G_HAIR} strokeWidth="1" strokeLinecap="round" />

        <path d="M38.8 37.4 L38.3 38.6" stroke={G_SHADE} strokeWidth="0.9" strokeLinecap="round" />
        <Blush left={24} right={52} y={39.2} />
        {startled ? (
          <>
            <ellipse cx="38.6" cy="42.6" rx="2" ry="2.6" fill="#a0413a" stroke={INK} strokeWidth="0.7" />
            <ellipse cx="38.6" cy="44.1" rx="1.2" ry="0.7" fill="#f9a8d4" />
          </>
        ) : (
          <>
            <path d="M35.4 41 Q38.6 45.2 41.8 41 Q38.6 42 35.4 41 Z" fill="#a0413a" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
            <ellipse cx="38.6" cy="43" rx="1.3" ry="0.7" fill="#f9a8d4" />
          </>
        )}
      </g>
    </g>
  );
}
