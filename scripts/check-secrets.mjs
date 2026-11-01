// Проверка: в отслеживаемых git-файлах нет похожих на реальные секреты значений.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
const patterns = [
  [/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/, 'Telegram bot token'],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, 'JWT (возможно Supabase key)'],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, 'Supabase secret key'],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, 'Private key'],
];
let bad = 0;
for (const f of files) {
  if (/package-lock\.json$|\.png$|\.ico$/.test(f)) continue;
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  for (const [re, name] of patterns) {
    if (re.test(text)) { console.error(`✗ ${f}: похоже на ${name}`); bad++; }
  }
  if (/NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE|BOT_TOKEN)/.test(text) && f !== 'scripts/check-secrets.mjs') {
    console.error(`✗ ${f}: секрет в NEXT_PUBLIC переменной`); bad++;
  }
}
if (bad) { console.error(`Найдено проблем: ${bad}`); process.exit(1); }
console.log(`✓ Секретов в ${files.length} отслеживаемых файлах не найдено`);
