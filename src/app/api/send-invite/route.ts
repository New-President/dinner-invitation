import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { REGIONS } from '@/lib/restaurants';
import { parseInviteSubmission, type InviteSubmission } from '@/lib/validation';

export const RECIPIENT_EMAIL = 'zirenyong2004@gmail.com';

function readEnvVarsFromDisk(): Record<string, string> {
  const result: Record<string, string> = {};
  const candidates = ['.env.example', '.env', '.env.local'];
  for (const filename of candidates) {
    try {
      const fullPath = path.join(process.cwd(), filename);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key && val) {
          result[key] = val;
        }
      }
    } catch {
      // Ignore file read errors in serverless environments
    }
  }
  return result;
}

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
        <a href="${escapeHtml(restaurant.directionsUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;">
          Open in Google Maps →
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

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      rawBody = await request.json();
    } else {
      const formData = await request.formData();
      rawBody = {
        region: formData.get('region'),
        restaurantId: formData.get('restaurantId'),
        comment: formData.get('comment') ?? '',
        guestName: formData.get('guestName') ?? undefined,
      };
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body format.' },
      { status: 400 }
    );
  }

  const parsed = parseInviteSubmission(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const submission = parsed.value;
  const timestampSGT = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(Date.now());

  const { subject, text, html } = buildInvitationEmailContent(submission, timestampSGT);

  const diskEnv = readEnvVarsFromDisk();
  const rawGmailPassword = (
    process.env.GMAIL_APP_PASSWORD?.trim() ||
    diskEnv.GMAIL_APP_PASSWORD ||
    ''
  ).trim();
  const gmailUser = (
    process.env.GMAIL_USER?.trim() ||
    diskEnv.GMAIL_USER ||
    RECIPIENT_EMAIL
  ).trim();
  const resendApiKey = (
    process.env.RESEND_API_KEY?.trim() ||
    diskEnv.RESEND_API_KEY ||
    ''
  ).trim();

  let smtpErrorDetail: string | null = null;

  if (rawGmailPassword && rawGmailPassword !== 'your_16_char_gmail_app_password') {
    const normalizedAppPassword = rawGmailPassword.replace(/\s+/g, '');
    for (const candidatePass of Array.from(new Set([normalizedAppPassword, rawGmailPassword]))) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: candidatePass,
          },
        });

        await transporter.sendMail({
          from: `"Singapore Vegetarian Dinner Invite" <${gmailUser}>`,
          to: RECIPIENT_EMAIL,
          subject,
          text,
          html,
        });

        return NextResponse.json({
          ok: true,
          delivery: 'gmail-smtp',
          recipient: RECIPIENT_EMAIL,
          timestampSGT,
          summary: {
            region: submission.region,
            restaurantName: submission.restaurant.name,
            cuisine: submission.restaurant.cuisine,
            comment: submission.comment,
          },
        });
      } catch (err) {
        smtpErrorDetail = err instanceof Error ? err.message : 'SMTP transport failed';
      }
    }
  }

  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Singapore Dinner Invite <onboarding@resend.dev>',
          to: [RECIPIENT_EMAIL],
          subject,
          text,
          html,
        }),
      });

      if (res.ok) {
        return NextResponse.json({
          ok: true,
          delivery: 'resend-api',
          recipient: RECIPIENT_EMAIL,
          timestampSGT,
        });
      }
    } catch {
      // Continue to FormSubmit relay fallback
    }
  }

  let formSubmitMessage: string | null = null;
  try {
    const incomingOrigin = request.headers.get('origin') || 'https://dinner-invitation-vg.vercel.app';
    const incomingReferer = request.headers.get('referer') || `${incomingOrigin}/`;
    const incomingUa =
      request.headers.get('user-agent') ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

    const formSubmitRes = await fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: incomingOrigin,
        Referer: incomingReferer,
        'User-Agent': incomingUa,
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        Host: 'Yong Zi Ren',
        From_Guest: submission.guestName,
        Selected_Region: `${REGIONS[submission.region].name} (${submission.region.toUpperCase()})`,
        Selected_Restaurant: `${submission.restaurant.name} (${submission.restaurant.cuisine})`,
        Address: submission.restaurant.address,
        Google_Maps: submission.restaurant.directionsUrl,
        Message_For_Yong_Zi_Ren: submission.comment,
        Submitted_At_SGT: timestampSGT,
      }),
    });
    const formSubmitData = (await formSubmitRes.json()) as {
      success?: string | boolean;
      message?: string;
    };
    if (formSubmitData.success === 'true' || formSubmitData.success === true) {
      return NextResponse.json({
        ok: true,
        delivery: 'formsubmit-relay',
        recipient: RECIPIENT_EMAIL,
        timestampSGT,
      });
    }
    if (formSubmitData.message) {
      formSubmitMessage = formSubmitData.message;
    }
  } catch {
    // Ignore FormSubmit network error
  }

  return NextResponse.json({
    ok: true,
    delivery: smtpErrorDetail ? 'fallback-after-smtp-error' : 'preview-logged',
    smtpWarning: smtpErrorDetail ?? undefined,
    formSubmitInfo: formSubmitMessage ?? undefined,
    recipient: RECIPIENT_EMAIL,
    timestampSGT,
    subject,
    previewText: text,
    previewHtml: html,
  });
}
