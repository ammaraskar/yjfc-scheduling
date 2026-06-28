import { EventClass, type ScheduleEvent } from '@/api';

export type LiveStatus = 'available' | 'in_use' | 'maintenance';

function minutesToTimeCompact(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h < 12 ? 'a' : 'p';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

function minuteOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function eventMinutesForDay(event: ScheduleEvent, date: Date): { startMin: number; endMin: number } {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return {
    startMin: startDate < date ? 0 : minuteOfDay(event.start),
    endMin: endDate >= nextDay ? 24 * 60 : minuteOfDay(event.end),
  };
}

// Walk forward through back-to-back events to find when the aircraft is truly free.
function chainedFreeMinute(events: ScheduleEvent[], startFreeMin: number, date: Date): number {
  let freeMin = startFreeMin;
  let changed = true;
  while (changed) {
    changed = false;
    for (const ev of events) {
      const { startMin, endMin } = eventMinutesForDay(ev, date);
      if (startMin <= freeMin && endMin > freeMin) {
        freeMin = endMin;
        changed = true;
        break;
      }
    }
  }
  return freeMin;
}

export function liveStatus(
  events: ScheduleEvent[],
  nowMin: number,
  date: Date,
): { status: LiveStatus; note: string; shortNote: string } {
  if (nowMin >= 0) {
    const current = events.find(ev => {
      const { startMin, endMin } = eventMinutesForDay(ev, date);
      return startMin <= nowMin && endMin > nowMin;
    });
    if (current) {
      if (current.classNames.includes(EventClass.Maint) || current.classNames.includes(EventClass.Ovly)) {
        return { status: 'maintenance', note: 'Maintenance', shortNote: 'Maintenance' };
      }
      const { endMin } = eventMinutesForDay(current, date);
      const freeMin = chainedFreeMinute(events, endMin, date);
      const freeAt = minutesToTimeCompact(freeMin);
      return { status: 'in_use', note: `In use · free at ${freeAt}`, shortNote: `free at ${freeAt}` };
    }
    const next = events
      .filter(ev => eventMinutesForDay(ev, date).startMin > nowMin)
      .sort((a, b) => eventMinutesForDay(a, date).startMin - eventMinutesForDay(b, date).startMin)[0];
    if (next) {
      const till = minutesToTimeCompact(eventMinutesForDay(next, date).startMin);
      return { status: 'available', note: `Available · till ${till}`, shortNote: `Avail · till ${till}` };
    }
  }
  return { status: 'available', note: 'Available', shortNote: 'Avail' };
}

export function statusDotColor(s: LiveStatus): string {
  switch (s) {
    case 'available':   return '#1f9d57';
    case 'in_use':      return 'var(--club-gold)';
    case 'maintenance': return '#8a3d2f';
  }
}
