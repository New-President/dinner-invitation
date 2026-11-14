'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarPlus, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Restaurant } from '@/lib/restaurants';
import {
  DINNER_SCHEDULE,
  buildCalendarTargets,
  type CalendarProviderId,
} from '@/lib/calendar';

declare module 'react' {
  interface HTMLAttributes<T> {
    focusgroup?: string | undefined;
  }

  interface ButtonHTMLAttributes<T> {
    commandfor?: string | undefined;
    command?:
      | 'toggle-popover'
      | 'show-popover'
      | 'hide-popover'
      | 'show-modal'
      | 'close'
      | `--${string}`
      | undefined;
  }
}

declare global {
  interface FocusOptions {
    focusVisible?: boolean;
  }

  interface ShowPopoverOptions {
    source?: HTMLElement;
  }

  interface HTMLElement {
    showPopover(options?: ShowPopoverOptions): void;
  }
}

export interface AddToCalendarMenuProps {
  readonly restaurant: Restaurant;
  readonly comment: string;
  readonly guestName?: string;
  readonly className?: string;
}

function CalendarProviderBadge({
  providerId,
}: {
  readonly providerId: CalendarProviderId;
}) {
  switch (providerId) {
    case 'google': {
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#ffffff" />
          <path
            d="M7 2h10a5 5 0 0 1 5 5v3H2V7a5 5 0 0 1 5-5Z"
            fill="#4285F4"
          />
          <path d="M2 10h4v7H2v-7Z" fill="#FBBC04" />
          <path d="M18 10h4v7h-4v-7Z" fill="#34A853" />
          <path
            d="M2 17h20a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5Z"
            fill="#EA4335"
          />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fill="#1f2937"
            fontSize="8.5"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            30
          </text>
        </svg>
      );
    }

    case 'apple': {
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#ffffff" />
          <path
            d="M7 2h10a5 5 0 0 1 5 5v2.5H2V7a5 5 0 0 1 5-5Z"
            fill="#FF3B30"
          />
          <text
            x="12"
            y="7.8"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="4.6"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            NOV
          </text>
          <text
            x="12"
            y="18.2"
            textAnchor="middle"
            fill="#111827"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            30
          </text>
        </svg>
      );
    }

    case 'outlook-office': {
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0078D4" />
          <rect
            x="10"
            y="5.5"
            width="9.5"
            height="13"
            rx="1.8"
            fill="#50E6FF"
            opacity="0.92"
          />
          <path
            d="M10 9.5h9.5M10 13.5h9.5M14.75 9.5v9"
            stroke="#005A9E"
            strokeWidth="1.1"
          />
          <rect
            x="4"
            y="7"
            width="9"
            height="10"
            rx="2"
            fill="#005A9E"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <text
            x="8.5"
            y="14.6"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7.2"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            O
          </text>
        </svg>
      );
    }

    case 'outlook-live': {
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#106EBE" />
          <path
            d="M5.5 8.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17v-7a1.5 1.5 0 0 1 1.5-1.5Z"
            fill="#28A8EA"
          />
          <path
            d="M4.5 9.2 12 14.2l7.5-5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17.5" cy="7" r="2.5" fill="#FBBF24" />
        </svg>
      );
    }

    case 'yahoo': {
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#6001D2" />
          <text
            x="12"
            y="16.4"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Y!
          </text>
        </svg>
      );
    }

    default: {
      const _exhaustive: never = providerId;
      return _exhaustive;
    }
  }
}

function getEnabledMenuAnchors(groupEl: HTMLElement): HTMLAnchorElement[] {
  const result: HTMLAnchorElement[] = [];
  for (const node of groupEl.querySelectorAll('a[href]')) {
    if (
      node instanceof HTMLAnchorElement &&
      node.closest('[focusgroup]') === groupEl &&
      node.getAttribute('aria-disabled') !== 'true'
    ) {
      result.push(node);
    }
  }
  return result;
}

function isPopoverCurrentlyOpen(menuEl: HTMLElement): boolean {
  try {
    if (menuEl.matches(':popover-open')) {
      return true;
    }
  } catch {
    // Engine predates :popover-open selector
  }
  return (
    menuEl.classList.contains(':popover-open') ||
    menuEl.dataset.fallbackOpen === 'true'
  );
}

function supportsCssAnchorPositioning(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-area: block-end')
  );
}

function positionMenuFallback(
  triggerEl: HTMLElement,
  menuEl: HTMLElement
): void {
  if (supportsCssAnchorPositioning()) {
    return;
  }

  const triggerRect = triggerEl.getBoundingClientRect();
  const menuRect = menuEl.getBoundingClientRect();
  const margin = 12;
  const gap = 8;

  let top = triggerRect.bottom + gap;
  if (top + menuRect.height > window.innerHeight - margin) {
    const flippedTop = triggerRect.top - gap - menuRect.height;
    top =
      flippedTop >= margin
        ? flippedTop
        : Math.max(margin, window.innerHeight - menuRect.height - margin);
  }

  const maxLeft = Math.max(margin, window.innerWidth - menuRect.width - margin);
  const left = Math.min(Math.max(margin, triggerRect.left), maxLeft);

  menuEl.style.top = `${Math.round(top)}px`;
  menuEl.style.left = `${Math.round(left)}px`;
}

export function AddToCalendarMenu({
  restaurant,
  comment,
  guestName,
  className,
}: AddToCalendarMenuProps) {
  const reactId = useId();
  const triggerId = `${reactId}-calendar-trigger`;
  const menuId = `${reactId}-calendar-menu`;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const focusGroupRef = useRef<HTMLDivElement | null>(null);
  const pointerPressedRef = useRef<boolean>(false);
  const enterOnOpenRef = useRef<boolean>(false);
  const manualFallbackOpenRef = useRef<boolean>(false);

  const targets = useMemo(
    () => buildCalendarTargets({ restaurant, comment, guestName }),
    [restaurant, comment, guestName]
  );

  const hideMenuElement = (menuEl: HTMLElement) => {
    if (
      typeof menuEl.hidePopover === 'function' &&
      !manualFallbackOpenRef.current
    ) {
      try {
        menuEl.hidePopover();
      } catch {
        // Already closed
      }
      return;
    }

    manualFallbackOpenRef.current = false;
    delete menuEl.dataset.fallbackOpen;
    menuEl.classList.remove(':popover-open');
    setIsOpen(false);
  };

  const closeAndRestore = ({ fromPointer }: { readonly fromPointer: boolean }) => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!menuEl || !isPopoverCurrentlyOpen(menuEl)) {
      return;
    }

    if (triggerEl) {
      if (fromPointer) {
        triggerEl.focus({ preventScroll: true, focusVisible: false });
      } else {
        triggerEl.focus({ preventScroll: true });
      }
    }

    hideMenuElement(menuEl);
  };

  useEffect(() => {
    const groupEl = focusGroupRef.current;
    if (!groupEl) {
      return;
    }

    const hasNativeFocusGroup =
      typeof HTMLElement !== 'undefined' &&
      'focusGroup' in HTMLElement.prototype;

    if (!hasNativeFocusGroup) {
      groupEl.setAttribute('role', 'menu');
      for (const anchor of groupEl.querySelectorAll('a[href]:not([role])')) {
        anchor.setAttribute('role', 'menuitem');
      }
    }
  }, [targets]);

  useEffect(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    const groupEl = focusGroupRef.current;
    if (!triggerEl || !menuEl || !groupEl) {
      return;
    }

    const hasNativeFocusGroup =
      typeof HTMLElement !== 'undefined' &&
      'focusGroup' in HTMLElement.prototype;

    const applyOpenFocusAndPosition = () => {
      positionMenuFallback(triggerEl, menuEl);
      const wasPointer = pointerPressedRef.current;
      const shouldEnter = enterOnOpenRef.current;
      pointerPressedRef.current = false;
      enterOnOpenRef.current = false;

      if (shouldEnter && !wasPointer) {
        const items = getEnabledMenuAnchors(groupEl);
        items[0]?.focus({ preventScroll: true });
      } else if (wasPointer) {
        triggerEl.focus({ preventScroll: true, focusVisible: false });
      }
    };

    const handleToggle = () => {
      const nowOpen = isPopoverCurrentlyOpen(menuEl);
      setIsOpen(nowOpen);
      if (nowOpen) {
        applyOpenFocusAndPosition();
      } else {
        pointerPressedRef.current = false;
        enterOnOpenRef.current = false;
      }
    };

    const handleGroupKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeAndRestore({ fromPointer: false });
        return;
      }

      if (event.key === 'Tab') {
        closeAndRestore({ fromPointer: false });
        return;
      }

      const handledNavKeys = hasNativeFocusGroup
        ? ['Home', 'End']
        : ['ArrowDown', 'ArrowUp', 'Home', 'End'];

      if (!handledNavKeys.includes(event.key)) {
        return;
      }

      const items = getEnabledMenuAnchors(groupEl);
      if (items.length === 0) {
        return;
      }

      const active = document.activeElement;
      const current =
        active instanceof HTMLAnchorElement ? items.indexOf(active) : -1;
      if (current < 0) {
        return;
      }

      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) %
              items.length;

      event.preventDefault();
      event.stopImmediatePropagation();
      items[next]?.focus({ preventScroll: true });
    };

    const handleDocumentFocusIn = (event: FocusEvent) => {
      if (!isPopoverCurrentlyOpen(menuEl)) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Node &&
        !menuEl.contains(target) &&
        !triggerEl.contains(target)
      ) {
        hideMenuElement(menuEl);
      }
    };

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!manualFallbackOpenRef.current || !isPopoverCurrentlyOpen(menuEl)) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Node &&
        !menuEl.contains(target) &&
        !triggerEl.contains(target)
      ) {
        hideMenuElement(menuEl);
      }
    };

    const handleViewportChange = () => {
      if (isPopoverCurrentlyOpen(menuEl)) {
        positionMenuFallback(triggerEl, menuEl);
      }
    };

    menuEl.addEventListener('toggle', handleToggle);
    groupEl.addEventListener('keydown', handleGroupKeyDown, true);
    document.addEventListener('focusin', handleDocumentFocusIn);
    document.addEventListener('pointerdown', handleDocumentPointerDown);
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('scroll', handleViewportChange, {
      passive: true,
      capture: true,
    });

    return () => {
      menuEl.removeEventListener('toggle', handleToggle);
      groupEl.removeEventListener('keydown', handleGroupKeyDown, true);
      document.removeEventListener('focusin', handleDocumentFocusIn);
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, []);

  const handleTriggerPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    pointerPressedRef.current = true;
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    const groupEl = focusGroupRef.current;
    if (!triggerEl || !menuEl || !groupEl) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (isPopoverCurrentlyOpen(menuEl)) {
        const items = getEnabledMenuAnchors(groupEl);
        items[0]?.focus({ preventScroll: true });
      } else {
        pointerPressedRef.current = false;
        enterOnOpenRef.current = true;
        triggerEl.click();
      }
      return;
    }

    if (event.key === 'Escape' && isPopoverCurrentlyOpen(menuEl)) {
      event.preventDefault();
      closeAndRestore({ fromPointer: false });
    }
  };

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    const groupEl = focusGroupRef.current;
    if (!triggerEl || !menuEl || !groupEl) {
      return;
    }

    const isPointerClick = event.detail > 0;
    pointerPressedRef.current = isPointerClick;
    const currentlyOpen = isPopoverCurrentlyOpen(menuEl);

    if (!isPointerClick && !currentlyOpen) {
      enterOnOpenRef.current = true;
    }

    const supportsInvokerCommands =
      typeof HTMLButtonElement !== 'undefined' &&
      'commandForElement' in HTMLButtonElement.prototype;

    if (supportsInvokerCommands) {
      return;
    }

    event.preventDefault();

    if (currentlyOpen) {
      pointerPressedRef.current = false;
      enterOnOpenRef.current = false;
      closeAndRestore({ fromPointer: isPointerClick });
      return;
    }

    if (typeof menuEl.showPopover === 'function') {
      try {
        menuEl.showPopover({ source: triggerEl });
      } catch {
        menuEl.showPopover();
      }
      return;
    }

    manualFallbackOpenRef.current = true;
    menuEl.dataset.fallbackOpen = 'true';
    menuEl.classList.add(':popover-open');
    setIsOpen(true);
    positionMenuFallback(triggerEl, menuEl);

    const shouldEnter = enterOnOpenRef.current;
    pointerPressedRef.current = false;
    enterOnOpenRef.current = false;
    if (shouldEnter && !isPointerClick) {
      const items = getEnabledMenuAnchors(groupEl);
      items[0]?.focus({ preventScroll: true });
    } else if (isPointerClick) {
      triggerEl.focus({ preventScroll: true, focusVisible: false });
    }
  };

  const handleItemPointerMove = (
    event: React.PointerEvent<HTMLAnchorElement>
  ) => {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    if (!hit || !event.currentTarget.contains(hit)) {
      return;
    }
    if (document.activeElement !== event.currentTarget) {
      event.currentTarget.focus({ preventScroll: true, focusVisible: false });
    }
  };

  const handleItemClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const fromPointer = event.detail > 0;
    queueMicrotask(() => {
      closeAndRestore({ fromPointer });
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        commandfor={menuId}
        command="toggle-popover"
        onPointerDown={handleTriggerPointerDown}
        onKeyDown={handleTriggerKeyDown}
        onClick={handleTriggerClick}
        className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 aria-expanded:bg-amber-300 aria-expanded:ring-2 aria-expanded:ring-amber-200/80 text-[#231728] font-extrabold px-2.5 sm:px-3.5 py-2 leading-none whitespace-nowrap transition-colors cursor-pointer shadow-md shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18121a]${className ? ` ${className}` : ''}`}
      >
        <CalendarPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs leading-4">Add to Calendar</span>
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        className="z-50 w-[min(19.25rem,calc(100vw-24px))] max-w-[calc(100vw-24px)]"
      >
        <div
          ref={focusGroupRef}
          focusgroup="menu nomemory"
          aria-labelledby={triggerId}
          className="rounded-2xl bg-[#251a29]/98 backdrop-blur-md border border-amber-300/35 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.72)] text-white"
        >
          <div
            aria-hidden="true"
            className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-amber-200"
          >
            <span>🗓️ {DINNER_SCHEDULE.dateLabel}</span>
            <span className="text-rose-200/90">{DINNER_SCHEDULE.timeLabel}</span>
          </div>

          <hr className="my-1 border-white/10" />

          {targets.map((target) => (
            <a
              key={target.id}
              href={target.href}
              target={target.opensInNewTab ? '_blank' : undefined}
              rel={target.opensInNewTab ? 'noopener noreferrer' : undefined}
              onPointerMove={handleItemPointerMove}
              onClick={handleItemClick}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:bg-amber-400/20 focus-visible:ring-1 focus-visible:ring-amber-300/70"
            >
              <CalendarProviderBadge providerId={target.id} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs sm:text-sm font-bold text-white leading-tight">
                  {target.label}
                </span>
                <span className="block text-[11px] text-rose-200/80 leading-tight mt-0.5">
                  {target.subtitle}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="ms-auto text-rose-200/70 shrink-0"
              >
                {target.opensInNewTab ? (
                  <ExternalLink className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

