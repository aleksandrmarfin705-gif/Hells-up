import { test, expect, type Page } from '@playwright/test';
import { mockApi, caseList } from './fixtures';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

async function noHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(r.sw, `горизонтальная прокрутка: scrollWidth ${r.sw} > ${r.iw}`).toBeLessThanOrEqual(r.iw);
}

const USER_PAGES = ['/', '/topup', '/cases', `/cases/${caseList[3].id}`, '/inventory', '/upgrade', '/games', '/games/roulette', '/games/blackjack', '/profile', '/history', '/support', '/fair'];
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
      for (const label of ['Кейсы', 'Предметы', 'Профиль']) await expect(nav.getByText(label)).toBeVisible();
      await nav.getByText('Предметы').click();
      await expect(page).toHaveURL(/\/inventory$/);
    } else {
      await expect(page.locator('aside').getByText('Предметы')).toBeVisible();
      await expect(page.locator('aside').getByText('Upgrade')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeHidden();
    }
  });

  test('кнопка «+» открывает страницу пополнения; «Продолжить» не меняет баланс и ничего не отправляет', async ({ page }) => {
    const calls: string[] = [];
    await mockApi(page, { calls });
    await page.goto('/');
    await page.getByRole('link', { name: 'Пополнить баланс' }).click();
    await expect(page).toHaveURL(/\/topup$/);
    await expect(page.getByRole('heading', { name: 'Пополнить баланс' })).toBeVisible();
    // выбор суммы
    await page.getByRole('button', { name: /5\s?000\s*монет/ }).click();
    await expect(page.getByText('Вы выбрали')).toBeVisible();
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(page.getByText('Функция пока недоступна')).toBeVisible();
    // ни одного запроса на изменение баланса или платёж
    expect(calls.filter((c) => c.startsWith('POST') && /topup|pay|invoice/.test(c))).toEqual([]);
    // история с понятными статусами
    await expect(page.getByText('История операций')).toBeVisible();
    await expect(page.getByText('Успешно').first()).toBeVisible();
  });

  test('своя сумма: ниже минимума кнопка «Продолжить» отключена', async ({ page }) => {
    await mockApi(page);
    await page.goto('/topup');
    await page.getByLabel('Своя сумма').fill('5');
    await expect(page.getByText('Минимум 10')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
    await page.getByLabel('Своя сумма').fill('250');
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeEnabled();
  });

  test('демо-монеты: кнопка вызывает серверную выдачу', async ({ page }) => {
    const calls: string[] = [];
    await mockApi(page, { calls });
    await page.goto('/topup');
    await page.getByRole('button', { name: /Получить \+/ }).click();
    await expect.poll(() => calls.includes('POST /api/topup')).toBe(true);
  });
});
