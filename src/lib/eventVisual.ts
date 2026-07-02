import { EventClass } from '@/api';

export const MAINT_STRIPE = 'repeating-linear-gradient(45deg,#8a3d2f 0 9px,#7c3526 9px 18px)';
export const OVLY_BG = '#dc2626';

export type EventVisual = { bg: string; text: string; subText: string; dashed?: boolean; stripe?: boolean; overlay?: boolean };

export function parseDestType(dest: string): { type: string; sub: string } {
  const sep = dest.indexOf(':');
  if (sep === -1) return { type: dest.trim(), sub: '' };
  return { type: dest.slice(0, sep).trim(), sub: dest.slice(sep + 1).trim() };
}

export function parseDestAirport(dest: string): string | null {
  const { type, sub } = parseDestType(dest);
  if (type === 'Training' || type === 'Student Solo') return null;
  const token = sub.split(/[;\s]/)[0].toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(token) ? token : null;
}

export function eventVisual(dest: string, classNames: EventClass[]): EventVisual {
  if (classNames.includes(EventClass.Ovly)) {
    return { bg: OVLY_BG, text: '#ffffff', subText: 'rgba(255,255,255,0.85)', overlay: true };
  }
  if (classNames.includes(EventClass.Maint)) {
    return { bg: MAINT_STRIPE, text: '#ffffff', subText: 'rgba(255,255,255,0.85)', stripe: true };
  }
  if (classNames.includes(EventClass.Stby)) {
    return { bg: 'var(--card)', text: 'var(--club-navy-light)', subText: 'var(--muted-foreground)', dashed: true };
  }
  const { type } = parseDestType(dest);
  switch (type) {
    case 'Training':
    case 'Student Solo':
      return { bg: 'var(--club-gold)', text: '#2a2200', subText: 'rgba(42,34,0,0.7)' };
    case 'Local':
    case 'CrossCountry':
    case 'Rental':
    case 'Charter':
      return { bg: 'var(--club-navy-light)', text: '#ffffff', subText: 'rgba(255,255,255,0.82)' };
    case 'Standby':
      return { bg: 'var(--card)', text: 'var(--club-navy-light)', subText: 'var(--muted-foreground)', dashed: true };
    default:
      return { bg: 'var(--club-navy-light)', text: '#ffffff', subText: 'rgba(255,255,255,0.82)' };
  }
}

export function formatTimeCompact(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? 'a' : 'p';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

export function formatTimeRange(event: { start: string; end: string }): string {
  const startDate = new Date(event.start);
  const endDate   = new Date(event.end);
  const sameDay   = startDate.getFullYear() === endDate.getFullYear() &&
                    startDate.getMonth()     === endDate.getMonth() &&
                    startDate.getDate()      === endDate.getDate();
  const endTime = formatTimeCompact(event.end);
  if (sameDay) return `${formatTimeCompact(event.start)}–${endTime}`;
  const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${formatTimeCompact(event.start)}–${endDateStr} ${endTime}`;
}
