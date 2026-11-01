import type { Rarity } from '@/lib/types';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const RARITY: Record<Rarity, { label: string; color: string; from: string; to: string; rank: number }> = {
  common:    { label: 'Обычный',      color: '#9ca3af', from: '#d1d5db', to: '#6b7280', rank: 0 },
  uncommon:  { label: 'Необычный',    color: '#5fbf7a', from: '#9be3ae', to: '#2f8f4d', rank: 1 },
  rare:      { label: 'Редкий',       color: '#4c8dff', from: '#9cc0ff', to: '#2a5bc4', rank: 2 },
  epic:      { label: 'Эпический',    color: '#a95bff', from: '#d2a8ff', to: '#6d2fc4', rank: 3 },
  legendary: { label: 'Легендарный',  color: '#ffb02e', from: '#ffe08a', to: '#c77800', rank: 4 },
  mythic:    { label: 'Мифический',   color: '#ff4560', from: '#ff9aa9', to: '#b3122b', rank: 5 },
};

export const rarityOf = (r: string) => RARITY[(r in RARITY ? r : 'common') as Rarity];
