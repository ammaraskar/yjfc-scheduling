import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import TopBar from '@/components/TopBar'
import { getSchedule, EventClass, type ScheduleEvent } from '@/api'
import { eventMinutesForDay, liveStatus, statusDotColor } from '@/lib/liveStatus'
import { useAuth } from '@/auth'
import { AIRCRAFT } from '@/data/aircraft'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'

// ─── Date helpers ────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate();
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeCompact(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? 'a' : 'p';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

function currentMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function zuluTime(): string {
  const n = new Date();
  const h = String(n.getUTCHours()).padStart(2, '0');
  const m = String(n.getUTCMinutes()).padStart(2, '0');
  return `${h}${m}Z`;
}

function localTime(): string {
  const n = new Date();
  const h = n.getHours() % 12 || 12;
  const m = String(n.getMinutes()).padStart(2, '0');
  const s = n.getHours() < 12 ? 'a' : 'p';
  return `${h}:${m}${s}`;
}

// ─── Event parsing ───────────────────────────────────────────────────────────

function parseDestType(dest: string): { type: string; sub: string } {
  const sep = dest.indexOf(':');
  if (sep === -1) return { type: dest.trim(), sub: '' };
  return { type: dest.slice(0, sep).trim(), sub: dest.slice(sep + 1).trim() };
}

// ─── Timeline constants ──────────────────────────────────────────────────────

const GRID_START = 6 * 60;    // 6 am
const GRID_END   = 24 * 60;   // 12:00 am
const GRID_SPAN  = GRID_END - GRID_START; // 1080 min
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // [6..23]
const AIRCRAFT_COL_WIDTH = 150;

function hourLabel(h: number): string {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function toLeftPct(minutes: number): number {
  return Math.max(0, Math.min(100, (minutes - GRID_START) / GRID_SPAN * 100));
}

// ─── Event block styles ──────────────────────────────────────────────────────

type EventVisual = { bg: string; text: string; subText: string; dashed?: boolean; stripe?: boolean; overlay?: boolean };

const MAINT_STRIPE = 'repeating-linear-gradient(45deg,#8a3d2f 0 9px,#7c3526 9px 18px)';
// Overlay maintenance uses solid red distinct from the striped maint color so it's
// immediately obvious that a booked reservation has been superseded.
const OVLY_BG = '#dc2626';

function eventVisual(dest: string, classNames: EventClass[]): EventVisual {
  // Overlay maintenance: aircraft pulled from service on top of an existing reservation.
  // Renders above regular events (z-index) and uses a distinct solid red.
  if (classNames.includes(EventClass.Ovly)) {
    return { bg: OVLY_BG, text: '#ffffff', subText: 'rgba(255,255,255,0.85)', overlay: true };
  }
  if (classNames.includes(EventClass.Maint)) {
    return { bg: MAINT_STRIPE, text: '#ffffff', subText: 'rgba(255,255,255,0.85)', stripe: true };
  }
  const { type } = parseDestType(dest);
  switch (type) {
    case 'Training':
      return { bg: 'var(--club-gold)', text: '#2a2200', subText: 'rgba(42,34,0,0.7)' };
    case 'Rental':
    case 'Charter':
      return { bg: '#00355f', text: '#ffffff', subText: 'rgba(255,255,255,0.82)' };
    case 'Standby':
      return { bg: 'var(--card)', text: '#00355f', subText: 'var(--muted-foreground)', dashed: true };
    default:
      return { bg: '#00355f', text: '#ffffff', subText: 'rgba(255,255,255,0.82)' };
  }
}

// ─── Now line hook ───────────────────────────────────────────────────────────

function useNowMinutes(): number {
  const [min, setMin] = useState(currentMinutes);
  useEffect(() => {
    const id = setInterval(() => setMin(currentMinutes()), 30000);
    return () => clearInterval(id);
  }, []);
  return min;
}

// ─── Event block styles ──────────────────────────────────────────────────────

function formatTimeRange(event: ScheduleEvent): string {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const sameDay = startDate.getFullYear() === endDate.getFullYear() &&
                  startDate.getMonth() === endDate.getMonth() &&
                  startDate.getDate() === endDate.getDate();
  const endTime = formatTimeCompact(event.end);
  if (sameDay) return `${formatTimeCompact(event.start)}–${endTime}`;
  const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${formatTimeCompact(event.start)}–${endDateStr} ${endTime}`;
}

// ─── Horizontal view ─────────────────────────────────────────────────────────

function HorizEvent({ event, selectedDate }: { event: ScheduleEvent; selectedDate: Date }) {
  const { startMin, endMin } = eventMinutesForDay(event, selectedDate);
  const left  = toLeftPct(startMin);
  const width = toLeftPct(endMin) - left;
  if (width < 0.3) return null;

  const vis  = eventVisual(event.dest, event.classNames);
  const { sub } = parseDestType(event.dest);
  const name = event.name.trim() || sub;
  const detail = event.tagMsg.trim();
  const predone = event.classNames.includes(EventClass.Predone);
  const clipsLeft  = startMin < GRID_START;
  const clipsRight = endMin   > GRID_END;
  const rL = clipsLeft  ? 0 : 7;
  const rR = clipsRight ? 0 : 7;
  const lOff = clipsLeft  ? 0 : 2;
  const rOff = clipsRight ? 0 : 2;

  return (
    <div style={{
      position: 'absolute', top: 7, bottom: 7,
      left: `calc(${left}% + ${lOff}px)`, width: `calc(${width}% - ${lOff + rOff}px)`,
      background: vis.bg,
      border: vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderLeft: predone ? '3px solid #16a34a' : vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderRadius: `${rL}px ${rR}px ${rR}px ${rL}px`,
      padding: '5px 9px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
      overflow: 'hidden',
      color: vis.text,
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.18)',
      minWidth: 0,
      boxSizing: 'border-box',
      zIndex: vis.overlay ? 5 : undefined,
    }}>
      <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </span>
      <span style={{ fontSize: 11.5, color: vis.subText, whiteSpace: 'nowrap' }}>
        {formatTimeRange(event)}{detail ? ` · ${detail}` : ''}{predone && <span style={{ color: '#16a34a' }}> · ✓ precheck</span>}
      </span>
    </div>
  );
}

function HorizNowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < GRID_START || nowMin > GRID_END) return null;
  const left = toLeftPct(nowMin);
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: 2, background: 'var(--club-gold)', pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--club-gold)', border: '2px solid var(--card)', boxShadow: '0 0 0 1px var(--club-gold)' }} />
    </div>
  );
}

function HorizontalView({ eventsByTail, nowMin, aircraft, selectedDate }: { eventsByTail: Record<string, ScheduleEvent[]>; nowMin: number; aircraft: typeof AIRCRAFT; selectedDate: Date }) {
  return (
    <div style={{ display: 'flex', background: 'var(--card)' }}>
      {/* Aircraft sidebar */}
      <div style={{ width: AIRCRAFT_COL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Aircraft</span>
        </div>
        {aircraft.map((ac, i) => {
          const live = nowMin >= 0 ? liveStatus(eventsByTail[ac.tail] ?? [], nowMin, selectedDate) : null;
          const dotColor = live ? statusDotColor(live.status) : undefined;
          return (
            <div key={ac.tail} style={{ height: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', borderBottom: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <Link href={`/aircraft/${ac.tail}`}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--foreground)', cursor: 'pointer', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >{ac.tail}</span>
                </Link>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
              </div>
              {live && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{live.note}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 640 }}>
          {/* Hour header */}
          <div style={{ height: 40, display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
            {HOURS.map((h, i) => (
              <div key={h} style={{ flex: 1, borderLeft: i === 0 ? 'none' : '1px solid var(--border)', padding: '13px 0 0 5px', fontSize: 10.5, color: 'var(--muted-foreground)' }}>
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {/* Event rows */}
          <div style={{ position: 'relative', background: 'repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px calc(100%/18))' }}>
            {aircraft.map((ac, i) => (
              <div key={ac.tail} style={{ position: 'relative', height: 64, borderBottom: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {(eventsByTail[ac.tail] ?? []).map(ev => (
                  <HorizEvent key={ev.id} event={ev} selectedDate={selectedDate} />
                ))}
              </div>
            ))}
            <HorizNowLine nowMin={nowMin} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vertical view ────────────────────────────────────────────────────────────

const ROW_H = 42; // px per hour

function VertEvent({ event, selectedDate }: { event: ScheduleEvent; selectedDate: Date }) {
  const { startMin, endMin } = eventMinutesForDay(event, selectedDate);
  const topPct    = (startMin - GRID_START) / GRID_SPAN * 100;
  const heightPct = (endMin - startMin) / GRID_SPAN * 100;
  if (heightPct < 0.3) return null;

  const vis  = eventVisual(event.dest, event.classNames);
  const { sub } = parseDestType(event.dest);
  const name = event.name.trim() || sub;
  const predone = event.classNames.includes(EventClass.Predone);
  const clipsTop    = startMin < GRID_START;
  const clipsBottom = endMin   > GRID_END;
  const rT = clipsTop    ? 0 : 6;
  const rB = clipsBottom ? 0 : 6;
  const tOff = clipsTop    ? 0 : 2;
  const bOff = clipsBottom ? 0 : 2;

  return (
    <div style={{
      position: 'absolute', left: 3, right: 3,
      top: `calc(${topPct}% + ${tOff}px)`, height: `calc(${heightPct}% - ${tOff + bOff}px)`,
      background: vis.bg,
      border: vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderLeft: predone ? '3px solid #16a34a' : vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderRadius: `${rT}px ${rT}px ${rB}px ${rB}px`,
      padding: '5px 7px',
      overflow: 'hidden',
      color: vis.text,
      boxSizing: 'border-box',
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.15)',
      zIndex: vis.overlay ? 5 : undefined,
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 10.5, color: vis.subText, marginTop: 1, whiteSpace: 'nowrap' }}>
        {formatTimeRange(event)}{predone && <span style={{ color: '#166534' }}> · ✓ preflight</span>}
      </div>
    </div>
  );
}

function VertNowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < GRID_START || nowMin > GRID_END) return null;
  const topPct = (nowMin - GRID_START) / GRID_SPAN * 100;
  return (
    <div style={{ position: 'absolute', left: 54, right: 0, top: `${topPct}%`, height: 2, background: 'var(--club-gold)', pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--club-gold)', border: '2px solid var(--card)' }} />
    </div>
  );
}

function VerticalView({ eventsByTail, nowMin, aircraft, selectedDate }: { eventsByTail: Record<string, ScheduleEvent[]>; nowMin: number; aircraft: typeof AIRCRAFT; selectedDate: Date }) {
  const totalH = HOURS.length * ROW_H;
  return (
    <div style={{ background: 'var(--card)', overflowX: 'auto' }}>
      <div style={{ minWidth: 540 }}>
        {/* Column headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          <div style={{ width: 54, flexShrink: 0, borderRight: '1px solid var(--border)' }} />
          {aircraft.map((ac, i) => (
            <div key={ac.tail} style={{ flex: 1, height: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <Link href={`/aircraft/${ac.tail}`}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--foreground)', cursor: 'pointer', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >{ac.tail}</span>
              </Link>
              <span style={{ fontSize: 9.5, color: 'var(--muted-foreground)' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
            </div>
          ))}
        </div>
        {/* Body */}
        <div style={{ display: 'flex', height: totalH, position: 'relative' }}>
          {/* Hour gutter */}
          <div style={{ width: 54, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: ROW_H, fontSize: 10, color: 'var(--muted-foreground)', padding: '3px 0 0 7px', borderTop: '1px solid var(--border)' }}>
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {/* Aircraft columns */}
          {aircraft.map((ac, i) => (
            <div key={ac.tail} style={{ flex: 1, position: 'relative', borderRight: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none', background: `repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px ${ROW_H}px)` }}>
              {(eventsByTail[ac.tail] ?? []).map(ev => (
                <VertEvent key={ev.id} event={ev} selectedDate={selectedDate} />
              ))}
            </div>
          ))}
          <VertNowLine nowMin={nowMin} />
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListEvent({ event }: { event: ScheduleEvent }) {
  const { type, sub } = parseDestType(event.dest);
  const vis  = eventVisual(event.dest, event.classNames);
  const name = event.name.trim() || sub;
  const detail = event.tagMsg.trim();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', width: 110, flexShrink: 0, paddingTop: 1 }}>
        {formatTimeCompact(event.start)}–{formatTimeCompact(event.end)}
      </span>
      <span style={{ fontWeight: 700, fontSize: 11, background: '#003057', color: '#fff', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
        {event.tail}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px', flexShrink: 0, background: vis.bg, color: vis.text, border: vis.dashed ? '1px dashed #00355f' : undefined }}>
        {type}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {detail && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>with {detail}</div>}
      </div>
    </div>
  );
}

function ListView({ events }: { events: ScheduleEvent[] }) {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div style={{ background: 'var(--card)', padding: '0 16px' }}>
      {sorted.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
          No reservations
        </div>
      ) : (
        sorted.map(ev => <ListEvent key={ev.id} event={ev} />)
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = 'horizontal' | 'vertical' | 'list';

const VIEW_LABELS: Record<ViewMode, string> = {
  horizontal: '▦ Horizontal',
  vertical:   '▥ Vertical',
  list:       '☰ List',
};

export default function SchedulePage() {
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTails, setSelectedTails] = useState<Set<string>>(() => new Set(AIRCRAFT.map(a => a.tail)));
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('horizontal');
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nowMin = useNowMinutes();

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    getSchedule(session.userid, session.session, selectedDate, addDays(selectedDate, 1))
      .then(data => { setEvents(data); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [selectedDate, session]);

  const eventsByTail = events.reduce<Record<string, ScheduleEvent[]>>((acc, ev) => {
    if (ev.tail) (acc[ev.tail] ??= []).push(ev);
    return acc;
  }, {});

  const today = isToday(selectedDate);
  const allSelected = selectedTails.size === AIRCRAFT.length;
  const visibleAircraft = AIRCRAFT.filter(a => selectedTails.has(a.tail));

  function toggleTail(tail: string) {
    setSelectedTails(prev => {
      const next = new Set(prev);
      if (next.has(tail)) { next.delete(tail); } else { next.add(tail); }
      return next;
    });
  }

  const filteredEvents = events.filter(ev => !ev.tail || selectedTails.has(ev.tail));

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <TopBar />

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card" style={{ padding: '10px 16px', gap: 12, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          {/* Date navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: '4px 5px' }}>
            <button
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', borderRadius: 5, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}
            >‹</button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                style={{ fontWeight: 700, fontSize: 14, minWidth: 170, textAlign: 'center', userSelect: 'none', color: 'var(--foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 5 }}
              >
                {formatDayLabel(selectedDate)}
              </PopoverTrigger>
              <PopoverContent align="start" style={{ width: 'auto', padding: 0 }}>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={d => { if (d) { setSelectedDate(startOfDay(d)); setCalendarOpen(false); } }}
                  classNames={{
                    today: 'rounded-[var(--cell-radius)] ring-2 ring-club-gold ring-offset-1 font-bold data-[selected=true]:rounded-none',
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', borderRadius: 5, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}
            >›</button>
          </div>
          {/* Today button — only when not on today */}
          {!today && (
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 13px', cursor: 'pointer', background: 'var(--card)' }}
            >
              Today
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Aircraft filter */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px',
              background: allSelected ? 'var(--card)' : '#003057',
              color: allSelected ? 'var(--muted-foreground)' : '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              <SlidersHorizontal size={14} />
              {allSelected ? 'All aircraft' : `${selectedTails.size} aircraft`}
              <ChevronDown size={13} />
            </PopoverTrigger>
            <PopoverContent align="end" style={{ width: 200, padding: '8px 0' }}>
              <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Aircraft</span>
                <button
                  onClick={() => setSelectedTails(allSelected ? new Set() : new Set(AIRCRAFT.map(a => a.tail)))}
                  style={{ fontSize: 11, fontWeight: 600, color: '#003057', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {allSelected ? 'None' : 'All'}
                </button>
              </div>
              {AIRCRAFT.map(ac => (
                <label key={ac.tail} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selectedTails.has(ac.tail)}
                    onChange={() => toggleTail(ac.tail)}
                    style={{ accentColor: '#003057', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{ac.tail}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', marginLeft: 'auto' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
                </label>
              ))}
            </PopoverContent>
          </Popover>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', fontSize: 13, fontWeight: 600 }}>
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v, i) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 13px',
                  background: view === v ? '#003057' : 'var(--card)',
                  color: view === v ? '#fff' : 'var(--muted-foreground)',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend strip */}
      <div className="flex items-center justify-end border-b border-border bg-muted" style={{ padding: '7px 18px', fontSize: 12, gap: 14, flexWrap: 'wrap' as const }}>
        <LegendItem color="#00355f" label="Rental" />
        <LegendItem color="var(--club-gold)" label="Training" />
        <LegendItem color={undefined} label="Standby" dashed />
        <LegendItem color={undefined} label="Maintenance" stripe />
        <LegendItem color={OVLY_BG} label="Superseded" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: 'var(--card)', borderRadius: 0 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted-foreground)', fontSize: 14 }}>
            Loading schedule…
          </div>
        )}
        {error && (
          <div style={{ margin: 16, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <>
            {view === 'horizontal' && <HorizontalView eventsByTail={eventsByTail} nowMin={today ? nowMin : -1} aircraft={visibleAircraft} selectedDate={selectedDate} />}
            {view === 'vertical'   && <VerticalView   eventsByTail={eventsByTail} nowMin={today ? nowMin : -1} aircraft={visibleAircraft} selectedDate={selectedDate} />}
            {view === 'list'       && <ListView events={filteredEvents} />}
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div className="flex items-center justify-between border-t border-border bg-muted" style={{ padding: '8px 18px', fontSize: 11, color: 'var(--muted-foreground)' }}>
          <span>{visibleAircraft.length} aircraft · {filteredEvents.length} reservation{filteredEvents.length !== 1 ? 's' : ''}</span>
          <span>Local {localTime()} · {zuluTime()}</span>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, dashed, stripe }: { color?: string; label: string; dashed?: boolean; stripe?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', fontWeight: 500 }}>
      <span style={{
        width: 12, height: 12, borderRadius: 3,
        background: stripe ? MAINT_STRIPE : dashed ? undefined : color,
        border: dashed ? '1.5px dashed #00355f' : undefined,
        display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </span>
  );
}
