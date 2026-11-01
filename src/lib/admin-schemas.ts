import { z } from 'zod';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export const ITEM_ARTS = ['coin', 'blade', 'skull', 'ring', 'potion', 'key', 'shield', 'gem', 'orb', 'crown', 'flame'] as const;
export const CASE_ARTS = ['chest', 'relic', 'flame', 'crown'] as const;

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => u.startsWith('https://'), 'Только https-ссылки');
const optionalUrl = z.union([httpsUrl, z.literal(''), z.null()]).optional().transform((v) => (v ? v : null));

export const itemInput = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(80),
  description: z.string().trim().max(500).default(''),
  rarity: z.enum(RARITIES),
  art: z.enum(ITEM_ARTS).default('gem'),
  image_url: optionalUrl,
  virtual_price: z.number().int().min(0).max(1_000_000_000_000),
  is_active: z.boolean().default(true),
});

export const caseInput = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(80),
  description: z.string().trim().max(500).default(''),
  price: z.number().int().min(0).max(1_000_000_000_000),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет вида #c6f432').default('#c6f432'),
  art: z.enum(CASE_ARTS).default('chest'),
  image_url: optionalUrl,
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(-1000).max(100000).default(0),
});

export const caseItemsInput = z.object({
  items: z
    .array(z.object({ item_id: z.string().uuid(), weight: z.number().int().min(1).max(2_000_000_000) }))
    .max(200)
    .refine((a) => new Set(a.map((x) => x.item_id)).size === a.length, 'Предметы не должны повторяться'),
});

const int = (min: number, max: number) => z.number().int().min(min).max(max);
export const settingsInput = z
  .object({
    app_name: z.string().trim().min(1).max(40),
    start_balance: int(0, 1_000_000_000),
    topup_amount: int(0, 1_000_000_000),
    topup_cooldown_seconds: int(0, 604800),
    maintenance: z.boolean(),
    maintenance_message: z.string().trim().max(300),
    upgrade_edge_bp: int(0, 5000),
    upgrade_max_chance_bp: int(1000, 10000),
    roulette_enabled: z.boolean(),
    roulette_round_seconds: int(10, 300),
    roulette_min_bet: int(1, 1_000_000_000),
    roulette_max_bet: int(1, 1_000_000_000),
    blackjack_enabled: z.boolean(),
    blackjack_min_bet: int(1, 1_000_000_000),
    blackjack_max_bet: int(1, 1_000_000_000),
    cases_enabled: z.boolean(),
    upgrade_enabled: z.boolean(),
    banner_title: z.string().trim().max(80),
    banner_subtitle: z.string().trim().max(240),
    show_demo_events: z.boolean(),
  })
  .partial()
  .strict();
