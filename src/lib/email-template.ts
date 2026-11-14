import { REGIONS } from './restaurants';
import { DINNER_SCHEDULE, buildHostGoogleCalendarUrl } from './calendar';
import type { InviteSubmission } from './validation';

export const RECIPIENT_EMAIL = 'zirenyong2004@gmail.com';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildInvitationEmailContent(
  submission: InviteSubmission,
  timestampSGT: string
): { readonly subject: string; readonly text: string; readonly html: string } {
  const regionMeta = REGIONS[submission.region];
  const { restaurant } = submission;
  const googleCalendarUrl = buildHostGoogleCalendarUrl({
    restaurant,
    comment: submission.comment,
    guestName: submission.guestName,
  });

  const subject = `🎉 Dinner Confirmed: ${restaurant.name} (${regionMeta.name}) — Vegetarian Dinner Invite`;

  const text = [
    `🎉 NEW VEGETARIAN DINNER RESPONSE 🎉`,
    `================================================`,
    `Host: Yong Zi Ren`,
    `From: ${submission.guestName}`,
    `Selected Region: ${regionMeta.name} (${submission.region.toUpperCase()})`,
    `Selected Restaurant: ${restaurant.name}${restaurant.chineseName ? ` (${restaurant.chineseName})` : ''}`,
    `Cuisine: ${restaurant.cuisine}`,
    `Rating: ${restaurant.rating} ★ (${restaurant.reviewCount} Google reviews) · ${restaurant.priceRange}`,
    `Address: ${restaurant.address}`,
    `Google Maps: ${restaurant.directionsUrl}`,
    `When: ${DINNER_SCHEDULE.dateLabel} · ${DINNER_SCHEDULE.timeLabel}`,
    `Add to Google Calendar: ${googleCalendarUrl}`,
    ``,
    `Comments / Special Requests:`,
    `"${submission.comment}"`,
    ``,
    `Submitted at: ${timestampSGT} (Singapore Time)`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#fff5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2d1b24;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:2px solid #fbcfe8;box-shadow:0 12px 32px rgba(225,29,72,0.12);">
    <div style="background:linear-gradient(135deg,#e11d48 0%,#db2777 50%,#9333ea 100%);padding:32px 28px;text-align:center;color:#ffffff;">
      <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:0.9;margin-bottom:8px;">Celebratory Vegetarian Dinner Confirmed</div>
      <h1 style="margin:0;font-size:28px;font-weight:800;">Dinner Spot Selected! 🎉</h1>
      <p style="margin:8px 0 0;font-size:15px;opacity:0.95;">Sent to Yong Zi Ren (${RECIPIENT_EMAIL})</p>
    </div>

    <div style="padding:28px;">
      <div style="background:#fdf2f8;border:1px solid #f9a8d4;border-radius:16px;padding:20px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#be185d;letter-spacing:1px;">Chosen Region</div>
        <div style="font-size:20px;font-weight:800;color:#831843;margin-top:4px;">${escapeHtml(regionMeta.name)} (${escapeHtml(submission.region.toUpperCase())})</div>
        <div style="font-size:13px;color:#9d174d;margin-top:2px;">${escapeHtml(regionMeta.subtitle)}</div>
      </div>

      <div style="background:#1f161b;color:#f8fafc;border-radius:18px;padding:22px;margin-bottom:20px;">
        <div style="display:inline-block;background:#f43f5e;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.8px;">
          ${escapeHtml(restaurant.cuisine)}
        </div>
        <h2 style="margin:10px 0 4px;font-size:24px;color:#ffffff;">
          ${escapeHtml(restaurant.name)} ${restaurant.chineseName ? `<span style="font-weight:400;opacity:0.85;">${escapeHtml(restaurant.chineseName)}</span>` : ''}
        </h2>
        <div style="color:#fbbf24;font-size:14px;font-weight:600;margin-bottom:12px;">
          ★ ${restaurant.rating} (${restaurant.reviewCount} reviews) · <span style="color:#cbd5e1;">${escapeHtml(restaurant.priceRange)} · Vegetarian</span>
        </div>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#e2e8f0;">${escapeHtml(restaurant.description)}</p>
        <div style="font-size:13px;color:#f1f5f9;margin-bottom:6px;">📍 <strong>Address:</strong> ${escapeHtml(restaurant.address)}</div>
        <div style="font-size:13px;color:#f1f5f9;margin-bottom:6px;">🕒 <strong>Hours:</strong> ${escapeHtml(restaurant.hours)}</div>
        <div style="font-size:13px;color:#f1f5f9;margin-bottom:16px;">📞 <strong>Phone:</strong> ${escapeHtml(restaurant.phone)}</div>
        <div style="font-size:13px;color:#f1f5f9;margin-bottom:16px;">🗓️ <strong>When:</strong> ${escapeHtml(DINNER_SCHEDULE.dateLabel)} · ${escapeHtml(DINNER_SCHEDULE.timeLabel)}</div>
        <a href="${escapeHtml(restaurant.directionsUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;margin:0 8px 8px 0;">
          Open in Google Maps →
        </a>
        <a href="${escapeHtml(googleCalendarUrl)}" style="display:inline-block;background:#fbbf24;color:#231728;text-decoration:none;font-weight:800;font-size:13px;padding:10px 18px;border-radius:999px;margin:0 8px 8px 0;">
          🗓️ Add to Google Calendar →
        </a>
      </div>

      <div style="background:#fff1f2;border-left:4px solid #e11d48;border-radius:12px;padding:18px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#be123c;letter-spacing:1px;margin-bottom:6px;">
          Message &amp; Comments for Yong Zi Ren
        </div>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#4c0519;white-space:pre-wrap;">“${escapeHtml(submission.comment)}”</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#4a2535;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #fce7f3;"><strong>From:</strong></td>
          <td style="padding:8px 0;border-bottom:1px solid #fce7f3;text-align:right;">${escapeHtml(submission.guestName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;"><strong>Timestamp (SGT):</strong></td>
          <td style="padding:8px 0;text-align:right;">${escapeHtml(timestampSGT)}</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
