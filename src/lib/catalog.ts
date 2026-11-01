import 'server-only';
import { db, check } from '@/lib/supabase/admin';
import type { CaseDetail, CaseSummary, Item } from '@/lib/types';

const ITEM_COLS = 'id,slug,name,description,rarity,art,image_url,virtual_price,is_active';

type RawCase = Record<string, any> & { case_items: { weight: number; item: Item | null }[] };

function summarize(c: RawCase): CaseSummary {
  const items = c.case_items.map((ci) => ci.item).filter((i): i is Item => !!i && i.is_active);
  const top = items.reduce<Item | null>((m, i) => (!m || i.virtual_price > m.virtual_price ? i : m), null);
  return {
    id: c.id, slug: c.slug, name: c.name, description: c.description, price: Number(c.price),
    accent: c.accent, art: c.art, image_url: c.image_url, is_featured: c.is_featured,
    item_count: items.length,
    top_item: top && { id: top.id, name: top.name, rarity: top.rarity, art: top.art, image_url: top.image_url, virtual_price: Number(top.virtual_price) },
  };
}

export async function listCases(): Promise<CaseSummary[]> {
  const rows = check(
    await db()
      .from('cases')
      .select(`id,slug,name,description,price,accent,art,image_url,is_featured,sort_order,created_at,case_items(weight,item:items(${ITEM_COLS}))`)
      .eq('is_active', true)
      .order('sort_order'),
  ) as unknown as RawCase[];
  return rows.map(summarize);
}

export async function getCaseDetail(id: string): Promise<CaseDetail | null> {
  const rows = check(
    await db()
      .from('cases')
      .select(`id,slug,name,description,price,accent,art,image_url,is_featured,case_items(weight,item:items(${ITEM_COLS}))`)
      .eq('id', id)
      .eq('is_active', true)
      .limit(1),
  ) as unknown as RawCase[];
  const c = rows[0];
  if (!c) return null;
  const active = c.case_items.filter((ci) => ci.item?.is_active);
  const total = active.reduce((s, ci) => s + ci.weight, 0);
  const items = active
    .map((ci) => ({ ...(ci.item as Item), virtual_price: Number(ci.item!.virtual_price), weight: ci.weight, chance: total ? ci.weight / total : 0 }))
    .sort((a, b) => b.virtual_price - a.virtual_price);
  return { ...summarize(c), items };
}

export async function listEvents(limit = 14, includeDemo = true) {
  let q = db().from('game_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (!includeDemo) q = q.eq('is_demo', false);
  return check(await q);
}
