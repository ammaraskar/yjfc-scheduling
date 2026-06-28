import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import { getSchedule, type ScheduleEvent } from '@/api'
import { useAuth } from '@/auth'
import { AIRCRAFT, statusColor } from '@/data/aircraft'

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

function minuteOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
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

const GRID_START = 6 * 60;   // 6 am
const GRID_END   = 21 * 60;  // 9 pm
const GRID_SPAN  = GRID_END - GRID_START; // 900 min
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // [6..21]

function hourLabel(h: number): string {
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function toLeftPct(minutes: number): number {
  return Math.max(0, Math.min(100, (minutes - GRID_START) / GRID_SPAN * 100));
}

// ─── Event block styles ──────────────────────────────────────────────────────

type EventVisual = { bg: string; text: string; subText: string; dashed?: boolean; stripe?: boolean };

const MAINT_STRIPE = 'repeating-linear-gradient(45deg,#8a3d2f 0 9px,#7c3526 9px 18px)';

function eventVisual(dest: string, className: string): EventVisual {
  if (className === 'maint') {
    return { bg: MAINT_STRIPE, text: '#ffffff', subText: 'rgba(255,255,255,0.85)', stripe: true };
  }
  const { type } = parseDestType(dest);
  switch (type) {
    case 'Training':
      return { bg: '#EAAA00', text: '#2a2200', subText: 'rgba(42,34,0,0.7)' };
    case 'Rental':
    case 'Charter':
      return { bg: '#00355f', text: '#ffffff', subText: 'rgba(255,255,255,0.82)' };
    case 'Standby':
      return { bg: '#ffffff', text: '#00355f', subText: '#5b6f82', dashed: true };
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

// ─── Horizontal view ─────────────────────────────────────────────────────────

function HorizEvent({ event }: { event: ScheduleEvent }) {
  const startMin = minuteOfDay(event.start);
  const endMin   = minuteOfDay(event.end);
  const left  = toLeftPct(startMin);
  const width = toLeftPct(endMin) - left;
  if (width < 0.3) return null;

  const vis  = eventVisual(event.dest, event.className);
  const { sub } = parseDestType(event.dest);
  const name = event.name.trim() || sub;
  const detail = event.tagMsg.trim();
  const predone = event.className === 'predone';

  return (
    <div style={{
      position: 'absolute', top: 7, bottom: 7,
      left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`,
      background: vis.bg,
      border: vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderRadius: 7,
      padding: '5px 9px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
      overflow: 'hidden',
      color: vis.text,
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.18)',
      minWidth: 0,
      boxSizing: 'border-box',
    }}>
      <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: vis.subText, whiteSpace: 'nowrap' }}>
        {formatTimeCompact(event.start)}–{formatTimeCompact(event.end)}{detail ? ` · ${detail}` : ''}
      </span>
      {predone && (
        <div style={{ position: 'absolute', top: 5, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1 }}>✓</div>
      )}
    </div>
  );
}

function HorizNowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < GRID_START || nowMin > GRID_END) return null;
  const left = toLeftPct(nowMin);
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: 2, background: '#EAAA00', pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#EAAA00', border: '2px solid #fff', boxShadow: '0 0 0 1px #EAAA00' }} />
    </div>
  );
}

function HorizontalView({ eventsByTail, nowMin }: { eventsByTail: Record<string, ScheduleEvent[]>; nowMin: number }) {
  return (
    <div style={{ display: 'flex', background: '#fff' }}>
      {/* Aircraft sidebar */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #e6e9ee' }}>
        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid #eef1f4', background: '#fbfcfd' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: '#8a94a0', textTransform: 'uppercase' }}>Aircraft</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9aa4ae' }}>{AIRCRAFT.length}</span>
        </div>
        {AIRCRAFT.map((ac, i) => {
          const dotColor = statusColor(ac.status);
          return (
            <div key={ac.tail} style={{ height: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', borderBottom: i < AIRCRAFT.length - 1 ? '1px solid #eef1f4' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 14, color: '#003057' }}>{ac.tail}</span>
                <span style={{ fontSize: 11, color: '#8a94a0' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#6b7682', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ac.statusNote}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 640 }}>
          {/* Hour header */}
          <div style={{ height: 40, display: 'flex', borderBottom: '1px solid #eef1f4', background: '#fbfcfd' }}>
            {HOURS.map((h, i) => (
              <div key={h} style={{ flex: 1, borderLeft: i === 0 ? 'none' : '1px solid #eef1f4', padding: '13px 0 0 5px', fontSize: 10.5, color: '#8a94a0', fontFamily: "'IBM Plex Mono', monospace" }}>
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {/* Event rows */}
          <div style={{ position: 'relative', background: 'repeating-linear-gradient(90deg,#f1f4f7 0 1px,transparent 1px calc(100%/16))' }}>
            {AIRCRAFT.map((ac, i) => (
              <div key={ac.tail} style={{ position: 'relative', height: 64, borderBottom: i < AIRCRAFT.length - 1 ? '1px solid #eef1f4' : 'none' }}>
                {(eventsByTail[ac.tail] ?? []).map(ev => (
                  <HorizEvent key={ev.id} event={ev} />
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

function VertEvent({ event }: { event: ScheduleEvent }) {
  const startMin = minuteOfDay(event.start);
  const endMin   = minuteOfDay(event.end);
  const topPct    = (startMin - GRID_START) / GRID_SPAN * 100;
  const heightPct = (endMin - startMin) / GRID_SPAN * 100;
  if (heightPct < 0.3) return null;

  const vis  = eventVisual(event.dest, event.className);
  const { sub } = parseDestType(event.dest);
  const name = event.name.trim() || sub;
  const predone = event.className === 'predone';

  return (
    <div style={{
      position: 'absolute', left: 3, right: 3,
      top: `calc(${topPct}% + 2px)`, height: `calc(${heightPct}% - 4px)`,
      background: vis.bg,
      border: vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderRadius: 6,
      padding: '5px 7px',
      overflow: 'hidden',
      color: vis.text,
      boxSizing: 'border-box',
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.15)',
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: vis.subText, marginTop: 1 }}>
        {formatTimeCompact(event.start)}–{formatTimeCompact(event.end)}
      </div>
      {predone && (
        <div style={{ position: 'absolute', top: 5, right: 5, width: 14, height: 14, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700, lineHeight: 1 }}>✓</div>
      )}
    </div>
  );
}

function VertNowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < GRID_START || nowMin > GRID_END) return null;
  const topPct = (nowMin - GRID_START) / GRID_SPAN * 100;
  return (
    <div style={{ position: 'absolute', left: 54, right: 0, top: `${topPct}%`, height: 2, background: '#EAAA00', pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#EAAA00', border: '2px solid #fff' }} />
    </div>
  );
}

function VerticalView({ eventsByTail, nowMin }: { eventsByTail: Record<string, ScheduleEvent[]>; nowMin: number }) {
  const totalH = HOURS.length * ROW_H;
  return (
    <div style={{ background: '#fff', overflowX: 'auto' }}>
      <div style={{ minWidth: 540 }}>
        {/* Column headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e6e9ee', background: '#fbfcfd' }}>
          <div style={{ width: 54, flexShrink: 0, borderRight: '1px solid #eef1f4' }} />
          {AIRCRAFT.map((ac, i) => (
            <div key={ac.tail} style={{ flex: 1, height: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: i < AIRCRAFT.length - 1 ? '1px solid #eef1f4' : 'none' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 12, color: '#003057' }}>{ac.tail}</span>
              <span style={{ fontSize: 9.5, color: '#9aa4ae' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
            </div>
          ))}
        </div>
        {/* Body */}
        <div style={{ display: 'flex', height: totalH, position: 'relative' }}>
          {/* Hour gutter */}
          <div style={{ width: 54, flexShrink: 0, borderRight: '1px solid #eef1f4', display: 'flex', flexDirection: 'column' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: ROW_H, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#8a94a0', padding: '3px 0 0 7px', borderTop: '1px solid #eef1f4' }}>
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {/* Aircraft columns */}
          {AIRCRAFT.map((ac, i) => (
            <div key={ac.tail} style={{ flex: 1, position: 'relative', borderRight: i < AIRCRAFT.length - 1 ? '1px solid #eef1f4' : 'none', background: `repeating-linear-gradient(0deg,#f1f4f7 0 1px,transparent 1px ${ROW_H}px)` }}>
              {(eventsByTail[ac.tail] ?? []).map(ev => (
                <VertEvent key={ev.id} event={ev} />
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
  const vis  = eventVisual(event.dest, event.className);
  const name = event.name.trim() || sub;
  const detail = event.tagMsg.trim();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #eef1f4' }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6b7a8d', width: 110, flexShrink: 0, paddingTop: 1 }}>
        {formatTimeCompact(event.start)}–{formatTimeCompact(event.end)}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 11, background: '#003057', color: '#fff', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
        {event.tail}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px', flexShrink: 0, background: vis.bg, color: vis.text, border: vis.dashed ? '1px dashed #00355f' : undefined }}>
        {type}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a202c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {detail && <div style={{ fontSize: 11, color: '#6b7a8d', marginTop: 1 }}>with {detail}</div>}
      </div>
    </div>
  );
}

function ListView({ events }: { events: ScheduleEvent[] }) {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div style={{ background: '#fff', padding: '0 16px' }}>
      {sorted.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#9aa5b4', fontStyle: 'italic' }}>
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f7f9fb' }}>
      <TopBar />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #eef1f4', background: '#fff', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Date navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e1e6eb', borderRadius: 8, padding: '4px 5px' }}>
            <button
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7682', borderRadius: 5, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}
            >‹</button>
            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 170, textAlign: 'center', userSelect: 'none' }}>
              {formatDayLabel(selectedDate)}
            </span>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7682', borderRadius: 5, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}
            >›</button>
          </div>
          {/* Today button — only when not on today */}
          {!today && (
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              style={{ fontSize: 13, fontWeight: 600, color: '#003057', border: '1px solid #cdd5dd', borderRadius: 8, padding: '6px 13px', cursor: 'pointer', background: '#fff' }}
            >
              Today
            </button>
          )}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid #e1e6eb', borderRadius: 8, overflow: 'hidden', fontSize: 13, fontWeight: 600 }}>
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 13px',
                background: view === v ? '#003057' : '#fff',
                color: view === v ? '#fff' : '#5b6675',
                borderLeft: i > 0 ? '1px solid #e1e6eb' : 'none',
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

      {/* Legend strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '7px 18px', background: '#f7f9fb', borderBottom: '1px solid #eef1f4', fontSize: 12, gap: 14, flexWrap: 'wrap' }}>
        <LegendItem color="#00355f" label="Rental" />
        <LegendItem color="#EAAA00" label="Training" />
        <LegendItem color={undefined} label="Standby" dashed />
        <LegendItem color={undefined} label="Maintenance" stripe />
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 0 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9aa5b4', fontSize: 14 }}>
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
            {view === 'horizontal' && <HorizontalView eventsByTail={eventsByTail} nowMin={today ? nowMin : -1} />}
            {view === 'vertical'   && <VerticalView   eventsByTail={eventsByTail} nowMin={today ? nowMin : -1} />}
            {view === 'list'       && <ListView events={events} />}
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderTop: '1px solid #eef1f4', background: '#fbfcfd', fontSize: 11, color: '#9aa4ae' }}>
          <span>{AIRCRAFT.length} aircraft · {events.length} reservation{events.length !== 1 ? 's' : ''}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Local {localTime()} · {zuluTime()}</span>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, dashed, stripe }: { color?: string; label: string; dashed?: boolean; stripe?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5b6675', fontWeight: 500 }}>
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
