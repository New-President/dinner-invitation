import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { REGIONS } from '@/lib/restaurants';
import { parseInviteSubmission } from '@/lib/validation';
import { buildHostGoogleCalendarUrl } from '@/lib/calendar';
import {
  RECIPIENT_EMAIL,
  buildInvitationEmailContent,
} from '@/lib/email-template';

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
        Add_To_Google_Calendar: buildHostGoogleCalendarUrl({
          restaurant: submission.restaurant,
          comment: submission.comment,
          guestName: submission.guestName,
        }),
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
