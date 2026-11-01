import { route, pageParams } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { db, check } from '@/lib/supabase/admin';

const ITEM = 'id,name,rarity,art,image_url,virtual_price';
const TYPES = ['cases', 'items', 'sales', 'upgrades', 'roulette', 'blackjack', 'balance'] as const;
type HType = (typeof TYPES)[number];

export const GET = route({}, async ({ user, query }) => {
  const type = (query.get('type') ?? 'cases') as HType;
  if (!TYPES.includes(type)) throw new ApiError(400, 'validation', 'Неизвестный раздел истории');
  const { page, size, from, to } = pageParams(query);
  const uid = user.id;
  const c = db();
  let q: any;
  switch (type) {
    case 'cases':
      q = c.from('case_openings').select(`id,price_paid,created_at,roll,nonce,server_seed_hash,client_seed,case:cases(name,accent),item:items(${ITEM})`, { count: 'exact' })
        .eq('user_id', uid).order('created_at', { ascending: false });
      break;
    case 'items':
      q = c.from('user_items').select(`id,status,source,acquired_at,item:items(${ITEM})`, { count: 'exact' })
        .eq('user_id', uid).order('acquired_at', { ascending: false });
      break;
    case 'sales':
      q = c.from('user_items').select(`id,sold_price,closed_at,item:items(${ITEM})`, { count: 'exact' })
        .eq('user_id', uid).eq('status', 'sold').order('closed_at', { ascending: false });
      break;
    case 'upgrades':
      q = c.from('upgrades').select(`id,chance_bp,success,created_at,roll,nonce,server_seed_hash,client_seed,input:items!upgrades_input_item_id_fkey(${ITEM}),target:items!upgrades_target_item_id_fkey(${ITEM})`, { count: 'exact' })
        .eq('user_id', uid).order('created_at', { ascending: false });
      break;
    case 'roulette':
      q = c.from('roulette_bets').select('id,bet_type,bet_value,amount,payout,created_at,round:roulette_rounds(round_no,result,result_color,status)', { count: 'exact' })
        .eq('user_id', uid).order('created_at', { ascending: false });
      break;
    case 'blackjack':
      q = c.from('blackjack_games').select('id,bet,outcome,payout,created_at,nonce,server_seed_hash,client_seed', { count: 'exact' })
        .eq('user_id', uid).eq('status', 'finished').order('created_at', { ascending: false });
      break;
    default:
      q = c.from('transactions').select('id,type,amount,balance_after,meta,created_at', { count: 'exact' })
        .eq('user_id', uid).order('created_at', { ascending: false });
  }
  const res = await q.range(from, to);
  const rows = check(res);
  return { type, page, size, total: res.count ?? 0, rows };
});
