'use client';

import React, { useState } from 'react';
import { REGIONS, REGION_ORDER, type RegionId } from '@/lib/restaurants';

interface SingaporeMapProps {
  readonly selectedRegion?: RegionId;
  readonly onEnterRegion: (region: RegionId) => void;
  readonly headingRef?: React.RefObject<HTMLHeadingElement | null>;
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
    stroke: '#f43f5e',
  },
  north: {
    path: 'M 255 135 L 330 82 L 430 68 L 520 92 L 548 148 L 490 185 L 390 185 L 315 165 Z',
    labelPos: { x: 415, y: 128 },
    fillActive: 'url(#grad-north-active)',
    fillIdle: 'url(#grad-north-idle)',
    stroke: '#8b5cf6',
  },
  central: {
    path: 'M 315 165 L 390 185 L 490 185 L 515 245 L 485 310 L 425 322 L 355 305 L 315 305 L 332 230 Z',
    labelPos: { x: 418, y: 248 },
    fillActive: 'url(#grad-central-active)',
    fillIdle: 'url(#grad-central-idle)',
    stroke: '#ec4899',
  },
  east: {
    path: 'M 548 148 L 625 142 L 718 175 L 758 225 L 725 280 L 620 298 L 485 310 L 515 245 L 490 185 Z',
    labelPos: { x: 618, y: 228 },
    fillActive: 'url(#grad-east-active)',
    fillIdle: 'url(#grad-east-idle)',
    stroke: '#d946ef',
  },
  south: {
    path: 'M 250 328 L 315 305 L 355 305 L 425 322 L 485 310 L 465 365 L 385 388 L 285 372 Z',
    labelPos: { x: 378, y: 348 },
    fillActive: 'url(#grad-south-active)',
    fillIdle: 'url(#grad-south-idle)',
    stroke: '#e11d48',
  },
};

export function SingaporeMap({
  onEnterRegion,
  headingRef,
}: SingaporeMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);
  const hoveredMeta = hoveredRegion ? REGIONS[hoveredRegion] : null;

  return (
    <div className="min-h-dvh w-full overflow-x-hidden p-3.5 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-[#19121d] via-[#231729] to-[#1a1321] text-white select-none">
      {/* Top Map Status Bar */}
      <div className="flex items-center justify-between gap-3 pb-2.5 sm:pb-3 border-b border-white/10 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-400 shadow-[0_0_12px_#fb7185] shrink-0" />
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
      <div className="relative flex-1 w-full max-h-[70dvh] sm:max-h-[72dvh] flex items-center justify-center my-2 min-h-[260px]">
        <svg
          viewBox="55 25 715 400"
          role="img"
          aria-label="Interactive map of Singapore divided into North, South, East, West, and Central regions"
          className="w-full h-full max-h-full select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="grad-west-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-north-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-central-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-east-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#a21caf" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="grad-south-active" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.96" />
            </linearGradient>

            <linearGradient id="grad-west-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b2535" stopOpacity="0.84" />
              <stop offset="100%" stopColor="#2a1a26" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-north-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#332640" stopOpacity="0.84" />
              <stop offset="100%" stopColor="#241b30" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-central-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#42263a" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#2e1a29" stopOpacity="0.92" />
            </linearGradient>
            <linearGradient id="grad-east-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d243f" stopOpacity="0.84" />
              <stop offset="100%" stopColor="#29182b" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-south-idle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#472333" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#311723" stopOpacity="0.92" />
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
            fill="rgba(244, 114, 182, 0.35)"
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
            fill="rgba(244, 114, 182, 0.35)"
            fontSize="11"
            fontWeight="600"
            letterSpacing="3"
          >
            SINGAPORE STRAIT
          </text>

          {/* Pulau Ubin */}
          <path
            d="M 615 110 L 655 104 L 668 118 L 635 125 Z"
            fill="#2d1e2f"
            stroke="rgba(236,72,153,0.3)"
            strokeWidth="1.2"
          />
          <text x="642" y="98" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9">
            Pulau Ubin
          </text>

          {/* Sentosa Island */}
          <path
            d="M 358 392 L 408 388 L 418 403 L 368 406 Z"
            fill={hoveredRegion === 'south' ? '#fb7185' : '#3b2231'}
            stroke="#fb7185"
            strokeWidth="1.4"
            className="cursor-pointer transition-colors"
            onMouseEnter={() => setHoveredRegion('south')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onEnterRegion('south')}
          />
          <text x="390" y="420" textAnchor="middle" fill="rgba(253, 164, 175, 0.7)" fontSize="9.5">
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
                  stroke={isHighlighted ? '#ffffff' : shape.stroke}
                  strokeWidth={isHighlighted ? 3.2 : 1.8}
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {isHighlighted && (
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
                    fill={isHighlighted ? '#ffffff' : shape.stroke}
                    stroke={isHighlighted ? shape.stroke : '#ffffff'}
                    strokeWidth="2.5"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontSize={isHighlighted ? '13' : '10'}
                    fill={isHighlighted ? shape.stroke : '#ffffff'}
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
                  3 Veg Spots
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
      <div className="flex flex-col gap-2.5 shrink-0">
        {/* Mobile-Only Yellow Warning Banner */}
        <div className="sm:hidden rounded-xl bg-amber-500/15 border border-amber-400/45 px-3.5 py-2.5 text-xs font-semibold text-amber-200 text-center leading-relaxed shadow-lg">
          ⚠️ <span className="font-bold text-amber-300">Heads up:</span> NUS is in West Singapore (exam ends at 7:00 PM) — we might have a late dinner if it is at another region!
        </div>

        {/* Bottom Sleek Glassmorphic Neighbourhood Bar (Desktop / Tablet) */}
        <div className="hidden sm:flex rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-3.5 sm:px-5 py-3 sm:py-3.5 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 min-h-[60px] sm:min-h-[68px]">
        {hoveredRegion && hoveredMeta ? (
          <>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block px-2.5 sm:px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-rose-500 text-white">
                  {hoveredRegion.toUpperCase()}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-rose-200">
                  {hoveredMeta.subtitle}
                </span>
                {hoveredRegion !== 'west' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-full bg-amber-500/20 border border-amber-400/50 px-2.5 sm:px-3 py-0.5 text-[11px] sm:text-xs font-bold text-amber-200">
                    ⚠️ Warning: Might be a bit late to have dinner here as I end my exam at 7pm
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 sm:px-3 py-0.5 text-[11px] sm:text-xs font-bold text-emerald-200">
                    ✅ Right near NUS · Perfect timing after my 7pm exam!
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-rose-100/85">
                <strong className="text-white">{hoveredMeta.name}</strong> · {hoveredMeta.tagline}
              </p>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-rose-200/90 shrink-0">
              Tap or click to view 3 vegetarian restaurants →
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-center text-xs sm:text-sm font-medium text-rose-100/90 text-center">
            Tap or hover over North, South, East, West, or Central on the Singapore map to view 3 vegetarian restaurants
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
