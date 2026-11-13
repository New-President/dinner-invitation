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
import { SingaporeMap } from './SingaporeMap';
import { GoogleMapsRestaurantCard } from './GoogleMapsRestaurantCard';

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

const COMMENT_SUGGESTIONS = [
  'Looking forward to catching up over a great dinner!',
  'Excited to try the signature vegetarian dishes here!',
  'Let me know what day and time works best for you!',
] as const;

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
  const [cheerTick, setCheerTick] = useState<number>(0);
  const [showCutePopup, setShowCutePopup] = useState<boolean>(true);

  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cuteCatSectionRef = useRef<HTMLDivElement | null>(null);
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
    const timer = setInterval(() => {
      setCheerTick((t) => (t + 1) % 6);
    }, 520);
    return () => clearInterval(timer);
  }, [wizardState.kind]);

  useEffect(() => {
    if (wizardState.kind !== 'thank-you') return;
    const onScroll = () => {
      if (window.scrollY > 280) {
        setShowCutePopup(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
                className="min-h-dvh w-full bg-gradient-to-br from-[#19121d] via-[#231729] to-[#1a1321] p-4 sm:p-6 flex flex-col justify-between gap-4"
              >
                {/* Top Bar inside Screen 2 with Centered Single-Line Title Heading */}
                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-2 pb-3 border-b border-white/10 min-h-[56px]">
                  <div className="w-full sm:w-auto flex items-center justify-start sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 z-10">
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

                  <div className="text-center mx-auto px-1 sm:px-44 max-w-full">
                    <h1
                      id="restaurant-step-heading"
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-sm sm:text-xl md:text-2xl font-extrabold text-white tracking-tight sm:whitespace-nowrap focus:outline-none"
                    >
                      3 Vegetarian Restaurants in {regionMeta.name}
                    </h1>
                    <p className="text-[11px] sm:text-xs text-rose-200/85 mt-0.5 sm:whitespace-nowrap">
                      Official Google Maps Live View · Select a restaurant below
                    </p>
                    {region !== 'west' && (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/45 px-3 py-0.5 text-[11px] font-semibold text-amber-200">
                        ⚠️ Warning: We might have a late dinner if it is at another region (Exam ends at 7pm)!
                      </p>
                    )}
                  </div>
                </div>

                {/* 3-Column Grid of GoogleMapsRestaurantCards */}
                <fieldset className="border-0 p-0 m-0 flex-1 flex items-stretch">
                  <legend className="visually-hidden">
                    Select one of the 3 vegetarian restaurants in {regionMeta.name}
                  </legend>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
                    {regionRestaurants.map((restaurant) => {
                      const isSelected = selectedRestaurant.id === restaurant.id;
                      const radioId = `restaurant-radio-${restaurant.id}`;
                      return (
                        <div key={restaurant.id} className="relative flex flex-col">
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
                      Any Comments or Anything You Want to Say?
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
                      aria-describedby={
                        commentError ? 'dinner-comment-error' : 'dinner-comment-hint'
                      }
                      placeholder="Write anything you want to say — dish cravings, dietary notes, or preferred timing!"
                      className="touch-target w-full rounded-2xl border border-white/15 bg-black/30 p-3.5 text-white placeholder:text-rose-200/40 focus:border-rose-400 focus:outline-none"
                    />

                    {commentError ? (
                      <p
                        id="dinner-comment-error"
                        role="alert"
                        className="mt-1.5 text-xs font-semibold text-rose-400"
                      >
                        {commentError}
                      </p>
                    ) : (
                      <p
                        id="dinner-comment-hint"
                        className="mt-1.5 text-xs text-rose-200/70"
                      >
                        Tap a quick prompt below or type your own note ({commentDraft.length}/2000):
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {COMMENT_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCommentDraft(suggestion);
                            setCommentError(null);
                          }}
                          className="rounded-full bg-white/10 hover:bg-white/20 text-rose-200 px-3 py-1 text-xs font-medium transition-colors cursor-pointer text-left"
                        >
                          + “{suggestion}”
                        </button>
                      ))}
                    </div>
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
            const cheerMessages = [
              '“Meow!! You’re gonna ACE your exam! Full marks incoming! 🐾💯✨”',
              '“JIAYOU!! Crush that paper until 7pm! You got this!! 🔥🌟”',
              '“100 / 100 A+ ENERGY!! Dinner feast awaits right after! 🎉🥳”',
            ] as const;
            const activeCheerMessage = cheerMessages[Math.floor(cheerTick / 2) % cheerMessages.length];
            const isBeatUp = cheerTick % 2 === 1;

            const scrollToCuteCat = () => {
              setShowCutePopup(false);
              cuteCatSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            };

            return (
              <section
                aria-labelledby="thank-you-heading"
                className="min-h-dvh w-full overflow-x-hidden bg-gradient-to-br from-[#19121d] via-[#231729] to-[#1a1321] p-2.5 sm:p-5 flex items-center justify-center relative"
              >
                {/* Floating Pop-Up Notification Informing User Something Cute Lies Below */}
                {showCutePopup && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-md rounded-2xl bg-gradient-to-r from-[#2c1934] via-[#3b1d3f] to-[#2c1934] border-2 border-amber-400 shadow-[0_16px_45px_rgba(251,191,36,0.45)] p-3.5 text-white flex items-center justify-between gap-3 animate-bounce"
                  >
                    <button
                      type="button"
                      onClick={scrollToCuteCat}
                      className="flex items-center gap-3 text-left flex-1 cursor-pointer focus:outline-none"
                    >
                      <span className="h-10 w-10 rounded-full bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-xl shrink-0">
                        🐱
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-amber-200 whitespace-nowrap">
                          Psst… Something Cute Lies Below! 🐾✨
                        </p>
                        <p className="text-[11px] sm:text-xs text-rose-100/90">
                          Tap here or scroll down for a special surprise ↓
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={scrollToCuteCat}
                        className="rounded-full bg-amber-400 hover:bg-amber-300 text-[#231728] font-extrabold px-3 py-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        See Below ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCutePopup(false)}
                        aria-label="Close cute surprise notification"
                        className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-rose-200 inline-flex items-center justify-center text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-3xl bg-[#18121a] text-white p-4 sm:p-5 border border-white/10 flex-1">
                        <div className="space-y-3 flex flex-col justify-between">
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
                            <p className="mt-2 text-xs sm:text-sm text-[#e2d4da] leading-relaxed">
                              {restaurant.description}
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs sm:text-sm text-rose-100">
                            <div>
                              <strong>📍 Address:</strong> {restaurant.address}
                            </div>
                            <div>
                              <strong>🕒 Hours:</strong> {restaurant.hours}
                            </div>
                            <div>
                              <strong>📞 Phone:</strong> {restaurant.phone}
                            </div>
                            <div className="pt-2">
                              <a
                                href={restaurant.directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold px-4 py-2 text-xs sm:text-sm transition-colors"
                              >
                                <span>Open in Google Maps</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-white/15 min-h-[240px] bg-black">
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

                    {/* Right Half (Full 50% of Page): Huge Animated Fat Cute Cat Cheering for Exam */}
                    <div
                      id="cute-cat-section"
                      ref={cuteCatSectionRef}
                      className="flex flex-col items-center justify-between rounded-3xl bg-gradient-to-b from-[#2e1d36] via-[#24162b] to-[#1a1120] border-2 border-amber-400/45 p-4 sm:p-7 text-center relative overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.15)]"
                    >
                      {/* Animated Speech Bubble */}
                      <div
                        className="relative bg-white text-[#231728] rounded-3xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-base font-extrabold shadow-xl border-2 border-amber-400 max-w-md transition-transform duration-300"
                        style={{
                          transform: isBeatUp ? 'translateY(-6px) scale(1.03)' : 'translateY(0px) scale(1)',
                        }}
                      >
                        <span>{activeCheerMessage}</span>
                        <div className="absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-amber-400 rotate-45" />
                      </div>

                      {/* Huge Multi-Layer Animated Chubby Cat SVG Filling the Right Half */}
                      <div className="my-2 relative flex-1 flex items-center justify-center w-full">
                        <svg
                          viewBox="0 0 320 270"
                          role="img"
                          aria-label="Huge animated fat chubby cat jumping and waving pom-poms to cheer for your exam"
                          style={{ width: '100%', maxWidth: '470px' }}
                          className="h-[260px] sm:h-[355px] mx-auto overflow-visible"
                        >
                          {/* Animated Sunburst Rays Behind Cat */}
                          <g opacity="0.16">
                            <circle cx="160" cy="145" r="118" fill="url(#cat-glow)" />
                            <animateTransform
                              attributeName="transform"
                              type="scale"
                              values="0.95;1.08;0.95"
                              dur="1.1s"
                              repeatCount="indefinite"
                              additive="sum"
                            />
                          </g>
                          <defs>
                            <radialGradient id="cat-glow" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                              <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#1a1120" stopOpacity="0" />
                            </radialGradient>
                          </defs>

                          {/* Floating Confetti, Stars & A+ Badges (SMIL + CSS Animated) */}
                          <g className="animate-confetti-float">
                            <g transform="translate(36, 46)">
                              <circle cx="0" cy="0" r="20" fill="#fbbf24" opacity="0.25" />
                              <circle cx="0" cy="0" r="16" fill="#f59e0b" />
                              <text x="0" y="6" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="900">
                                A+
                              </text>
                              <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="36,48; 36,28; 36,48"
                                dur="0.9s"
                                repeatCount="indefinite"
                              />
                            </g>

                            <g transform="translate(282, 46)">
                              <circle cx="0" cy="0" r="22" fill="#f43f5e" opacity="0.25" />
                              <circle cx="0" cy="0" r="18" fill="#e11d48" />
                              <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                                100%
                              </text>
                              <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="282,30; 282,50; 282,30"
                                dur="0.9s"
                                repeatCount="indefinite"
                              />
                            </g>

                            <text x="26" y="210" textAnchor="middle" fill="#f472b6" fontSize="22">
                              ✨
                              <animate attributeName="y" values="215;192;215" dur="0.8s" repeatCount="indefinite" />
                            </text>
                            <text x="294" y="210" textAnchor="middle" fill="#fbbf24" fontSize="22">
                              🌟
                              <animate attributeName="y" values="192;215;192" dur="0.8s" repeatCount="indefinite" />
                            </text>
                            <text x="72" y="24" textAnchor="middle" fill="#fde68a" fontSize="18">
                              🎉
                              <animate attributeName="y" values="28;12;28" dur="0.7s" repeatCount="indefinite" />
                            </text>
                            <text x="248" y="24" textAnchor="middle" fill="#fda4af" fontSize="18">
                              💖
                              <animate attributeName="y" values="12;28;12" dur="0.7s" repeatCount="indefinite" />
                            </text>
                          </g>

                          {/* Dynamic Pulsing Floor Shadow Under Jumping Fat Cat */}
                          <ellipse cx="160" cy="248" rx="96" ry="14" fill="rgba(0,0,0,0.48)">
                            <animate attributeName="rx" values="98;72;98" dur="0.65s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.55;0.28;0.55" dur="0.65s" repeatCount="indefinite" />
                          </ellipse>

                          {/* Main Jumping & Squishing Fat Chubby Cat Group */}
                          <g className="animate-cat-bounce">
                            <animateTransform
                              attributeName="transform"
                              type="translate"
                              values="0,0; 0,-24; 0,0"
                              dur="0.65s"
                              repeatCount="indefinite"
                            />

                            {/* Wagging Fluffy Tail */}
                            <g className="animate-cat-tail">
                              <path
                                d="M 232 204 C 282 196, 294 148, 268 132 C 250 122, 238 148, 224 176"
                                fill="#f6ad55"
                                stroke="#7b341e"
                                strokeWidth="4.2"
                                strokeLinecap="round"
                              />
                              <circle cx="268" cy="136" r="12" fill="#fffaf0" />
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                values="-18 232 200; 22 232 200; -18 232 200"
                                dur="0.5s"
                                repeatCount="indefinite"
                              />
                            </g>

                            {/* Left Ear (Wiggling) */}
                            <g>
                              <polygon
                                points="92,82 74,26 128,58"
                                fill="#fbd38d"
                                stroke="#7b341e"
                                strokeWidth="4.2"
                                strokeLinejoin="round"
                              />
                              <polygon points="94,74 82,38 118,58" fill="#fbb6ce" />
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                values="-8 100 70; 6 100 70; -8 100 70"
                                dur="0.65s"
                                repeatCount="indefinite"
                              />
                            </g>

                            {/* Right Ear (Wiggling) */}
                            <g>
                              <polygon
                                points="228,82 246,26 192,58"
                                fill="#f6ad55"
                                stroke="#7b341e"
                                strokeWidth="4.2"
                                strokeLinejoin="round"
                              />
                              <polygon points="226,74 238,38 202,58" fill="#fbb6ce" />
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                values="8 220 70; -6 220 70; 8 220 70"
                                dur="0.65s"
                                repeatCount="indefinite"
                              />
                            </g>

                            {/* Ultra-Fat Squishy Chubby Body + Head with Squash & Stretch */}
                            <ellipse
                              cx="160"
                              cy="154"
                              rx="94"
                              ry="84"
                              fill="#fbd38d"
                              stroke="#7b341e"
                              strokeWidth="4.5"
                            >
                              <animate attributeName="rx" values="97;89;97" dur="0.65s" repeatCount="indefinite" />
                              <animate attributeName="ry" values="80;88;80" dur="0.65s" repeatCount="indefinite" />
                            </ellipse>

                            {/* Calico Ginger Patch on Forehead & Side */}
                            <path
                              d="M 178 72 C 222 78, 250 116, 248 154 C 216 150, 198 112, 178 72 Z"
                              fill="#ed8936"
                            />
                            <path
                              d="M 142 71 C 110 76, 82 104, 76 134 C 102 126, 124 98, 142 71 Z"
                              fill="#f6ad55"
                            />

                            {/* Huge Jiggling Cream Belly */}
                            <ellipse
                              cx="160"
                              cy="176"
                              rx="66"
                              ry="56"
                              fill="#fffaf0"
                            >
                              <animate attributeName="rx" values="69;62;69" dur="0.65s" repeatCount="indefinite" />
                              <animate attributeName="ry" values="53;60;53" dur="0.65s" repeatCount="indefinite" />
                            </ellipse>

                            {/* Cute Chubby Belly Fluff Stripes & Belly Button */}
                            <path
                              d="M 142 154 Q 160 163 178 154"
                              fill="none"
                              stroke="#ecc94b"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M 134 172 Q 160 182 186 172"
                              fill="none"
                              stroke="#ecc94b"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                            />
                            <text x="160" y="204" textAnchor="middle" fill="#fbd38d" fontSize="13" fontWeight="900">
                              ×
                            </text>

                            {/* Exam Fighting Headband (Hachimaki) */}
                            <path
                              d="M 80 88 Q 160 68 240 88 L 244 103 Q 160 83 76 103 Z"
                              fill="#e11d48"
                              stroke="#7b341e"
                              strokeWidth="3.2"
                            />
                            <rect
                              x="124"
                              y="74"
                              width="72"
                              height="22"
                              rx="8"
                              fill="#ffffff"
                              stroke="#e11d48"
                              strokeWidth="2.6"
                            />
                            <text
                              x="160"
                              y="89"
                              textAnchor="middle"
                              fill="#e11d48"
                              fontSize="12"
                              fontWeight="900"
                            >
                              ★ FIGHT! ★
                            </text>

                            {/* Big Rosy Chubby Cheeks */}
                            <ellipse cx="102" cy="128" rx="16" ry="10" fill="#f687b3" opacity="0.85">
                              <animate attributeName="rx" values="15;18;15" dur="0.65s" repeatCount="indefinite" />
                            </ellipse>
                            <ellipse cx="218" cy="128" rx="16" ry="10" fill="#f687b3" opacity="0.85">
                              <animate attributeName="rx" values="15;18;15" dur="0.65s" repeatCount="indefinite" />
                            </ellipse>

                            {/* Animated Cheering Eyes (Alternating Happy ^ ^ and Big Sparkling Eyes) */}
                            {isBeatUp ? (
                              <g>
                                <circle cx="124" cy="113" r="9.5" fill="#4a1d0f" />
                                <circle cx="121" cy="109" r="3.5" fill="#ffffff" />
                                <circle cx="127" cy="116" r="1.8" fill="#ffffff" />

                                <circle cx="196" cy="113" r="9.5" fill="#4a1d0f" />
                                <circle cx="193" cy="109" r="3.5" fill="#ffffff" />
                                <circle cx="199" cy="116" r="1.8" fill="#ffffff" />
                              </g>
                            ) : (
                              <g>
                                <path
                                  d="M 110 116 Q 124 100 138 116"
                                  fill="none"
                                  stroke="#5f2715"
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M 182 116 Q 196 100 210 116"
                                  fill="none"
                                  stroke="#5f2715"
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                />
                              </g>
                            )}

                            {/* Cute Pink Nose & Animated Cheering Kitty Mouth */}
                            <polygon points="154,121 166,121 160,129" fill="#ed64a6" />
                            <path
                              d="M 145 131 Q 152 140 160 131 Q 168 140 175 131"
                              fill="none"
                              stroke="#5f2715"
                              strokeWidth="3.8"
                              strokeLinecap="round"
                            />
                            <ellipse
                              cx="160"
                              cy="141"
                              rx="10"
                              ry={isBeatUp ? 11 : 6}
                              fill="#f687b3"
                              stroke="#5f2715"
                              strokeWidth="2.8"
                            >
                              <animate attributeName="ry" values="5;12;5" dur="0.65s" repeatCount="indefinite" />
                            </ellipse>

                            {/* Whiskers */}
                            <line x1="60" y1="120" x2="86" y2="124" stroke="#7b341e" strokeWidth="3" strokeLinecap="round" />
                            <line x1="58" y1="132" x2="84" y2="132" stroke="#7b341e" strokeWidth="3" strokeLinecap="round" />
                            <line x1="260" y1="120" x2="234" y2="124" stroke="#7b341e" strokeWidth="3" strokeLinecap="round" />
                            <line x1="262" y1="132" x2="236" y2="132" stroke="#7b341e" strokeWidth="3" strokeLinecap="round" />

                            {/* Left Waving Chubby Arm + Huge Pom-Pom */}
                            <g className="animate-cat-cheer-left">
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                values="-30 82 148; 28 82 148; -30 82 148"
                                dur="0.45s"
                                repeatCount="indefinite"
                              />
                              <ellipse
                                cx="66"
                                cy="142"
                                rx="24"
                                ry="16"
                                transform="rotate(-25 66 142)"
                                fill="#fffaf0"
                                stroke="#7b341e"
                                strokeWidth="3.8"
                              />
                              <circle cx="38" cy="114" r="25" fill="#fbbf24" stroke="#d97706" strokeWidth="3" strokeDasharray="6 3" />
                              <circle cx="34" cy="110" r="16" fill="#f43f5e" opacity="0.9" />
                              <text x="38" y="119" textAnchor="middle" fill="#ffffff" fontSize="12.5" fontWeight="900">
                                GO!!
                              </text>
                            </g>

                            {/* Right Waving Chubby Arm + Huge Pom-Pom */}
                            <g className="animate-cat-cheer-right">
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                values="30 238 148; -28 238 148; 30 238 148"
                                dur="0.45s"
                                repeatCount="indefinite"
                              />
                              <ellipse
                                cx="254"
                                cy="142"
                                rx="24"
                                ry="16"
                                transform="rotate(25 254 142)"
                                fill="#fffaf0"
                                stroke="#7b341e"
                                strokeWidth="3.8"
                              />
                              <circle cx="282" cy="114" r="25" fill="#fbbf24" stroke="#d97706" strokeWidth="3" strokeDasharray="6 3" />
                              <circle cx="286" cy="110" r="16" fill="#ec4899" opacity="0.9" />
                              <text x="282" y="119" textAnchor="middle" fill="#ffffff" fontSize="12.5" fontWeight="900">
                                ACE!
                              </text>
                            </g>

                            {/* Kicking Chubby Hind Paws with Pink Toe Beans */}
                            <g className="animate-cat-feet">
                              <g>
                                <animateTransform
                                  attributeName="transform"
                                  type="translate"
                                  values="0,0; 0,-10; 0,0"
                                  dur="0.45s"
                                  repeatCount="indefinite"
                                />
                                <ellipse
                                  cx="114"
                                  cy="232"
                                  rx="26"
                                  ry="16"
                                  fill="#fffaf0"
                                  stroke="#7b341e"
                                  strokeWidth="3.8"
                                />
                                <circle cx="114" cy="236" r="6" fill="#f687b3" />
                                <circle cx="103" cy="228" r="3.6" fill="#f687b3" />
                                <circle cx="114" cy="225" r="3.6" fill="#f687b3" />
                                <circle cx="125" cy="228" r="3.6" fill="#f687b3" />
                              </g>

                              <g>
                                <animateTransform
                                  attributeName="transform"
                                  type="translate"
                                  values="0,-10; 0,0; 0,-10"
                                  dur="0.45s"
                                  repeatCount="indefinite"
                                />
                                <ellipse
                                  cx="206"
                                  cy="232"
                                  rx="26"
                                  ry="16"
                                  fill="#fffaf0"
                                  stroke="#7b341e"
                                  strokeWidth="3.8"
                                />
                                <circle cx="206" cy="236" r="6" fill="#f687b3" />
                                <circle cx="195" cy="228" r="3.6" fill="#f687b3" />
                                <circle cx="206" cy="225" r="3.6" fill="#f687b3" />
                                <circle cx="217" cy="228" r="3.6" fill="#f687b3" />
                              </g>
                            </g>
                          </g>
                        </svg>
                      </div>

                      {/* Bottom Exam Cheer Copy */}
                      <div className="space-y-2 max-w-md mx-auto">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 sm:px-4 py-1 text-[11px] sm:text-sm font-extrabold uppercase tracking-wider text-amber-200 whitespace-nowrap">
                          🐾 Exam Cheer Squad · Jiayou! 💪
                        </span>
                        <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight sm:whitespace-nowrap">
                          All the Best for Your Exam! 🌟
                        </h3>
                        <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
                          Go score super well in your exam! A delicious dinner at{' '}
                          <strong className="text-amber-200">{restaurant.name}</strong> will be waiting to celebrate right after!
                        </p>
                      </div>
                    </div>
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
    </main>
  );
}
