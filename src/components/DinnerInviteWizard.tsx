'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MailCheck,
  MapPin,
  MessageSquare,
  Send,
  UtensilsCrossed,
} from 'lucide-react';
import {
  REGIONS,
  getRestaurantsByRegion,
  type RegionId,
  type Restaurant,
  type RestaurantId,
} from '@/lib/restaurants';
import { DINNER_SCHEDULE, buildHostGoogleCalendarUrl } from '@/lib/calendar';
import { MINI_STAGE_CLEARANCE_PX } from '@/lib/mini-companion';
import { SingaporeMap } from './SingaporeMap';
import { GoogleMapsRestaurantCard } from './GoogleMapsRestaurantCard';
import { AddToCalendarMenu } from './AddToCalendarMenu';
import { MiniCompanion } from './MiniCompanion';
import { CheerFatCat } from './CheerFatCat';

/** Scrollable steps leave room at the bottom for Mini and the dinner table. */
const STAGE_CLEARANCE_STYLE: React.CSSProperties = {
  paddingBottom: MINI_STAGE_CLEARANCE_PX + 16,
};

export type WizardState =
  | { readonly kind: 'region'; readonly region: RegionId }
  | {
      readonly kind: 'restaurant';
      readonly region: RegionId;
      readonly restaurantId: RestaurantId;
    }
  | {
      readonly kind: 'comment';
      readonly region: RegionId;
      readonly restaurantId: RestaurantId;
    }
  | {
      readonly kind: 'thank-you';
      readonly region: RegionId;
      readonly restaurant: Restaurant;
      readonly comment: string;
      readonly guestName: string;
      readonly deliveryStatus: string;
      readonly smtpWarning?: string;
      readonly formSubmitInfo?: string;
      readonly timestampSGT: string;
    };

type TransitionDirection = 'forward' | 'backward';

interface ViewTransitionDocument {
  startViewTransition?: (
    callbackOrOptions:
      | (() => void)
      | {
          update: () => void;
          types?: string[];
        }
  ) => unknown;
}

function navigateWithTransition(
  updateDOM: () => void,
  direction: TransitionDirection
): void {
  if (typeof document === 'undefined') {
    updateDOM();
    return;
  }
  const doc = document as unknown as ViewTransitionDocument;
  if (typeof doc.startViewTransition === 'function') {
    try {
      doc.startViewTransition({
        update: updateDOM,
        types: [direction],
      });
      return;
    } catch {
      try {
        doc.startViewTransition(updateDOM);
        return;
      } catch {
        updateDOM();
        return;
      }
    }
  }
  updateDOM();
}

export function DinnerInviteWizard() {
  const [wizardState, setWizardState] = useState<WizardState>({
    kind: 'region',
    region: 'west',
  });

  const [selectedByRegion, setSelectedByRegion] = useState<
    Partial<Record<RegionId, RestaurantId>>
  >({
    west: getRestaurantsByRegion('west')[0].id,
  });
  const [commentDraft, setCommentDraft] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');

  const [commentError, setCommentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCutePopup, setShowCutePopup] = useState<boolean>(true);

  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [wizardState.kind]);

  useEffect(() => {
    if (wizardState.kind !== 'thank-you') return;
    setShowCutePopup(true);

    const catEl = document.getElementById('cute-cat-section');
    let observer: IntersectionObserver | null = null;
    if (catEl && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setShowCutePopup(false);
          }
        },
        { threshold: 0.25 }
      );
      observer.observe(catEl);
    }

    return () => {
      observer?.disconnect();
    };
  }, [wizardState.kind]);

  const resolveRestaurantForRegion = (region: RegionId): Restaurant => {
    const regionList = getRestaurantsByRegion(region);
    const savedId = selectedByRegion[region];
    const matched = regionList.find((r) => r.id === savedId);
    return matched ?? regionList[0];
  };

  const enterRegionRestaurants = (region: RegionId) => {
    const chosen = resolveRestaurantForRegion(region);
    setSelectedByRegion((prev) => ({ ...prev, [region]: chosen.id }));
    navigateWithTransition(() => {
      setWizardState({
        kind: 'restaurant',
        region,
        restaurantId: chosen.id,
      });
    }, 'forward');
  };

  const goBackToMap = (region: RegionId) => {
    navigateWithTransition(() => {
      setWizardState({ kind: 'region', region });
    }, 'backward');
  };

  const pickRestaurantAndAdvance = (region: RegionId, restaurantId: RestaurantId) => {
    setSelectedByRegion((prev) => ({ ...prev, [region]: restaurantId }));
    navigateWithTransition(() => {
      setWizardState({
        kind: 'comment',
        region,
        restaurantId,
      });
    }, 'forward');
  };

  const goBackToRestaurants = (region: RegionId, restaurantId: RestaurantId) => {
    navigateWithTransition(() => {
      setWizardState({
        kind: 'restaurant',
        region,
        restaurantId,
      });
    }, 'backward');
  };

  const validateCommentField = (value: string): string | null => {
    if (value.trim().length > 2000) {
      return 'Please keep your note under 2,000 characters.';
    }
    return null;
  };

  const handleFinalSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    region: RegionId,
    restaurant: Restaurant
  ) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationMessage = validateCommentField(commentDraft);
    if (validationMessage) {
      setCommentError(validationMessage);
      commentTextareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const finalComment =
      commentDraft.trim().length > 0
        ? commentDraft.trim()
        : 'Looking forward to catching up over a great dinner!';
    const finalGuestName =
      guestName.trim().length > 0 ? guestName.trim() : 'Dinner Guest';

    try {
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          restaurantId: restaurant.id,
          comment: finalComment,
          guestName: finalGuestName,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        delivery?: string;
        smtpWarning?: string;
        formSubmitInfo?: string;
        timestampSGT?: string;
      };

      if (!response.ok || !data.ok) {
        setSubmitError(
          data.error ?? 'Could not send your dinner choice right now. Please try again.'
        );
        setIsSubmitting(false);
        return;
      }

      const timestamp = data.timestampSGT ?? 'Confirmed';
      let finalDelivery = data.delivery ?? 'sent';

      if (
        finalDelivery !== 'gmail-smtp' &&
        finalDelivery !== 'resend-api' &&
        finalDelivery !== 'formsubmit-relay'
      ) {
        try {
          const regionMeta = REGIONS[region];
          const clientRelayRes = await fetch(
            'https://formsubmit.co/ajax/zirenyong2004@gmail.com',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                _subject: `🎉 Dinner Confirmed: ${restaurant.name} (${regionMeta.name}) — Vegetarian Dinner Invite`,
                _template: 'box',
                Host: 'Yong Zi Ren',
                From_Guest: finalGuestName,
                Selected_Region: `${regionMeta.name} (${region.toUpperCase()})`,
                Selected_Restaurant: `${restaurant.name} (${restaurant.cuisine})`,
                Address: restaurant.address,
                Google_Maps: restaurant.directionsUrl,
                Add_To_Google_Calendar: buildHostGoogleCalendarUrl({
                  restaurant,
                  comment: finalComment,
                  guestName: finalGuestName,
                }),
                Message_For_Yong_Zi_Ren: finalComment,
                Submitted_At_SGT: timestamp,
              }),
            }
          );
          const clientRelayData = (await clientRelayRes.json()) as {
            success?: string | boolean;
          };
          if (
            clientRelayData.success === 'true' ||
            clientRelayData.success === true
          ) {
            finalDelivery = 'formsubmit-relay';
          }
        } catch {
          // Proceed to confirmation screen even if client relay is blocked by an ad-blocker
        }
      }

      navigateWithTransition(() => {
        setWizardState({
          kind: 'thank-you',
          region,
          restaurant,
          comment: finalComment,
          guestName: finalGuestName,
          deliveryStatus: finalDelivery,
          smtpWarning: data.smtpWarning,
          formSubmitInfo: data.formSubmitInfo,
          timestampSGT: timestamp,
        });
      }, 'forward');
    } catch {
      setSubmitError('Network error while sending your dinner pick. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh w-full bg-[#16101a] text-white overflow-x-hidden">
      {(() => {
        switch (wizardState.kind) {
          case 'region': {
            return (
              <SingaporeMap
                selectedRegion={wizardState.region}
                onEnterRegion={enterRegionRestaurants}
                headingRef={stepHeadingRef}
              />
            );
          }

          case 'restaurant': {
            const { region, restaurantId } = wizardState;
            const regionMeta = REGIONS[region];
            const regionRestaurants = getRestaurantsByRegion(region);
            const selectedRestaurant =
              regionRestaurants.find((r) => r.id === restaurantId) ??
              regionRestaurants[0];

            return (
              <section
                aria-labelledby="restaurant-step-heading"
                style={STAGE_CLEARANCE_STYLE}
                className="min-h-dvh w-full bg-gradient-to-br from-[#19121d] via-[#231729] to-[#1a1321] p-4 sm:p-6 flex flex-col justify-between gap-4"
              >
                {/* Top bar: back button, centered title (wraps instead of colliding), mirror spacer */}
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2 lg:gap-4 pb-3 border-b border-white/10 min-h-[56px]">
                  <div className="w-full lg:w-auto flex items-center justify-start lg:justify-self-start">
                    <button
                      type="button"
                      enterKeyHint="previous"
                      onClick={() => goBackToMap(region)}
                      className="touch-target inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-rose-100 font-bold px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ArrowLeft className="w-4 h-4 text-rose-300 shrink-0" />
                      <span>Back to Singapore Map</span>
                    </button>
                  </div>

                  <div className="text-center min-w-0 max-w-full px-1">
                    <h1
                      id="restaurant-step-heading"
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-base sm:text-xl md:text-2xl font-extrabold text-white tracking-tight text-balance focus:outline-none"
                    >
                      3 Vegetarian Restaurants in {regionMeta.name}
                    </h1>
                    <p className="text-[11px] sm:text-xs text-rose-200/85 mt-0.5">
                      Select a restaurant below
                    </p>
                    {region !== 'west' && (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/45 px-3 py-0.5 text-[11px] font-semibold text-amber-200">
                        ⚠️ Warning: Might be a bit late for dinner here since my exam ends at 7pm!
                      </p>
                    )}
                  </div>
                  <div aria-hidden="true" className="hidden lg:block" />
                </div>

                {/* 3-Column Grid of GoogleMapsRestaurantCards */}
                <fieldset className="border-0 p-0 m-0 flex-1 flex items-stretch">
                  <legend className="visually-hidden">
                    Select one of the 3 vegetarian restaurants in {regionMeta.name}
                  </legend>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-4 w-full pt-2">
                    {regionRestaurants.map((restaurant) => {
                      const isSelected = selectedRestaurant.id === restaurant.id;
                      const radioId = `restaurant-radio-${restaurant.id}`;
                      return (
                        <div
                          key={restaurant.id}
                          className={`relative flex flex-col ${
                            restaurant.hostWantsToTry
                              ? 'order-first lg:order-none'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            id={radioId}
                            name="restaurantId"
                            value={restaurant.id}
                            checked={isSelected}
                            onChange={() =>
                              pickRestaurantAndAdvance(region, restaurant.id)
                            }
                            className="visually-hidden"
                          />
                          <GoogleMapsRestaurantCard
                            restaurant={restaurant}
                            isSelected={isSelected}
                            onPickRestaurant={() =>
                              pickRestaurantAndAdvance(region, restaurant.id)
                            }
                            radioInputId={radioId}
                          />
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              </section>
            );
          }

          case 'comment': {
            const { region, restaurantId } = wizardState;
            const regionMeta = REGIONS[region];
            const regionRestaurants = getRestaurantsByRegion(region);
            const selectedRestaurant =
              regionRestaurants.find((r) => r.id === restaurantId) ??
              regionRestaurants[0];

            return (
              <section
                aria-labelledby="comment-step-heading"
                style={STAGE_CLEARANCE_STYLE}
                className="min-h-dvh w-full bg-gradient-to-br from-[#19121d] via-[#231729] to-[#1a1321] p-4 sm:p-6 flex items-center justify-center"
              >
                <form
                  method="POST"
                  action="/api/send-invite"
                  onSubmit={(e) => handleFinalSubmit(e, region, selectedRestaurant)}
                  className="max-w-2xl w-full rounded-3xl bg-[#221824]/95 border border-rose-400/30 p-5 sm:p-7 shadow-2xl space-y-5"
                  noValidate
                >
                  <input type="hidden" name="region" value={region} />
                  <input
                    type="hidden"
                    name="restaurantId"
                    value={selectedRestaurant.id}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <button
                      type="button"
                      enterKeyHint="previous"
                      onClick={() =>
                        goBackToRestaurants(region, selectedRestaurant.id)
                      }
                      className="touch-target inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-rose-100 font-bold px-4 py-1.5 text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-rose-300" />
                      <span>Back to Restaurants</span>
                    </button>

                    <div className="inline-flex items-center gap-1.5 rounded-2xl sm:rounded-full bg-rose-500/20 border border-rose-400/30 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-rose-200 max-w-full">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="break-words">
                        {selectedRestaurant.name} · {selectedRestaurant.cuisine} ({regionMeta.name})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h1
                      id="comment-step-heading"
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-xl sm:text-2xl font-extrabold text-white tracking-tight focus:outline-none"
                    >
                      Anything You Want to Say?
                    </h1>
                    <p className="text-xs sm:text-sm text-rose-200/85">
                      Your restaurant choice and comments will be sent to{' '}
                      <strong className="text-white">Yong Zi Ren</strong>.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="guest-name-input"
                      className="block text-xs sm:text-sm font-bold text-rose-100 mb-1.5"
                    >
                      Your Name (Optional)
                    </label>
                    <input
                      id="guest-name-input"
                      name="guestName"
                      type="text"
                      autoComplete="given-name"
                      enterKeyHint="next"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Enter your name"
                      className="touch-target w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-rose-200/40 focus:border-rose-400 focus:outline-none"
                    />
                  </div>

                  {/* Comment Textarea */}
                  <div>
                    <label
                      htmlFor="dinner-comment"
                      className="block text-xs sm:text-sm font-bold text-rose-100 mb-1.5 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4 text-rose-400" />
                      Comments or Special Requests
                    </label>
                    <textarea
                      ref={commentTextareaRef}
                      id="dinner-comment"
                      name="comment"
                      rows={4}
                      maxLength={2000}
                      value={commentDraft}
                      onChange={(e) => {
                        setCommentDraft(e.target.value);
                        if (commentError) {
                          setCommentError(null);
                        }
                      }}
                      onBlur={(e) => {
                        const msg = validateCommentField(e.target.value);
                        setCommentError(msg);
                      }}
                      aria-invalid={commentError ? 'true' : 'false'}
                      aria-describedby={commentError ? 'dinner-comment-error' : undefined}
                      placeholder="Write anything you want to say — dish cravings, dietary notes, or preferred timing!"
                      className="touch-target w-full rounded-2xl border border-white/15 bg-black/30 p-3.5 text-white placeholder:text-rose-200/40 focus:border-rose-400 focus:outline-none"
                    />

                    {commentError && (
                      <p
                        id="dinner-comment-error"
                        role="alert"
                        className="mt-1.5 text-xs font-semibold text-rose-400"
                      >
                        {commentError}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      className="rounded-2xl bg-rose-950/80 border border-rose-500/50 p-3.5 text-xs sm:text-sm font-semibold text-rose-200"
                    >
                      {submitError}
                    </div>
                  )}

                  {/* Bottom Row: Back & Send Dinner Choice */}
                  <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      enterKeyHint="previous"
                      onClick={() =>
                        goBackToRestaurants(region, selectedRestaurant.id)
                      }
                      className="touch-target w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 text-rose-100 font-bold px-5 py-3 text-sm transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      enterKeyHint="send"
                      className="touch-target w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-60 text-white font-extrabold px-8 py-3.5 shadow-xl shadow-rose-500/30 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending Dinner Choice…</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Dinner Choice</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>
            );
          }

          case 'thank-you': {
            const {
              region,
              restaurant,
              comment,
              guestName: confirmedName,
              deliveryStatus,
              smtpWarning,
              timestampSGT,
            } = wizardState;
            const regionMeta = REGIONS[region];

            return (
              <section
                aria-labelledby="thank-you-heading"
                style={STAGE_CLEARANCE_STYLE}
                className="min-h-dvh w-full overflow-x-hidden bg-gradient-to-br from-[#19121d] via-[#231729] to-[#1a1321] p-2.5 sm:p-5 flex items-center justify-center"
              >
                <div
                  style={{ maxWidth: '1400px' }}
                  className="w-full rounded-[24px] sm:rounded-[32px] bg-[#221824] border-2 border-rose-400/40 shadow-[0_24px_60px_rgba(225,29,72,0.28)] overflow-hidden flex flex-col"
                >
                  <div className="relative bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 px-4 sm:px-6 py-3.5 sm:py-4 text-center text-white overflow-hidden shrink-0">
                    <h1
                      id="thank-you-heading"
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-xl sm:text-4xl font-extrabold tracking-tight focus:outline-none"
                    >
                      Awesome, Dinner is Set! 🎉
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-rose-100 max-w-xl mx-auto">
                      Thank you! Your restaurant pick and message have been sent to{' '}
                      <span className="font-bold text-white">Yong Zi Ren</span>.
                    </p>
                  </div>

                  {/* Mobile-Only Floating Pop-Up Toast at Bottom of Screen */}
                  {showCutePopup && (
                    <div
                      style={{ bottom: MINI_STAGE_CLEARANCE_PX + 40 }}
                      className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto motion-safe:animate-bounce"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowCutePopup(false);
                          document
                            .getElementById('cute-cat-section')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-[#231728] px-4 py-2 text-xs font-extrabold shadow-[0_12px_30px_rgba(0,0,0,0.75)] border-2 border-white inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <span>🐾 Psst… something cute lies below!</span>
                        <span className="rounded-full bg-[#231728] text-amber-300 px-2 py-0.5 text-[10px] font-black shrink-0">
                          Tap ↓
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="p-3.5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch flex-1">
                    {/* Left Half (50%): Confirmed Dinner & Message Details */}
                    <div className="flex flex-col justify-between space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-950/60 border border-emerald-400/30 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-emerald-200">
                        <span className="inline-flex items-center gap-2 font-bold">
                          <MailCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          Sent to Yong Zi Ren
                        </span>
                        <span className="text-emerald-300 font-medium">{timestampSGT}</span>
                      </div>

                      <div className="grid grid-cols-1 grid-rows-[auto_minmax(240px,1fr)] lg:grid-cols-[1.22fr_0.78fr] lg:grid-rows-1 gap-4 rounded-3xl bg-[#18121a] text-white p-4 sm:p-5 border border-white/10 flex-1">
                        <div className="flex flex-col gap-3">
                          <div>
                            <span className="inline-block rounded-full bg-rose-500 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                              {regionMeta.name} ({region.toUpperCase()})
                            </span>
                            <h2 className="mt-2 text-xl sm:text-3xl font-extrabold text-white leading-tight">
                              {restaurant.name}{' '}
                              {restaurant.chineseName && (
                                <span className="font-normal text-rose-200">
                                  {restaurant.chineseName}
                                </span>
                              )}
                            </h2>
                            <p className="text-xs sm:text-sm text-amber-300 font-semibold mt-1">
                              ★ {restaurant.rating} ({restaurant.reviewCount} reviews) ·{' '}
                              {restaurant.priceRange} · {restaurant.cuisine}
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs sm:text-sm text-rose-100">
                            <div>
                              <strong>🗓️ When:</strong> {DINNER_SCHEDULE.dateLabel} ·{' '}
                              {DINNER_SCHEDULE.timeLabel}
                            </div>
                            <div>
                              <strong>📍 Address:</strong> {restaurant.address}
                            </div>
                            <div>
                              <strong>🕒 Hours:</strong> {restaurant.hours}
                            </div>
                            <div>
                              <strong>📞 Phone:</strong> {restaurant.phone}
                            </div>
                            <div className="pt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <a
                                href={restaurant.directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs leading-4 whitespace-nowrap transition-colors shrink-0"
                              >
                                <span>Open in Google Maps</span>
                                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                              </a>

                              <AddToCalendarMenu
                                restaurant={restaurant}
                                comment={comment}
                                guestName={confirmedName}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-white/15 min-h-[240px] h-full bg-black">
                          <iframe
                            title={`Confirmed Dinner Location: ${restaurant.name}`}
                            src={restaurant.mapEmbedUrl}
                            width="100%"
                            height="100%"
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            className="w-full h-full min-h-[240px] border-0 pointer-events-auto"
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/5 border border-rose-400/25 p-4 sm:p-5 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                          <span className="flex items-center gap-1.5">
                            <UtensilsCrossed className="w-3.5 h-3.5" /> Your Message for Yong Zi Ren
                          </span>
                          <span>From: {confirmedName}</span>
                        </div>
                        <blockquote className="text-base sm:text-xl font-semibold text-white italic">
                          “{comment}”
                        </blockquote>
                      </div>
                    </div>

                    {/* Right half: squishy mochi calico cat cheering for the exam */}
                    <CheerFatCat restaurantName={restaurant.name} />
                  </div>
                </div>
              </section>
            );
          }

          default: {
            const _exhaustive: never = wizardState;
            return _exhaustive;
          }
        }
      })()}
      <MiniCompanion step={wizardState.kind} guestName={guestName} />
    </main>
  );
}
