import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * 정적 export 시 HTML <head>를 커스터마이즈 (PWA 메타).
 * iOS Safari 홈 화면 추가용 apple-* 메타 + PWA manifest + theme color.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  const base = process.env.EXPO_BASE_URL ?? '';
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />

        <title>우시 주말 플래너</title>
        <meta name="description" content="우시 거주 한중 커플을 위한 주말 코스 추천" />

        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <meta name="theme-color" content="#ff9a8b" />
        <meta name="background-color" content="#fdf6f0" />

        <link rel="icon" href={`${base}/favicon.png`} type="image/png" />
        <link rel="icon" href={`${base}/icon-192.png`} sizes="192x192" type="image/png" />
        <link rel="icon" href={`${base}/icon-512.png`} sizes="512x512" type="image/png" />

        {/* iOS Safari PWA */}
        <link rel="apple-touch-icon" href={`${base}/apple-touch-icon.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Wuxi" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalCss = `
html, body { background: #fdf6f0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Apple SD Gothic Neo', 'Noto Sans CJK KR', 'Segoe UI', sans-serif;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
}
@media (display-mode: standalone) {
  body { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
}
`;
