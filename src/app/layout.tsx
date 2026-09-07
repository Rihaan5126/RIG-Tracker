import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'RIGtracker — Instagram intelligence, organized.',
    template: '%s · RIGtracker',
  },
  description:
    'Analyze authorized accounts, monitor changes, and build historical profiles in one research workspace. Independent of Meta and Instagram.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
