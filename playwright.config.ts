import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

// Для iPhone используем Chromium с размерами/UA iPhone (WebKit не обязателен для проверки вёрстки).
const iphone = { ...devices['iPhone 14'], defaultBrowserType: 'chromium' as const };

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, launchOptions: { executablePath, args: ['--no-sandbox'] }, trace: 'off' },
  projects: [
    { name: 'w360', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } } },
    { name: 'w390', use: iphone },
    { name: 'w430', use: { ...iphone, viewport: { width: 430, height: 932 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234', NEXT_PUBLIC_SUPABASE_URL: '', DEMO_MODE: 'false' },
  },
});
