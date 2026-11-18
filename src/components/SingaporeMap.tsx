'use client';

import React, { useState } from 'react';
import { REGIONS, REGION_ORDER, type RegionId } from '@/lib/restaurants';

interface SingaporeMapProps {
  readonly selectedRegion?: RegionId;
  readonly onEnterRegion: (region: RegionId) => void;
  readonly headingRef?: React.RefObject<HTMLHeadingElement | null>;
  /** How many restaurants each region currently has (set from /admin). */
  readonly restaurantCounts: Readonly<Record<RegionId, number>>;
}

const REGION_SVG_PATHS: Readonly<
  Record<
    RegionId,
    {
      readonly path: string;
      readonly labelPos: { readonly x: number; readonly y: number };
      readonly fillActive: string;
      readonly fillIdle: string;
      readonly stroke: string;
    }
  >
> = {
  west: {
    path: 'M 72 285 L 95 205 L 155 155 L 255 135 L 315 165 L 332 230 L 315 305 L 250 328 L 160 322 L 95 330 Z',
    labelPos: { x: 210, y: 240 },
    fillActive: 'url(#grad-west-active)',
    fillIdle: 'url(#grad-west-idle)',
    stroke: 'var(--map-west)',
  },
  north: {
    path: 'M 255 135 L 330 82 L 430 68 L 520 92 L 548 148 L 490 185 L 390 185 L 315 165 Z',
    labelPos: { x: 415, y: 128 },
    fillActive: 'url(#grad-north-active)',
    fillIdle: 'url(#grad-north-idle)',
    stroke: 'var(--map-north)',
  },
  central: {
    path: 'M 315 165 L 390 185 L 490 185 L 515 245 L 485 310 L 425 322 L 355 305 L 315 305 L 332 230 Z',
    labelPos: { x: 418, y: 248 },
    fillActive: 'url(#grad-central-active)',
    fillIdle: 'url(#grad-central-idle)',
    stroke: 'var(--map-central)',
  },
  east: {
    path: 'M 548 148 L 625 142 L 718 175 L 758 225 L 725 280 L 620 298 L 485 310 L 515 245 L 490 185 Z',
    labelPos: { x: 618, y: 228 },
    fillActive: 'url(#grad-east-active)',
    fillIdle: 'url(#grad-east-idle)',
    stroke: 'var(--map-east)',
  },
  south: {
    path: 'M 250 328 L 315 305 L 355 305 L 425 322 L 485 310 L 472 378 L 385 398 L 278 382 Z',
    labelPos: { x: 375, y: 338 },
    fillActive: 'url(#grad-south-active)',
    fillIdle: 'url(#grad-south-idle)',
    stroke: 'var(--map-south)',
  },
};

export function SingaporeMap({
  onEnterRegion,
  headingRef,
  restaurantCounts,
}: SingaporeMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);
  const hoveredMeta = hoveredRegion ? REGIONS[hoveredRegion] : null;

  return (
    <div className="h-dvh w-full overflow-hidden p-3.5 sm:p-6 flex flex-col justify-between gap-2 bg-gradient-to-br from-[var(--page-from)] via-[var(--page-via)] to-[var(--page-to)] text-white select-none">
      {/* Top Map Status Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-2.5 sm:pb-3 border-b border-white/10 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-400 shadow-[0_0_12px_var(--color-rose-400)] shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider sm:tracking-widest text-rose-200/90">
              SINGAPORE VEGETARIAN DINNER INVITATION · HOSTED BY YONG ZI REN
            </span>
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-xl sm:text-3xl font-extrabold tracking-tight text-white focus:outline-none"
          >
            Where Shall We Have Dinner?
          </h1>
        </div>
      </div>

      {/* Center Full-Screen SVG Map Canvas */}
      <div
        style={{ maxHeight: 'calc(100dvh - 185px)' }}
        className="relative flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center py-1"
      >
        <svg
          viewBox="0 0 820 430"
          role="img"
          aria-label="Interactive map of Singapore divided into North, South, East, West, and Central regions"
          style={{
            width: '100%',
            height: '100%',
            maxHeight: 'calc(100dvh - 190px)',
          }}
          className="w-full h-full select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="grad-west-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-west-a)' }} stopOpacity="0.92" />
              <stop offset="100%" style={{ stopColor: 'var(--map-west-b)' }} stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-north-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-north-a)' }} stopOpacity="0.92" />
              <stop offset="100%" style={{ stopColor: 'var(--map-north-b)' }} stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-central-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-central-a)' }} stopOpacity="0.92" />
              <stop offset="100%" style={{ stopColor: 'var(--map-central-b)' }} stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-east-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-east-a)' }} stopOpacity="0.92" />
              <stop offset="100%" style={{ stopColor: 'var(--map-east-b)' }} stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-south-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-south-a)' }} stopOpacity="0.92" />
              <stop offset="100%" style={{ stopColor: 'var(--map-south-b)' }} stopOpacity="0.96" />
            </linearGradient>

            <linearGradient id="grad-west-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-west-idle-a)' }} stopOpacity="0.84" />
              <stop offset="100%" style={{ stopColor: 'var(--map-west-idle-b)' }} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-north-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-north-idle-a)' }} stopOpacity="0.84" />
              <stop offset="100%" style={{ stopColor: 'var(--map-north-idle-b)' }} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-central-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-central-idle-a)' }} stopOpacity="0.86" />
              <stop offset="100%" style={{ stopColor: 'var(--map-central-idle-b)' }} stopOpacity="0.92" />
            </linearGradient>
            <linearGradient id="grad-east-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-east-idle-a)' }} stopOpacity="0.84" />
              <stop offset="100%" style={{ stopColor: 'var(--map-east-idle-b)' }} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-south-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--map-south-idle-a)' }} stopOpacity="0.86" />
              <stop offset="100%" style={{ stopColor: 'var(--map-south-idle-b)' }} stopOpacity="0.92" />
            </linearGradient>

            <pattern id="sg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* Sea Grid Background */}
          <rect x="0" y="0" width="820" height="430" rx="20" fill="url(#sg-grid)" />

          {/* Straits Labels */}
          <text
            x="410"
            y="38"
            textAnchor="middle"
            style={{ fill: 'var(--map-label)' }}
            fontSize="11"
            fontWeight="600"
            letterSpacing="3"
          >
            STRAITS OF JOHOR
          </text>
          <text
            x="570"
            y="398"
            textAnchor="middle"
            style={{ fill: 'var(--map-label)' }}
            fontSize="11"
            fontWeight="600"
            letterSpacing="3"
          >
            SINGAPORE STRAIT
          </text>

          {/* Pulau Ubin */}
          <path
            d="M 615 110 L 655 104 L 668 118 L 635 125 Z"
            style={{ fill: 'var(--map-island)', stroke: 'var(--map-island-edge)' }}
            strokeWidth="1.2"
          />
          <text x="642" y="98" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9">
            Pulau Ubin
          </text>

          {/* Sentosa Island */}
          <path
            d="M 358 403 L 408 399 L 418 412 L 368 415 Z"
            style={{
              fill: hoveredRegion === 'south' ? 'var(--map-south-a)' : 'var(--map-south-idle-a)',
              stroke: 'var(--map-south-a)',
            }}
            strokeWidth="1.4"
            className="cursor-pointer transition-colors"
            onMouseEnter={() => setHoveredRegion('south')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onEnterRegion('south')}
          />
          <text x="390" y="426" textAnchor="middle" style={{ fill: 'var(--map-label-strong)' }} fontSize="9.5">
            Sentosa
          </text>

          {/* Interactive 5 Singapore Regions */}
          {REGION_ORDER.map((regionId) => {
            const shape = REGION_SVG_PATHS[regionId];
            const meta = REGIONS[regionId];
            const isHighlighted = hoveredRegion === regionId;

            return (
              <g
                key={regionId}
                role="button"
                tabIndex={0}
                aria-label={`Explore ${meta.name} (${meta.subtitle})`}
                onMouseEnter={() => setHoveredRegion(regionId)}
                onMouseLeave={() => setHoveredRegion(null)}
                onFocus={() => setHoveredRegion(regionId)}
                onBlur={() => setHoveredRegion(null)}
                onClick={() => onEnterRegion(regionId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEnterRegion(regionId);
                  }
                }}
                className="cursor-pointer group focus:outline-none"
              >
                <path
                  d={shape.path}
                  fill={isHighlighted ? shape.fillActive : shape.fillIdle}
                  style={{ stroke: isHighlighted ? '#ffffff' : shape.stroke }}
                  strokeWidth={isHighlighted ? 3.2 : 1.8}
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {regionId === 'west' && (
                  <circle
                    cx={shape.labelPos.x}
                    cy={shape.labelPos.y - 12}
                    r="28"
                    fill="none"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    className="animate-pulse-ring"
                  />
                )}

                {/* Map Pin Marker */}
                <g transform={`translate(${shape.labelPos.x}, ${shape.labelPos.y - 12})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r={isHighlighted ? 15 : 11}
                    style={{
                      fill: isHighlighted ? '#ffffff' : shape.stroke,
                      stroke: isHighlighted ? shape.stroke : '#ffffff',
                    }}
                    strokeWidth="2.5"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontSize={isHighlighted ? '13' : '10'}
                    style={{ fill: isHighlighted ? shape.stroke : '#ffffff' }}
                    fontWeight="800"
                  >
                    ★
                  </text>
                </g>

                {/* NUS Landmark Pin inside West Region */}
                {regionId === 'west' && (
                  <g
                    transform="translate(274, 294)"
                    className="pointer-events-none"
                    aria-label="NUS (National University of Singapore) inside West Singapore"
                  >
                    {/* Subtle Pulse Ring around NUS Pin */}
                    <circle
                      cx="0"
                      cy="0"
                      r={isHighlighted ? 14 : 11}
                      fill="rgba(251, 191, 36, 0.18)"
                      stroke="rgba(251, 191, 36, 0.55)"
                      strokeWidth="1.2"
                      strokeDasharray="2.5 2.5"
                    />
                    {/* Map Teardrop / Pin Dot */}
                    <circle
                      cx="0"
                      cy="0"
                      r="6"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.8"
                    />
                    <circle cx="0" cy="0" r="2" fill="#ffffff" />

                    {/* NUS Pill Badge */}
                    <rect
                      x="-26"
                      y="-26"
                      width="52"
                      height="16"
                      rx="8"
                      fill={isHighlighted ? '#ffffff' : '#18111c'}
                      stroke="#f59e0b"
                      strokeWidth="1.4"
                    />
                    <text
                      x="0"
                      y="-15"
                      textAnchor="middle"
                      fill={isHighlighted ? '#b45309' : '#fde68a'}
                      fontSize="9"
                      fontWeight="800"
                      letterSpacing="0.6"
                    >
                      📍 NUS
                    </text>
                  </g>
                )}

                {/* Region Label */}
                <text
                  x={shape.labelPos.x}
                  y={shape.labelPos.y + 18}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={isHighlighted ? '15' : '13'}
                  fontWeight="800"
                  letterSpacing="0.8"
                  className="pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                >
                  {regionId.toUpperCase()}
                </text>
                <text
                  x={shape.labelPos.x}
                  y={shape.labelPos.y + 33}
                  textAnchor="middle"
                  fill={isHighlighted ? '#ffe4e6' : 'rgba(255,255,255,0.68)'}
                  fontSize="10"
                  fontWeight="500"
                  className="pointer-events-none"
                >
                  {restaurantCounts[regionId]} Veg Spot{restaurantCounts[regionId] === 1 ? '' : 's'}
                </text>
              </g>
            );
          })}

          {/* Floating Exam Warning Tooltip for Non-NUS Regions */}
          {hoveredRegion !== null &&
            hoveredRegion !== 'west' &&
            (() => {
              const labelPos = REGION_SVG_PATHS[hoveredRegion].labelPos;
              const clampedX = Math.max(200, Math.min(620, labelPos.x));
              const boxY = Math.max(14, labelPos.y - 78);
              const boxX = clampedX - 190;
              const pointerTipY = labelPos.y - 26;
              const pointerBaseY = boxY + 48;
              const pointerX = Math.max(boxX + 24, Math.min(boxX + 356, labelPos.x));

              return (
                <g
                  className="pointer-events-none"
                  role="status"
                  aria-label="Warning: Might be a bit late to have dinner here as I end my exam at 7pm"
                >
                  <polygon
                    points={`${pointerX - 8},${pointerBaseY} ${pointerX + 8},${pointerBaseY} ${labelPos.x},${pointerTipY}`}
                    fill="#1b1218"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                  />
                  <rect
                    x={boxX}
                    y={boxY}
                    width="380"
                    height="48"
                    rx="12"
                    fill="#1b1218"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                  />
                  <text
                    x={clampedX}
                    y={boxY + 19}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="10.5"
                    fontWeight="800"
                    letterSpacing="0.8"
                  >
                    ⚠️ HEADS UP · EXAM ENDS AT 7:00 PM
                  </text>
                  <text
                    x={clampedX}
                    y={boxY + 36}
                    textAnchor="middle"
                    fill="#fef3c7"
                    fontSize="11"
                    fontWeight="600"
                  >
                    Warning: Might be a bit late for dinner here since my exam ends at 7pm!
                  </text>
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Bottom Area: Mobile Yellow Warning + Glassmorphic Neighbourhood Bar */}
      <div className="relative z-10 flex flex-col gap-2 shrink-0">
        {/* Mobile-Only Yellow Warning Banner */}
        <div data-mini-floor className="sm:hidden rounded-xl bg-amber-500/15 border border-amber-400/45 px-3.5 py-2.5 text-xs font-semibold text-amber-200 text-center leading-relaxed shadow-lg">
          ⚠️ <span className="font-bold text-amber-300">Heads up:</span> NUS is in West Singapore (exam ends at 7:00 PM) — we might have a late dinner if it is at another region!
        </div>

        <div data-mini-floor className="hidden sm:flex rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 py-2.5 px-4 sm:px-5 sm:flex-row sm:items-center justify-between gap-3 shrink-0 h-[80px] overflow-clip">
          {hoveredRegion && hoveredMeta ? (
            <>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 min-w-0 overflow-clip whitespace-nowrap">
                  <span className="inline-block px-2.5 sm:px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-rose-500 text-white shrink-0">
                    {hoveredRegion.toUpperCase()}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-rose-200 truncate">
                    {hoveredMeta.subtitle}
                  </span>
                  {hoveredRegion !== 'west' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 px-2.5 sm:px-3 py-0.5 text-[11px] sm:text-xs font-bold text-amber-200 shrink-0">
                      <span className="lg:hidden">⚠️ Exam ends 7pm at NUS · Might be late!</span>
                      <span className="hidden lg:inline">
                        ⚠️ Warning: Might be a bit late to have dinner here as I end my exam at 7pm
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 sm:px-3 py-0.5 text-[11px] sm:text-xs font-bold text-emerald-200 shrink-0">
                      <span className="lg:hidden">✅ Right near NUS · Great after 7pm exam!</span>
                      <span className="hidden lg:inline">
                        ✅ Right near NUS · Perfect timing after my 7pm exam!
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-rose-100/85 truncate">
                  <strong className="text-white">{hoveredMeta.name}</strong> · {hoveredMeta.tagline}
                </p>
              </div>

              <div className="hidden xl:block text-xs sm:text-sm font-semibold text-rose-200/90 shrink-0 whitespace-nowrap">
                Tap or click to view {restaurantCounts[hoveredRegion]} vegetarian restaurant{restaurantCounts[hoveredRegion] === 1 ? '' : 's'} →
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center text-xs sm:text-sm font-medium text-rose-100/90 text-center">
              Tap or hover over North, South, East, West, or Central on the Singapore map to view its vegetarian restaurants
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
