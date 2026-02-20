import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NetAtlas | Internet Reliability Observatory',
  description: 'Real-time internet reliability monitoring across the United States',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
