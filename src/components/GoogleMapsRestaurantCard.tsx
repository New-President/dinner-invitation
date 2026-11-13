'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  Images,
  MapPin,
  Navigation,
  Phone,
} from 'lucide-react';
import { getLiveOpeningStatus, type Restaurant } from '@/lib/restaurants';

interface GoogleMapsRestaurantCardProps {
  readonly restaurant: Restaurant;
  readonly isSelected: boolean;
  readonly onPickRestaurant: () => void;
  readonly radioInputId: string;
}

export function GoogleMapsRestaurantCard({
  restaurant,
  onPickRestaurant,
  radioInputId,
}: GoogleMapsRestaurantCardProps) {
  const [photoOffset, setPhotoOffset] = useState<number>(0);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const liveStatus = getLiveOpeningStatus(restaurant.hours, now);

  const photos = restaurant.photos;
  const mainPhoto = photos[photoOffset % photos.length];
  const topSidePhoto = photos[(photoOffset + 1) % photos.length];
  const bottomSidePhoto = photos[(photoOffset + 2) % photos.length];

  const cyclePhotos = () => {
    setPhotoOffset((prev) => (prev + 1) % photos.length);
  };

  const isGoldPick = Boolean(restaurant.ziRenWantsToTry);

  return (
    <article
      className={`flex flex-col rounded-[24px] overflow-hidden transition-all duration-200 border-2 h-full justify-between ${
        isGoldPick
          ? 'border-amber-400 ring-2 ring-amber-400/55 shadow-[0_0_38px_rgba(251,191,36,0.38)] hover:border-yellow-300 hover:shadow-[0_0_48px_rgba(251,191,36,0.55)] bg-gradient-to-b from-[#2c2212] via-[#1f1f1f] to-[#241c10] text-[#e8eaed]'
          : 'border-[#35363a] hover:border-rose-500 hover:ring-2 hover:ring-rose-400/35 hover:shadow-[0_16px_40px_rgba(225,29,72,0.28)] shadow-xl bg-[#1f1f1f] text-[#e8eaed]'
      }`}
    >
      {/* Top Official Google Knowledge Panel Header */}
      <div className="px-4 pt-3.5 pb-2.5 space-y-1 shrink-0">
        {/* Location Area Breadcrumb & Cuisine Pill */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#9aa0a6]">
          <span className="inline-flex items-center gap-1 truncate font-medium text-[#bdc1c6]">
            <MapPin
              className={`w-3 h-3 shrink-0 ${
                isGoldPick ? 'text-amber-400' : 'text-rose-400'
              }`}
            />
            <span className="truncate">{restaurant.areaName} · Singapore</span>
          </span>
          {isGoldPick ? (
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-[#231728] font-extrabold shrink-0 whitespace-nowrap shadow-md">
              ★ Zi Ren wants to try
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-200 font-semibold shrink-0 whitespace-nowrap">
              {restaurant.cuisine}
            </span>
          )}
        </div>

        {/* Single-Line No-Wrap Title */}
        <label
          htmlFor={radioInputId}
          onClick={onPickRestaurant}
          className="block cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              title={`${restaurant.name}${restaurant.chineseName ? ` ${restaurant.chineseName}` : ''}`}
              className={`text-lg sm:text-xl font-bold tracking-tight truncate whitespace-nowrap ${
                isGoldPick ? 'text-amber-300' : 'text-white'
              }`}
            >
              {restaurant.name}
              {restaurant.chineseName ? (
                <span className="ml-1.5 font-normal text-[#bdc1c6] text-base">
                  {restaurant.chineseName}
                </span>
              ) : null}
            </h2>
            {isGoldPick && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/45 text-[10px] font-bold text-amber-200 shrink-0 whitespace-nowrap">
                {restaurant.cuisine}
              </span>
            )}
          </div>
        </label>

        {/* Subheader: Rating · Price · Category · Live Open/Closed Status */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-[#bdc1c6] overflow-hidden">
          <span className="font-bold text-white shrink-0">
            {restaurant.rating.toFixed(1)}
          </span>
          <span className="text-[#fbbc04] tracking-tighter shrink-0" aria-hidden="true">
            ★★★★★
          </span>
          <span className="text-[#9aa0a6] shrink-0">
            ({restaurant.reviewCount.toLocaleString()})
          </span>
          <span className="shrink-0">·</span>
          <span className="whitespace-nowrap shrink-0">{restaurant.priceRange}</span>
          <span className="shrink-0">·</span>
          <span className="truncate">{restaurant.googleCategory}</span>
          <span className="shrink-0">·</span>
          <span
            className={`font-semibold shrink-0 whitespace-nowrap ${
              liveStatus.isOpen ? 'text-[#81c995]' : 'text-[#f28b82]'
            }`}
          >
            {liveStatus.statusBadge}
          </span>
          <span className="text-[#bdc1c6] shrink-0 whitespace-nowrap">
            · {liveStatus.detailText}
          </span>
        </div>
      </div>

      {/* Main Card Body: 3-Photo Bento Collage + Live Map & Opening Hours */}
      <div className="px-3.5 pb-3 space-y-2.5 flex-1 flex flex-col justify-between">
        {/* 3-Photo Google Bento Collage */}
        <div className="grid grid-cols-12 gap-1.5 h-[205px] sm:h-[215px] rounded-2xl overflow-hidden bg-[#171717] border border-white/10 shrink-0">
          {/* Left Primary Photo */}
          <button
            type="button"
            onClick={cyclePhotos}
            title="Click to cycle live Google Maps photos"
            className="col-span-7 relative h-full w-full overflow-hidden group cursor-pointer text-left focus:outline-none"
          >
            <img
              src={mainPhoto.url}
              alt={`${restaurant.name} — ${mainPhoto.caption}`}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-white truncate drop-shadow">
                {mainPhoto.caption}
              </span>
            </div>
          </button>

          {/* Right 2 Stacked Photos */}
          <div className="col-span-5 grid grid-rows-2 gap-1.5 h-full min-h-0">
            <button
              type="button"
              onClick={cyclePhotos}
              title="Click to cycle live Google Maps photos"
              className="relative h-full w-full min-h-0 overflow-hidden group cursor-pointer focus:outline-none"
            >
              <img
                src={topSidePhoto.url}
                alt={`${restaurant.name} — ${topSidePhoto.caption}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>

            <button
              type="button"
              onClick={cyclePhotos}
              title="Click to cycle live Google Maps photos"
              className="relative h-full w-full min-h-0 overflow-hidden group cursor-pointer focus:outline-none"
            >
              <img
                src={bottomSidePhoto.url}
                alt={`${restaurant.name} — ${bottomSidePhoto.caption}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
              <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/75 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white border border-white/15">
                <Images className="w-3 h-3 text-rose-300" />
                <span>{photos.length} Photos</span>
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Bento Grid: Live Google Map (Left) + Live Opening Hours (Right) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 flex-1">
          {/* Left Column: Live Google Map Embed (Width & Height >= 220px activates built-in Google drag/zoom UI) */}
          <div className="sm:col-span-7 rounded-2xl bg-[#28292a] border border-white/10 overflow-hidden flex flex-col justify-between">
            <div style={{ height: '220px' }} className="relative w-full bg-[#161718]">
              <iframe
                title={`Google Map of ${restaurant.name}`}
                src={restaurant.mapEmbedUrl}
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full border-0 block pointer-events-auto"
              />
            </div>

            <div className="p-2.5 bg-[#28292a] border-t border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#e8eaed] truncate">
                  {restaurant.address}
                </p>
                <p className="text-[10px] text-[#9aa0a6] truncate">
                  {restaurant.coordinates.lat.toFixed(4)}° N,{' '}
                  {restaurant.coordinates.lng.toFixed(4)}° E
                </p>
              </div>
              <a
                href={restaurant.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${restaurant.name} in Google Maps`}
                className="inline-flex items-center gap-1 rounded-full bg-[#3c4043] hover:bg-[#4b4f54] text-[#8ab4f8] px-2.5 py-1.5 text-[11px] font-semibold shrink-0 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Right Column: Live Opening Hours Card */}
          <div className="sm:col-span-5 rounded-2xl bg-[#28292a] border border-white/10 p-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              {/* Header + Live SGT Clock */}
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e8eaed] whitespace-nowrap">
                  <Clock className="w-3 h-3 text-[#8ab4f8] shrink-0" />
                  <span>Opening Hours</span>
                </span>
                <span className="text-[9px] font-medium text-[#9aa0a6] bg-[#1f1f1f] px-1.5 py-0.5 rounded-full border border-white/10 whitespace-nowrap shrink-0">
                  {liveStatus.currentTimeSGT}
                </span>
              </div>

              {/* Live Status Badge Box */}
              <div
                className={`rounded-xl px-2 py-1.5 border ${
                  liveStatus.isOpen
                    ? 'bg-emerald-500/10 border-emerald-400/25'
                    : 'bg-rose-500/10 border-rose-400/25'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold whitespace-nowrap overflow-hidden">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      liveStatus.isOpen
                        ? 'bg-[#81c995] animate-pulse'
                        : 'bg-[#f28b82]'
                    }`}
                  />
                  <span
                    className={
                      liveStatus.isOpen ? 'text-[#81c995]' : 'text-[#f28b82]'
                    }
                  >
                    {liveStatus.statusBadge}
                  </span>
                  <span className="text-[#e8eaed] font-medium truncate">
                    · {liveStatus.detailText}
                  </span>
                </div>
              </div>

              {/* Daily Schedule Breakdown */}
              <div className="space-y-1 pt-0.5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[#9aa0a6] whitespace-nowrap">
                  Monday – Sunday
                </p>
                {liveStatus.scheduleLines.map((line, index) => (
                  <p
                    key={index}
                    className="text-xs font-medium text-[#e8eaed] whitespace-nowrap"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {/* Footer: Phone & Service Tag */}
            <div className="pt-2.5 mt-2 border-t border-white/10 space-y-1 text-[11px] text-[#bdc1c6]">
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3 h-3 text-[#8ab4f8] shrink-0" />
                <span>{restaurant.phone}</span>
              </div>
              <p className="text-[10px] text-[#9aa0a6] truncate">
                {restaurant.serviceTag}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Selection CTA Button */}
      <div
        className={`px-3.5 pb-3.5 pt-1 shrink-0 ${
          isGoldPick ? 'bg-[#241c10]' : 'bg-[#1f1f1f]'
        }`}
      >
        <button
          type="button"
          onClick={onPickRestaurant}
          className={`touch-target w-full rounded-xl px-4 py-3 font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            isGoldPick
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-[#231728] shadow-lg shadow-amber-400/30'
              : 'bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-600/25'
          }`}
        >
          <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span className="truncate">
            Select {restaurant.name}
            {isGoldPick ? ' · Zi Ren wants to try' : ''}
          </span>
        </button>
      </div>
    </article>
  );
}
