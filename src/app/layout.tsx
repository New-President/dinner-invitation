import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Singapore Vegetarian Dinner Invitation | Hosted by Yong Zi Ren',
  description:
    'An interactive Singapore vegetarian dinner invitation across North, South, East, West, and Central Singapore with live Google Maps embeds.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-rose-200 selection:text-rose-950">
        {children}
      </body>
    </html>
  );
}
