/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Mini App открывается внутри Telegram (iframe/webview) — разрешаем только Telegram как родителя.
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
