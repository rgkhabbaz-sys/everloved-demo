import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'everloved — Game Demo',
  description: 'Therapeutic sensory games for people living with dementia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
