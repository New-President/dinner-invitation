'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CAT_IMPACT_EVENT, CAT_SNACK_EVENT, DINNER_TABLE_ATTR } from '@/lib/mini-companion';

const CHEER_MESSAGES = [
  '“Meow!! You’re gonna ACE your exam! Full marks incoming! 🐾💯”',
  '“JIAYOU!! Crush that paper until 7pm! You got this!! 🔥”',
  '“100 / 100 A+ ENERGY!! Dinner feast awaits right after! 🎉”',
] as const;

const MESSAGE_ROTATE_MS = 3200;
const BEAT_MS = 520;
const ACTION_MS = 2600;

/** Hop, hang in the air, then plummet and SPLAT. Impact lands at CRASH_IMPACT of the way through. */
const CRASH_MS = 1300;
const CRASH_IMPACT = 0.76;
const IMPACT_FX_MS = 900;
const EAT_MS = 3400;
const FADE_OUT_MS = 500;
const FADE_IN_MS = 750;

/** The cat cycles through these cute actions; each lasts ACTION_MS. */
type CatAction = 'cheer' | 'wink' | 'big-jump' | 'star-eyes' | 'pom-shake';
const CAT_ACTIONS: readonly CatAction[] = ['cheer', 'wink', 'big-jump', 'star-eyes', 'pom-shake'];

/** Easter egg: the cat crash-lands behind the dinner table, eats, then fades back. */
type EasterEggPhase = 'idle' | 'leaping' | 'eating' | 'returning';

const EGG_MESSAGES: Readonly<Record<Exclude<EasterEggPhase, 'idle'>, string>> = {
  leaping: '“Ooh, is that FOOD?! CANNONBALL!! 🐾💥”',
  eating: '“Nom nom nom… just one bite! 🍜”',
  returning: '“Okay okay, back to cheering! 📣”',
};

interface LeapPlan {
  /** px per SVG unit of the cheering cat */
  readonly startScale: number;
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  /** end size relative to the start size */
  readonly endScale: number;
  /** Floor line under the table (viewport px), for the dust clouds. */
  readonly floorY: number;
  readonly catWidth: number;
  readonly catHeight: number;
}

const VIEW_W = 320;
const VIEW_H = 280;
/** SVG y of the bottom of the cat's paws. */
const CAT_FEET_Y = 258;

function planLeap(svg: SVGSVGElement): LeapPlan {
  const rect = svg.getBoundingClientRect();
  const startScale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
  const startX = rect.left + (rect.width - VIEW_W * startScale) / 2;
  const startY = rect.top + (rect.height - VIEW_H * startScale) / 2;

  const table = document.querySelector(`[${DINNER_TABLE_ATTR}]`)?.getBoundingClientRect();
  // The cat keeps its full cheering size and stands on the floor behind the table.
  const endPxPerUnit = startScale;
  const floorY = table ? table.bottom : window.innerHeight - 6;
  const centerX = table ? table.left + table.width / 2 : window.innerWidth / 2;

  // Centre on the table, but keep the whole cat on screen.
  const catWidthPx = VIEW_W * endPxPerUnit;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const endX = Math.min(
    Math.max(8, centerX - catWidthPx / 2),
    Math.max(8, viewportWidth - catWidthPx - 8)
  );
  // Feet sink slightly below the floor line so the cat reads as standing behind the table.
  const endY = floorY + 12 - CAT_FEET_Y * endPxPerUnit;
  return {
    startScale,
    startX,
    startY,
    endX,
    endY,
    endScale: endPxPerUnit / startScale,
    floorY,
    catWidth: catWidthPx,
    catHeight: VIEW_H * endPxPerUnit,
  };
}

/** Shake the page, the table scene, and the cat itself on impact. */
function shakeScreen(extra: Element | null): void {
  const keyframes: Keyframe[] = [
    { translate: '0 0' },
    { translate: '-10px 6px' },
    { translate: '9px -5px' },
    { translate: '-7px 4px' },
    { translate: '4px -2px' },
    { translate: '-2px 1px' },
    { translate: '0 0' },
  ];
  const targets = [document.querySelector('main > section'), document.querySelector('.mini-stage'), extra];
  for (const el of targets) {
    el?.animate(keyframes, { duration: 450, easing: 'ease-out' });
  }
}

interface CheerFatCatProps {
  readonly restaurantName: string;
}

export function CheerFatCat({ restaurantName }: CheerFatCatProps) {
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [beat, setBeat] = useState<boolean>(false);
  const [actionIndex, setActionIndex] = useState<number>(0);
  const [egg, setEgg] = useState<EasterEggPhase>('idle');
  const [leap, setLeap] = useState<LeapPlan | null>(null);
  const [impact, setImpact] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const flyerRef = useRef<HTMLDivElement | null>(null);
  const squashRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % CHEER_MESSAGES.length);
    }, MESSAGE_ROTATE_MS);
    const beatTimer = window.setInterval(() => setBeat((b) => !b), BEAT_MS);
    const actionTimer = window.setInterval(() => {
      setActionIndex((i) => (i + 1) % CAT_ACTIONS.length);
    }, ACTION_MS);
    const timers = timersRef.current;
    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(beatTimer);
      window.clearInterval(actionTimer);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const startEasterEgg = () => {
    if (egg !== 'idle' || !svgRef.current) return;
    setLeap(planLeap(svgRef.current));
    setEgg('leaping');
  };

  // The crash: a little hop, hang in the air, then plummet and splat with exaggerated squash.
  useLayoutEffect(() => {
    const el = flyerRef.current;
    const body = squashRef.current;
    if (egg !== 'leaping' || !leap || !el || !body) return;
    const { startX: sx, startY: sy, endX: ex, endY: ey } = leap;
    const peakY = Math.min(sy - 60, ey - 260);
    const at = (x: number, y: number) => `translate(${x}px, ${y}px)`;

    const move = el.animate(
      [
        { transform: at(sx, sy), offset: 0, easing: 'ease-out' },
        { transform: at(sx + (ex - sx) * 0.08, sy - 70), offset: 0.2, easing: 'ease-in-out' },
        { transform: at(ex, peakY), offset: 0.48, easing: 'linear' },
        // Hang for a beat, then gravity takes over (accelerating fall).
        { transform: at(ex, peakY - 6), offset: 0.56, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
        { transform: at(ex, ey + 8), offset: CRASH_IMPACT, easing: 'ease-out' },
        { transform: at(ex, ey - 20), offset: 0.86, easing: 'ease-in' },
        { transform: at(ex, ey + 2), offset: 0.94, easing: 'ease-out' },
        { transform: at(ex, ey), offset: 1 },
      ],
      { duration: CRASH_MS, fill: 'forwards' }
    );
    // Squash and stretch about the feet: crouch, stretch on take-off, stretch while
    // falling, then a huge SPLAT on impact and a wobbly jelly rebound.
    body.animate(
      [
        { transform: 'scale(1, 1) rotate(0deg)', offset: 0 },
        { transform: 'scale(1.16, 0.82) rotate(0deg)', offset: 0.1 },
        { transform: 'scale(0.9, 1.12) rotate(-8deg)', offset: 0.2 },
        { transform: 'scale(1, 1) rotate(12deg)', offset: 0.46 },
        { transform: 'scale(1.04, 0.96) rotate(0deg)', offset: 0.56 },
        { transform: 'scale(0.84, 1.22) rotate(0deg)', offset: 0.74 },
        { transform: 'scale(1.55, 0.5) rotate(0deg)', offset: 0.79 },
        { transform: 'scale(0.86, 1.16) rotate(0deg)', offset: 0.86 },
        { transform: 'scale(1.14, 0.88) rotate(0deg)', offset: 0.91 },
        { transform: 'scale(0.96, 1.04) rotate(0deg)', offset: 0.96 },
        { transform: 'scale(1, 1) rotate(0deg)', offset: 1 },
      ],
      { duration: CRASH_MS, fill: 'forwards' }
    );

    const impactTimer = window.setTimeout(() => {
      setImpact(true);
      shakeScreen(el);
      window.dispatchEvent(new CustomEvent(CAT_IMPACT_EVENT));
      later(() => setImpact(false), IMPACT_FX_MS);
    }, CRASH_MS * CRASH_IMPACT);

    move.onfinish = () => {
      setEgg('eating');
      window.dispatchEvent(new CustomEvent(CAT_SNACK_EVENT));
      later(() => setEgg('returning'), EAT_MS);
    };
    return () => {
      move.onfinish = null;
      window.clearTimeout(impactTimer);
    };
  }, [egg, leap, later]);

  // Fade the table cat out while the cheering cat fades back in.
  useEffect(() => {
    if (egg !== 'returning') return;
    flyerRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FADE_OUT_MS,
      fill: 'forwards',
    });
    later(() => {
      setEgg('idle');
      setLeap(null);
    }, FADE_IN_MS);
  }, [egg, later]);

  const action: CatAction = CAT_ACTIONS[actionIndex];
  const message = egg === 'idle' ? CHEER_MESSAGES[messageIndex] : EGG_MESSAGES[egg];
  const cardCatHidden = egg === 'leaping' || egg === 'eating';

  return (
    <div
      id="cute-cat-section"
      className="flex flex-col items-center justify-between gap-3 rounded-3xl bg-gradient-to-b from-[#2e1d36] via-[#24162b] to-[#1a1120] border-2 border-amber-400/45 p-4 sm:p-7 text-center relative overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.15)]"
    >
      {/* Speech bubble */}
      <div
        className="relative z-10 bg-white text-[#231728] rounded-3xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-base font-extrabold shadow-xl border-2 border-amber-400 max-w-md min-h-[3.25rem] flex items-center justify-center transition-transform duration-300"
        style={{ transform: beat ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)' }}
      >
        <span>{message}</span>
        <div className="absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-amber-400 rotate-45" />
      </div>

      <button
        type="button"
        onClick={startEasterEgg}
        aria-disabled={egg !== 'idle'}
        aria-label="Tap the cheering cat"
        className={`relative flex-1 flex items-center justify-center w-full rounded-3xl bg-transparent border-0 p-0 focus-visible:outline-3 focus-visible:outline-amber-300 focus-visible:outline-offset-4 ${
          egg === 'idle' ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="A squishy mochi calico cat in a FIGHT! headband bouncing and waving pom-poms to cheer for your exam"
          className="w-full max-w-[440px] h-[250px] sm:h-[340px] mx-auto"
        >
          <defs>
            <radialGradient id="mochi-cat-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1a1120" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="160" cy="160" r="122" fill="url(#mochi-cat-glow)" opacity="0.2" className="animate-cat-glow" />

          {/* Badges and confetti: all kept well inside the viewBox */}
          <g className="animate-confetti-float">
            <circle cx="40" cy="52" r="21" fill="#fbbf24" opacity="0.25" />
            <circle cx="40" cy="52" r="17" fill="#f59e0b" />
            <text x="40" y="58" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="900">
              A+
            </text>
            <Sparkle x={26} y={226} size={9} fill="#f472b6" />
            <rect x="74" y="36" width="7" height="7" rx="1.5" fill="#a78bfa" transform="rotate(20 77 39)" />
          </g>
          <g className="animate-confetti-float-delayed">
            <circle cx="280" cy="52" r="23" fill="#f43f5e" opacity="0.25" />
            <circle cx="280" cy="52" r="19" fill="#e11d48" />
            <text x="280" y="57" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
              100%
            </text>
            <Sparkle x={296} y={226} size={9} fill="#fbbf24" />
            <rect x="238" y="34" width="7" height="7" rx="1.5" fill="#34d399" transform="rotate(-18 241 37)" />
          </g>

          {/* The cheering cat (hidden while it is off eating, then fades back in) */}
          <g
            style={{
              opacity: cardCatHidden ? 0 : 1,
              transform: cardCatHidden ? 'scale(0.85)' : 'scale(1)',
              transformBox: 'fill-box',
              transformOrigin: 'center bottom',
              transition: cardCatHidden
                ? 'opacity 120ms ease-out'
                : `opacity ${FADE_IN_MS}ms ease-out, transform ${FADE_IN_MS}ms cubic-bezier(0.34, 1.45, 0.64, 1)`,
            }}
          >
            <ellipse cx="160" cy="264" rx="92" ry="10" fill="rgba(0,0,0,0.45)" className="animate-cat-shadow" />
            <CatFigure action={action} beat={beat} mode="cheer" />
          </g>
        </svg>
      </button>

      {/* The cat on its snack run, drawn above the page */}
      {leap &&
        egg !== 'idle' &&
        createPortal(
          <>
            {/* z-35: above the page, but behind the companion stage (z-40) so the table is in front */}
            <div
              ref={flyerRef}
              aria-hidden="true"
              data-cat-flyer=""
              className="pointer-events-none fixed left-0 top-0 z-[35]"
              style={{
                width: VIEW_W * leap.startScale,
                height: VIEW_H * leap.startScale,
                transformOrigin: '0 0',
                transform: `translate(${leap.startX}px, ${leap.startY}px)`,
              }}
            >
              <div ref={squashRef} className="h-full w-full" style={{ transformOrigin: '50% 92%' }}>
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" className="overflow-visible">
                  <CatFigure action="big-jump" beat={beat} mode={egg === 'leaping' ? 'leap' : 'eat'} />
                </svg>
              </div>
            </div>
            {impact && (
              <div
                aria-hidden="true"
                className="pointer-events-none fixed z-[45]"
                style={{ left: leap.endX, top: leap.floorY - 30, width: leap.catWidth, height: 40 }}
              >
                <span
                  className="cat-thud absolute left-1/2 whitespace-nowrap text-4xl sm:text-5xl font-black italic text-amber-300"
                  style={{ bottom: leap.catHeight * 0.55, WebkitTextStroke: '2px #3b1f1a' }}
                >
                  THUD!
                </span>
                {[
                  { side: 'left', size: 46, x: 0.18, delay: 0 },
                  { side: 'left', size: 32, x: 0.3, delay: 60 },
                  { side: 'right', size: 46, x: 0.82, delay: 0 },
                  { side: 'right', size: 32, x: 0.7, delay: 60 },
                ].map((puff) => (
                  <span
                    key={`${puff.side}-${puff.x}`}
                    className={`cat-dust-${puff.side} absolute bottom-0 rounded-full bg-[#e8dccf]/85 shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.12)]`}
                    style={{
                      left: leap.catWidth * puff.x - puff.size / 2,
                      width: puff.size,
                      height: puff.size * 0.75,
                      animationDelay: `${puff.delay}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </>,
          document.body
        )}

      {/* Bottom exam cheer copy */}
      <div className="space-y-2 max-w-md mx-auto">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 sm:px-4 py-1 text-[11px] sm:text-sm font-extrabold uppercase tracking-wider text-amber-200">
          🐾 Exam Cheer Squad · Jiayou! 💪
        </span>
        <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
          All the Best for Your Exam! 🌟
        </h3>
        <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
          Go score super well in your exam! A delicious dinner at{' '}
          <strong className="text-amber-200">{restaurantName}</strong> will be waiting to celebrate right after!
          <span className="block mt-1 text-[11px] text-rose-200/70">Psst… try tapping the cat 👀</span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cat drawing                                                         */
/* ------------------------------------------------------------------ */

const OUTLINE = '#6b3a24';
const FUR = '#fff3e2';
const TANGERINE = '#f59e4a';
const CARAMEL = '#b0713f';
const PINK = '#f9a8c4';
const PAD = '#f472b6';
const EYE_INK = '#3b1f1a';

/**
 * Pear-shaped mochi body. The same path draws the body and clips the calico
 * patches, so patches always move with the body during squash-and-stretch.
 */
const BODY_PATH =
  'M160 64 C212 64 236 94 236 130 C236 152 260 172 260 202 C260 236 220 248 160 248 C100 248 60 236 60 202 C60 172 84 152 84 130 C84 94 108 64 160 64 Z';

type CatMode = 'cheer' | 'leap' | 'eat';

function CatFigure({
  action,
  beat,
  mode,
}: {
  readonly action: CatAction;
  readonly beat: boolean;
  readonly mode: CatMode;
}) {
  const clipId = `mochi-cat-body-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const bodyClass =
    mode === 'eat'
      ? 'animate-cat-munch'
      : mode === 'leap'
        ? undefined
        : action === 'big-jump'
          ? 'animate-cat-big-jump'
          : 'animate-cat-bounce';
  const shaking = mode === 'cheer' && action === 'pom-shake';

  return (
    <g key={`${mode}-${bodyClass}`} className={bodyClass}>
      <defs>
        <clipPath id={clipId}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      {/* Curly tail behind the body */}
      <g className="animate-cat-tail">
        <path d="M246 222 C286 214 298 178 280 158" fill="none" stroke={OUTLINE} strokeWidth="19" strokeLinecap="round" />
        <path d="M246 222 C286 214 298 178 280 158" fill="none" stroke={TANGERINE} strokeWidth="12" strokeLinecap="round" />
        <circle cx="280" cy="158" r="6" fill={FUR} />
      </g>

      {/* Rounded ears */}
      <g className="animate-cat-ear-left">
        <path d="M96 112 C86 78 92 54 106 48 C120 52 136 68 142 80 Z" fill={FUR} stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
        <path d="M104 100 C100 80 103 66 109 62 C117 66 126 76 130 84 Z" fill={PINK} />
      </g>
      <g className="animate-cat-ear-right">
        <path d="M224 112 C234 78 228 54 214 48 C200 52 184 68 178 80 Z" fill={TANGERINE} stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
        <path d="M216 100 C220 80 217 66 211 62 C203 66 194 76 190 84 Z" fill={PINK} />
      </g>

      {/* Mochi body with clipped calico patches */}
      <path d={BODY_PATH} fill={FUR} />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx="214" cy="86" rx="44" ry="34" fill={TANGERINE} transform="rotate(18 214 86)" />
        <ellipse cx="126" cy="70" rx="24" ry="13" fill={CARAMEL} />
        <ellipse cx="86" cy="196" rx="30" ry="34" fill={CARAMEL} />
        <ellipse cx="244" cy="210" rx="22" ry="26" fill={TANGERINE} />
      </g>
      <path d={BODY_PATH} fill="none" stroke={OUTLINE} strokeWidth="4.5" />

      {/* Fluffy cream chest tuft */}
      <path
        d="M122 182 Q131 171 140 180 Q150 167 160 178 Q170 167 180 180 Q189 171 198 182 C204 210 190 236 160 238 C130 236 116 210 122 182 Z"
        fill="#fffbf4"
      />

      {/* FIGHT! headband with side tails */}
      <path d="M238 100 L268 86 L264 100 L272 112 L238 108 Z" fill="#e11d48" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M86 98 Q160 80 234 98 L236 112 Q160 94 84 112 Z" fill="#e11d48" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <rect x="130" y="86" width="60" height="18" rx="7" fill="#ffffff" stroke="#e11d48" strokeWidth="2.4" />
      <text x="160" y="99.5" textAnchor="middle" fill="#e11d48" fontSize="11" fontWeight="900" letterSpacing="0.5">
        FIGHT!
      </text>

      {/* Chubby cheeks (puffed out while chomping) */}
      <ellipse cx="104" cy="152" rx="16" ry="10" fill={PINK} opacity="0.75" className={mode === 'eat' ? 'animate-cat-cheek-puff' : undefined} />
      <ellipse cx="216" cy="152" rx="16" ry="10" fill={PINK} opacity="0.75" className={mode === 'eat' ? 'animate-cat-cheek-puff' : undefined} />

      <CatFace action={mode === 'leap' ? 'big-jump' : action} beat={beat} eating={mode === 'eat'} />

      {/* Whiskers */}
      <g stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round">
        <path d="M66 142 L88 146" />
        <path d="M64 154 L86 154" />
        <path d="M254 142 L232 146" />
        <path d="M256 154 L234 154" />
      </g>

      {mode === 'eat' ? (
        <>
          {/* The stolen bowl, held against the tummy; the food level shrinks as it eats */}
          <g className="animate-cat-food-shrink">
            <ellipse cx="160" cy="192" rx="34" ry="11" fill="#65a30d" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="146" cy="188" r="5" fill="#fbbf24" />
            <circle cx="164" cy="186" r="4.5" fill="#f97316" />
            <circle cx="178" cy="190" r="4" fill="#fef3c7" />
          </g>
          <path d="M120 192 L200 192 Q196 224 160 226 Q124 224 120 192 Z" fill="#f8fafc" stroke={OUTLINE} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M128 204 L192 204" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" />

          {/* Left paw steadies the bowl */}
          <ellipse cx="118" cy="200" rx="16" ry="13" fill={FUR} stroke={OUTLINE} strokeWidth="3.8" />

          {/* Right paw scoops a bite up to the mouth, over and over */}
          <g className="animate-cat-scoop">
            <g className="animate-cat-morsel">
              <circle cx="186" cy="182" r="5.5" fill="#65a30d" stroke={OUTLINE} strokeWidth="1.5" />
              <circle cx="195" cy="178" r="4" fill="#f97316" stroke={OUTLINE} strokeWidth="1.2" />
            </g>
            <ellipse cx="200" cy="192" rx="16" ry="13" fill={FUR} stroke={OUTLINE} strokeWidth="3.8" />
          </g>

          {/* Crumbs flying from the chomping mouth */}
          <g className="animate-cat-crumbs" stroke={OUTLINE} strokeWidth="1.2">
            <circle cx="140" cy="166" r="3" fill="#65a30d" />
            <circle cx="182" cy="164" r="2.6" fill="#fbbf24" />
          </g>
          <g className="animate-cat-crumbs-delayed" stroke={OUTLINE} strokeWidth="1.2">
            <circle cx="136" cy="160" r="2.4" fill="#f97316" />
            <circle cx="186" cy="170" r="3" fill="#fef3c7" />
          </g>
        </>
      ) : (
        <>
          <g
            key={`l-${shaking}`}
            className={mode === 'leap' ? undefined : shaking ? 'animate-cat-shake-left' : 'animate-cat-cheer-left'}
          >
            <ellipse cx="78" cy="160" rx="22" ry="15" transform="rotate(-35 78 160)" fill={FUR} stroke={OUTLINE} strokeWidth="3.8" />
            <PomPom cx={56} cy={130} label="GO!!" core="#f43f5e" />
          </g>
          <g
            key={`r-${shaking}`}
            className={mode === 'leap' ? undefined : shaking ? 'animate-cat-shake-right' : 'animate-cat-cheer-right'}
          >
            <ellipse cx="242" cy="160" rx="22" ry="15" transform="rotate(35 242 160)" fill={FUR} stroke={OUTLINE} strokeWidth="3.8" />
            <PomPom cx={264} cy={130} label="ACE!" core="#ec4899" />
          </g>
        </>
      )}

      {/* Feet with jellybean toe pads */}
      <g className={mode === 'cheer' ? 'animate-cat-foot-left' : undefined}>
        <Paw cx={122} />
      </g>
      <g className={mode === 'cheer' ? 'animate-cat-foot-right' : undefined}>
        <Paw cx={198} />
      </g>
    </g>
  );
}

function SparkleEyes({ lookUp = false }: { readonly lookUp?: boolean }) {
  const dy = lookUp ? -4 : 0;
  return (
    <g>
      {[128, 192].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={130} rx="14" ry="16" fill={EYE_INK} />
          <ellipse cx={cx} cy={136 + dy} rx="8" ry="6" fill="#7c4a3a" opacity="0.6" />
          <circle cx={cx - 5} cy={123 + dy} r="5.2" fill="#ffffff" />
          <circle cx={cx + 5} cy={137 + dy} r="2.4" fill="#ffffff" />
        </g>
      ))}
    </g>
  );
}

function HappyEyes() {
  return (
    <g fill="none" stroke={EYE_INK} strokeWidth="5" strokeLinecap="round">
      <path d="M114 134 Q128 118 142 134" />
      <path d="M178 134 Q192 118 206 134" />
    </g>
  );
}

function OpenMouth({ big }: { readonly big: boolean }) {
  return (
    <g>
      <path
        d={big ? 'M146 153 Q160 151 174 153 Q172 176 160 176 Q148 176 146 153 Z' : 'M150 153 Q160 152 170 153 Q168 166 160 166 Q152 166 150 153 Z'}
        fill="#9f1d4f"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="160" cy={big ? 169 : 162} rx={big ? 8 : 5.5} ry={big ? 5 : 3.4} fill="#fb7185" />
    </g>
  );
}

const CAT_SMILE = 'M146 154 Q153 162 160 153 Q167 162 174 154';

/** Face changes with the current action and the cheer beat (like the original cat). */
function CatFace({
  action,
  beat,
  eating,
}: {
  readonly action: CatAction;
  readonly beat: boolean;
  readonly eating: boolean;
}) {
  let eyes: React.ReactNode;
  let mouth: React.ReactNode;

  if (eating) {
    eyes = <HappyEyes />;
    mouth = (
      <g className="animate-cat-chomp">
        <ellipse cx="160" cy="160" rx="10" ry="7" fill="#9f1d4f" stroke={OUTLINE} strokeWidth="3" />
        <ellipse cx="160" cy="163" rx="5" ry="2.6" fill="#fb7185" />
      </g>
    );
  } else {
    switch (action) {
      case 'wink':
        eyes = (
          <g>
            <ellipse cx="128" cy="130" rx="14" ry="16" fill={EYE_INK} />
            <circle cx="123" cy="123" r="5.2" fill="#ffffff" />
            <circle cx="133" cy="137" r="2.4" fill="#ffffff" />
            <path d="M180 120 L203 130 L180 140" fill="none" stroke={EYE_INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
        mouth = (
          <g>
            <path d="M163 156 Q163 170 169 170 Q175 170 174 156 Z" fill="#fb7185" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
            <path d={CAT_SMILE} fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
        break;
      case 'big-jump':
        eyes = (
          <g fill="none" stroke={EYE_INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M116 120 L139 130 L116 140" />
            <path d="M204 120 L181 130 L204 140" />
          </g>
        );
        mouth = <OpenMouth big />;
        break;
      case 'star-eyes':
        eyes = (
          <g>
            {[128, 192].map((cx) => (
              <g key={cx} className="animate-cat-star-spin">
                <path
                  d={`M${cx} 113 L${cx + 5} 124 L${cx + 17} 125 L${cx + 8} 133 L${cx + 11} 145 L${cx} 139 L${cx - 11} 145 L${cx - 8} 133 L${cx - 17} 125 L${cx - 5} 124 Z`}
                  fill="#fde047"
                  stroke={OUTLINE}
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </g>
        );
        mouth = <OpenMouth big={beat} />;
        break;
      case 'pom-shake':
        eyes = <SparkleEyes lookUp />;
        mouth = <OpenMouth big={false} />;
        break;
      default:
        // Classic cheer: alternate sparkly and happy eyes on the beat, mouth opens on the up-beat.
        eyes = beat ? <SparkleEyes /> : <HappyEyes />;
        mouth = beat ? (
          <OpenMouth big={false} />
        ) : (
          <path d={CAT_SMILE} fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        );
    }
  }

  return (
    <g>
      {eyes}
      <path d="M154 144 Q160 141 166 144 Q163 150 160 151 Q157 150 154 144 Z" fill={PAD} />
      {mouth}
    </g>
  );
}

function Sparkle({
  x,
  y,
  size,
  fill,
}: {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly fill: string;
}) {
  const s = size;
  return (
    <path
      d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`}
      fill={fill}
    />
  );
}

function PomPom({
  cx,
  cy,
  label,
  core,
}: {
  readonly cx: number;
  readonly cy: number;
  readonly label: string;
  readonly core: string;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="23" fill="#fbbf24" stroke="#d97706" strokeWidth="3" strokeDasharray="6 3" />
      <circle cx={cx} cy={cy} r="15" fill={core} opacity="0.92" />
      <text x={cx} y={cy + 4.5} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
        {label}
      </text>
    </g>
  );
}

function Paw({ cx }: { readonly cx: number }) {
  return (
    <g>
      <ellipse cx={cx} cy="247" rx="25" ry="14" fill={FUR} stroke={OUTLINE} strokeWidth="3.8" />
      <ellipse cx={cx} cy="251" rx="7" ry="5.4" fill={PAD} />
      <ellipse cx={cx - 11} cy="244" rx="3.4" ry="4" fill={PAD} />
      <ellipse cx={cx} cy="241" rx="3.4" ry="4" fill={PAD} />
      <ellipse cx={cx + 11} cy="244" rx="3.4" ry="4" fill={PAD} />
    </g>
  );
}
