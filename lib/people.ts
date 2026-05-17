import type { Profile } from './types';

export function displayLabel(userId: string, profiles: Profile[], me: string | null): string {
  const p = profiles.find(x => x.user_id === userId);
  if (!p) return '?';
  if (me && userId === me) return `${p.emoji} 나`;
  return `${p.emoji} ${p.display_name}`;
}

export function userInitial(userId: string, profiles: Profile[]): string {
  const p = profiles.find(x => x.user_id === userId);
  return p?.emoji ?? '?';
}

export function actorLabels(userIds: string[], profiles: Profile[], me: string | null): string {
  if (userIds.length === 0) return '';
  if (userIds.length === 1) return displayLabel(userIds[0], profiles, me);
  const others = userIds.filter(id => id !== me);
  const includesMe = me ? userIds.includes(me) : false;
  if (includesMe && others.length > 0) {
    return '나 + ' + others.map(id => displayLabel(id, profiles, null).replace(/^.+ /, '')).join(', ');
  }
  return userIds.map(id => displayLabel(id, profiles, me)).join(', ');
}
