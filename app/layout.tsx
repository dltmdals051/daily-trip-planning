import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '우시 주말 플래너',
  description: '우시 거주 한중 커플을 위한 주말 코스 추천',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
