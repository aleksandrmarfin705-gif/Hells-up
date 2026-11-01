// Собирает supabase/setup.sql = все миграции + seed одним файлом (удобно вставить в Supabase SQL Editor с телефона).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'supabase/migrations';
const parts = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => `-- ===== ${f} =====\n${readFileSync(`${dir}/${f}`, 'utf8')}`);
parts.push(`-- ===== seed.sql =====\n${readFileSync('supabase/seed.sql', 'utf8')}`);
writeFileSync('supabase/setup.sql', '-- HELLS UP: полная установка БД одним скриптом (выполнять один раз на пустом проекте).\n' + parts.join('\n\n'));
console.log('supabase/setup.sql собран');
