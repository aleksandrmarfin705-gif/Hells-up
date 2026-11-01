export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type Item = {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  rarity: Rarity;
  art: string;
  image_url: string | null;
  virtual_price: number;
  is_active: boolean;
};

export type CaseSummary = {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  price: number;
  accent: string;
  art: string;
  image_url: string | null;
  is_featured: boolean;
  item_count: number;
  top_item: Pick<Item, 'id' | 'name' | 'rarity' | 'art' | 'image_url' | 'virtual_price'> | null;
};

export type CaseDetail = CaseSummary & {
  items: (Item & { weight: number; chance: number })[];
};

export type PublicUser = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  balance: number;
  created_at: string;
  last_topup_at: string | null;
};

export type PublicSettings = {
  app_name: string;
  topup_amount: number;
  topup_cooldown_seconds: number;
  roulette_enabled: boolean;
  roulette_min_bet: number;
  roulette_max_bet: number;
  blackjack_enabled: boolean;
  blackjack_min_bet: number;
  blackjack_max_bet: number;
  cases_enabled: boolean;
  upgrade_enabled: boolean;
  upgrade_edge_bp: number;
  upgrade_max_chance_bp: number;
  banner_title: string;
  banner_subtitle: string;
  show_demo_events: boolean;
};

export type MeResponse = {
  user: PublicUser;
  isAdmin: boolean;
  settings: PublicSettings;
  realtime: { url: string; anonKey: string; token: string | null } | null;
};

export type GameEvent = {
  id: string;
  kind: 'case' | 'upgrade' | 'roulette' | 'blackjack';
  display_name: string;
  title: string;
  rarity: Rarity | null;
  amount: number | null;
  is_demo: boolean;
  created_at: string;
};

export type InventoryItem = {
  id: string; // user_items.id
  status: 'owned' | 'sold' | 'consumed';
  source: string;
  acquired_at: string;
  item: Item;
};
