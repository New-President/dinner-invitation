# Singapore Vegetarian Dinner Date Invitation ♡

An interactive 4-screen romantic dinner invitation web app built with **Next.js 16 (Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Nodemailer**.

## Features

1. **Screen 1 — Interactive Singapore Region Map**:
   - Interactive SVG map of Singapore divided into **North, South, East, West, and Central** regions.
   - Accessible `<fieldset>` radio cards previewing the 3 vegetarian restaurants in each region.
2. **Screen 2 — 3 Vegetarian Restaurants per Region (Google Maps Place Cards + Live Maps)**:
   - 15 real Singapore vegetarian restaurants (3 per region, each with a distinct cuisine).
   - Styled after the Google Maps Place card (`D'life Bistro & Cafe 蔬食谱` in West Singapore, `Whole Earth` in Central, `VeganBurg` & `elemen Classic` in East, `NomVnom Lakeside` in North, `Original Sin` in South, etc.).
   - Interactive `Overview`, `Menu`, `Reviews`, and `Photos` tabs plus a **live embedded Google Maps `<iframe>`** inside each restaurant card.
   - Includes a **Back to Singapore Map** button.
3. **Screen 3 — Sweet Note & Date Preferences**:
   - Lets her pick a preferred dinner time, evening vibe, and write a personal note or dish craving.
   - Includes a **Back to Restaurants** button.
4. **Screen 4 — Cute Romantic Keepsake Page**:
   - Displays the confirmed dinner ticket, embedded Google Map, and her note.
   - Strictly **no back button** on the final thank-you page.
   - Emails her choice and message directly to `zirenyong2004@gmail.com`.

## Local Development

```bash
npm install
npm run dev
```

## Email Configuration (Vercel / `.env.local`)

To enable live Gmail delivery to `zirenyong2004@gmail.com`, configure environment variables in `.env.local` or your Vercel Project Settings:

```env
GMAIL_USER=zirenyong2004@gmail.com
GMAIL_APP_PASSWORD=your_16_char_gmail_app_password
```
