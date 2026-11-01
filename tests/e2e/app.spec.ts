import { test, expect, type Page } from '@playwright/test';
import { mockApi, caseList } from './fixtures';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

async function noHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(r.sw, `горизонтальная прокрутка: scrollWidth ${r.sw} > ${r.iw}`).toBeLessThanOrEqual(r.iw);
}

const USER_PAGES = ['/', '/cases', `/cases/${caseList[3].id}`, '/inventory', '/upgrade', '/games', '/games/roulette', '/games/blackjack', '/profile', '/history', '/support', '/fair'];
const ADMIN_PAGES = ['/admin', '/admin/users', '/admin/cases', '/admin/items', '/admin/games', '/admin/support', '/admin/settings', '/admin/audit'];

test.describe('состояния подключения', () => {
  test('без Supabase/Telegram показывается понятный экран подключения, а не имитация успеха', async ({ page }) => {
    await mockApi(page, { notConfigured: true });
    await page.goto('/');
    await expect(page.getByText('Приложение ещё не подключено')).toBeVisible();
    await expect(page.getByText('Supabase (база данных)')).toBeVisible();
    await expect(page.getByText('Секрет сессий')).toBeVisible();
    await page.screenshot({ path: `test-results/shots/${test.info().project.name}-not-configured.png` });
  });
});

test.describe('страницы', () => {
  for (const path of USER_PAGES) {
    test(`пользователь: ${path} — без ошибок и без горизонтальной прокрутки`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts|telegram\.org|Failed to load resource/.test(m.text())) errors.push(m.text()); });
      await mockApi(page);
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForTimeout(900);
      await noHorizontalScroll(page);
      expect(errors, errors.join('\n')).toEqual([]);
      const name = path === '/' ? 'home' : path.replace(/^\/|\/[0-9a-f-]{36}/g, '').replace(/\//g, '-') || 'page';
      await page.screenshot({ path: `test-results/shots/${info.project.name}-${name}.png` });
    });
  }

  for (const path of ADMIN_PAGES) {
    test(`админ: ${path}`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await mockApi(page, { admin: true });
      await page.goto(path);
      await expect(page.getByText('Админ-панель', { exact: true }).first()).toBeVisible();
      await page.waitForTimeout(500);
      await noHorizontalScroll(page);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/shots/${info.project.name}-${path.replace(/\//g, '-').slice(1)}.png` });
    });
  }

  test('обычный пользователь не видит админку', async ({ page }) => {
    await mockApi(page);
    await page.goto('/admin');
    await expect(page.getByText('Нет доступа')).toBeVisible();
  });
});

test.describe('сценарии', () => {
  test('открытие кейса: запрос на сервер, анимация ленты, экран результата', async ({ page }, info) => {
    const calls: string[] = [];
    await mockApi(page, { calls });
    await page.goto(`/cases/${caseList[3].id}`);
    await page.getByRole('button', { name: /Открыть за/ }).click();
    await expect(page.getByText('Открываем кейс…')).toBeVisible();
    await page.screenshot({ path: `test-results/shots/${info.project.name}-case-spin.png` });
    await expect(page.getByText('Вам выпало')).toBeVisible({ timeout: 12_000 });
    await page.screenshot({ path: `test-results/shots/${info.project.name}-case-reveal.png` });
    expect(calls.some((c) => c.startsWith('POST') && c.endsWith('/open'))).toBe(true);
  });

  test('навигация: нижнее меню на мобильных / сайдбар на desktop', async ({ page, isMobile }) => {
    await mockApi(page);
    await page.goto('/');
    if (isMobile) {
      const nav = page.getByRole('navigation', { name: 'Основная навигация' });
      await expect(nav.getByText('Главная')).toBeVisible();
      for (const label of ['Кейсы', 'Upgrade', 'Игры', 'Профиль']) await expect(nav.getByText(label)).toBeVisible();
      await nav.getByText('Игры').click();
      await expect(page).toHaveURL(/\/games$/);
    } else {
      await expect(page.locator('aside').getByText('Инвентарь')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeHidden();
    }
  });

  test('пополнение демо-баланса вызывает сервер', async ({ page }) => {
    const calls: string[] = [];
    await mockApi(page, { calls });
    await page.goto('/');
    await page.getByRole('button', { name: 'Пополнить демо-баланс' }).click();
    await expect.poll(() => calls.some((c) => c === 'POST /api/topup')).toBe(true);
  });
});
