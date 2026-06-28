// WeekPage.tsx — exports WeekGrid (the week overview grid) and weekRangeLabel.
// The grid is embedded inside SchedulePage's view-toggle; there's no standalone page.

import { Link } from 'wouter'
import { EventClass, type ScheduleEvent, parseMaintDescription } from '@/api'
import type { Aircraft } from '@/data/aircraft'
import { Wrench } from 'lucide-react'
import { addDays, isToday } from '@/lib/dateUtils'
import { eventVisual, parseDestType } from '@/lib/eventVisual'
import { eventMinutesForDay } from '@/lib/liveStatus'

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_START    = 6 * 60;
const GRID_END      = 24 * 60;
const GRID_SPAN     = GRID_END - GRID_START;
export const WEEK_AC_COL_W = 110;
const CELL_H        = 44;
const MINI_BAR_INSET_PX = 1;
// Hourly grid from 6am to midnight
const DAY_GRID_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const DAY_TICK_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const DAY_LABEL_HOURS = [8, 14, 20]; // 8a, 2p, 8p

// NOW line styling (matches SchedulePage day view)
const NOW_LINE_COLOR = 'var(--club-gold)';
const NOW_LINE_OPACITY = 0.5;
const NOW_LINE_WIDTH = 1.5;

function toTimePct(minutes: number): number {
  return Math.max(0, Math.min(100, (minutes - GRID_START) / GRID_SPAN * 100));
}

function hourTickLabel(hour: number): string {
  if (hour === 24) return '12a';
  if (hour === 12) return '12p';
  if (hour > 12) return `${hour - 12}p`;
  return `${hour}a`;
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function weekRangeLabel(days: Date[]): string {
  const s  = days[0];
  const e  = days[6];
  const sm = s.toLocaleDateString('en-US', { month: 'short' });
  const em = e.toLocaleDateString('en-US', { month: 'short' });
  const yr = e.getFullYear();
  return sm === em
    ? `${sm} ${s.getDate()} – ${e.getDate()}, ${yr}`
    : `${sm} ${s.getDate()} – ${em} ${e.getDate()}, ${yr}`;
}

// Returns the [startIdx, endIdx] range within days[] that this event overlaps, or null.
// An event is "spanning" (multi-column) when startIdx < endIdx — it crosses at least one midnight.
function eventDayRange(event: ScheduleEvent, days: Date[]): { startIdx: number; endIdx: number } | null {
  const evStart = new Date(event.start);
  const evEnd   = new Date(event.end);
  let startIdx  = -1;
  let endIdx    = -1;

  for (let i = 0; i < days.length; i++) {
    const dStart = days[i];
    const dEnd   = addDays(days[i], 1);
    if (evStart < dEnd && evEnd > dStart) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    }
  }
  return startIdx === -1 ? null : { startIdx, endIdx };
}

// ─── Mini-timeline bar (single-day events inside a day cell) ──────────────────

function MiniBar({ event, day }: { event: ScheduleEvent; day: Date }) {
  const { startMin, endMin } = eventMinutesForDay(event, day);
  const left  = toTimePct(startMin);
  const width = toTimePct(endMin) - left;
  if (width < 0.3) return null;

  const vis = eventVisual(event.dest, event.classNames);
  return (
    <div style={{
      position: 'absolute',
      top: '50%', transform: 'translateY(-50%)',
      left: `calc(${left}% + ${MINI_BAR_INSET_PX}px)`,
      width: `max(2px, calc(${width}% - ${MINI_BAR_INSET_PX * 2}px))`,
      height: 26,
      background: vis.bg,
      borderRadius: 3,
      border: vis.dashed ? '1px dashed #00355f' : undefined,
      opacity: 0.9,
    }} />
  );
}

// ─── Day cell (mini-timeline for one aircraft on one day) ─────────────────────

function DayCell({ day, events, isLast, onClick }: {
  day: Date;
  events: ScheduleEvent[];
  isLast: boolean;
  onClick: () => void;
}) {
  const today = isToday(day);
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        height: CELL_H,
        position: 'relative',
        cursor: 'pointer',
        borderRight: isLast ? 'none' : '1px solid var(--border)',
        background: today ? 'rgba(212,160,23,0.06)' : undefined,
      }}
    >
      {DAY_GRID_HOURS.map(hour => (
        <div
          key={hour}
          style={{
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: `${toTimePct(hour * 60)}%`,
            width: 1,
            transform: 'translateX(-0.5px)',
            background: 'var(--border)',
            opacity: hour % 3 === 0 ? 0.8 : 0.5,
            pointerEvents: 'none',
          }}
        />
      ))}
      {events.map(ev => <MiniBar key={ev.id} event={ev} day={day} />)}
    </div>
  );
}

function WeekTimeRow() {
  return (
    <div style={{ display: 'flex', height: 24, borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
      <div style={{
        width: WEEK_AC_COL_W,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
      }}>
        <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
          Time
        </span>
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            position: 'relative',
            borderRight: i < 6 ? '1px solid var(--border)' : 'none',
          }}
        >
          {DAY_TICK_HOURS.map(hour => (
            <div
              key={hour}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 11,
                left: `${toTimePct(hour * 60)}%`,
                width: 1,
                transform: 'translateX(-0.5px)',
                background: 'var(--border)',
                opacity: hour % 3 === 0 ? 0.9 : 0.55,
              }}
            />
          ))}
          {DAY_LABEL_HOURS.map(hour => {
            return (
              <span
                key={hour}
                style={{
                  position: 'absolute',
                  bottom: 1,
                  left: `${toTimePct(hour * 60)}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 9.5,
                  color: 'var(--muted-foreground)',
                  fontWeight: 600,
                  letterSpacing: '.01em',
                  pointerEvents: 'none',
                }}
              >
                {hourTickLabel(hour)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── NOW line (current time indicator) ────────────────────────────────────────

function WeekNowLine({ nowMin, days }: { nowMin: number; days: Date[] }) {
  // Only show if nowMin is valid (>= 0) and within grid bounds
  if (nowMin < 0 || nowMin < GRID_START || nowMin > GRID_END) return null;

  // Find which column is today
  const todayIdx = days.findIndex(day => isToday(day));
  if (todayIdx === -1) return null;

  // Calculate position: (day column) + (time within that day)
  const colW = 100 / 7;
  const timePct = toTimePct(nowMin);
  const leftPct = todayIdx * colW + (timePct * colW / 100);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${leftPct}%`,
        width: NOW_LINE_WIDTH,
        background: NOW_LINE_COLOR,
        opacity: NOW_LINE_OPACITY,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  );
}

// ─── Spanning event banner ────────────────────────────────────────────────────
//
// Events that cross one or more midnight boundaries appear as a banner spanning
// the affected day columns rather than in individual cell mini-timelines.
// Applies equally to any event type: maintenance, rental, training, standby.
// Text (name + detail) is always rendered; overflow:ellipsis handles narrow banners.
// Minimum span is 2 columns so the name is always legible.

function SpanBanner({ event, startIdx, endIdx }: {
  event: ScheduleEvent;
  startIdx: number;
  endIdx: number;
}) {
  const vis     = eventVisual(event.dest, event.classNames);
  const isMaint = event.classNames.includes(EventClass.Maint) || event.classNames.includes(EventClass.Ovly);
  const predone = event.classNames.includes(EventClass.Predone);
  const { sub } = parseDestType(event.dest);
  const name    = isMaint ? 'Maintenance' : event.name.trim() || sub;
  const detail  = isMaint
    ? parseMaintDescription(event.info).trim()
    : (event.tagMsg.trim() || sub);

  // Position banner at actual start/end times, not column boundaries.
  // Events ending exactly at midnight (00:00) are treated as end-of-grid.
  const evStart       = new Date(event.start);
  const evEnd         = new Date(event.end);
  const startMinOfDay = evStart.getHours() * 60 + evStart.getMinutes();
  const endMinRaw     = evEnd.getHours()   * 60 + evEnd.getMinutes();
  const endMinOfDay   = endMinRaw === 0 ? GRID_END : endMinRaw;
  const colW          = 100 / 7;
  const leftPct       = startIdx * colW + toTimePct(startMinOfDay) * colW / 100;
  const rightPct      = endIdx   * colW + toTimePct(endMinOfDay)   * colW / 100;
  const widthPct      = Math.max(0.5, rightPct - leftPct);

  return (
    <div style={{
      position: 'absolute',
      top: 5, bottom: 5,
      left:  `${leftPct}%`,
      width: `${widthPct}%`,
      background: vis.bg,
      border:     vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderLeft: predone ? '3px solid #16a34a' : (vis.dashed ? '1.5px dashed #00355f' : undefined),
      borderRadius: 5,
      padding: '0 8px',
      display: 'flex', alignItems: 'center', gap: 5,
      overflow: 'hidden',
      color: vis.text,
      boxSizing: 'border-box' as const,
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.2)',
    }}>
      {isMaint && <Wrench size={12} style={{ flexShrink: 0 }} />}
      <span style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
        {name}
      </span>
      {detail && (
        <span style={{ fontSize: 11, color: vis.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 2 }}>
          · {detail}
        </span>
      )}
    </div>
  );
}

// ─── Week grid row (one aircraft across 7 days) ───────────────────────────────

function WeekRow({ ac, tailEvents, days, isLast, onSelectDay, nowMin }: {
  ac: Aircraft;
  tailEvents: ScheduleEvent[];
  days: Date[];
  isLast: boolean;
  onSelectDay: (date: Date) => void;
  nowMin: number;
}) {
  const spanning: Array<{ event: ScheduleEvent; startIdx: number; endIdx: number }> = [];
  const dayMap: Record<number, ScheduleEvent[]> = {};

  for (const ev of tailEvents) {
    const range = eventDayRange(ev, days);
    if (!range) continue;
    if (range.startIdx < range.endIdx) {
      spanning.push({ event: ev, startIdx: range.startIdx, endIdx: range.endIdx });
    } else {
      (dayMap[range.startIdx] ??= []).push(ev);
    }
  }

  return (
    <div style={{ display: 'flex', height: CELL_H, borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      {/* Aircraft label */}
      <div style={{
        width: WEEK_AC_COL_W,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 10px',
      }}>
        <Link href={`/aircraft/${ac.tail}`}>
          <span
            style={{ fontWeight: 600, fontSize: 13, color: 'var(--foreground)', cursor: 'pointer', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >{ac.tail}</span>
        </Link>
        <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
      </div>

      {/* Day cells + spanning banner overlay */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Layer 1: clickable day cells with mini-timelines */}
        <div style={{ display: 'flex', height: '100%' }}>
          {days.map((day, i) => (
            <DayCell
              key={i}
              day={day}
              events={dayMap[i] ?? []}
              isLast={i === 6}
              onClick={() => onSelectDay(day)}
            />
          ))}
        </div>

        {/* Layer 2: spanning event banners — pointer-events:none keeps day cells clickable */}
        {spanning.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {spanning.map(({ event, startIdx, endIdx }) => (
              <SpanBanner key={event.id} event={event} startIdx={startIdx} endIdx={endIdx} />
            ))}
          </div>
        )}

        {/* Layer 3: NOW line indicator */}
        <WeekNowLine nowMin={nowMin} days={days} />
      </div>
    </div>
  );
}

// ─── Week grid header ─────────────────────────────────────────────────────────

function WeekHeader({ days }: { days: Date[] }) {
  return (
    <div style={{ display: 'flex', background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: WEEK_AC_COL_W, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '8px 10px', display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted-foreground)' }}>Aircraft</span>
      </div>
      {days.map((day, i) => {
        const today        = isToday(day);
        const firstOfMonth = day.getDate() === 1;
        const dayName      = day.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr      = firstOfMonth
          ? day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : String(day.getDate());
        return (
          <div key={i} style={{
            flex: 1,
            textAlign: 'center',
            padding: '5px 0',
            borderRight: i < 6 ? '1px solid var(--border)' : 'none',
            background: today ? 'rgba(212,160,23,0.1)' : undefined,
          }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{dayName}</div>
            <div style={{ fontSize: 13, fontWeight: today ? 700 : 500, color: today ? 'var(--club-gold)' : 'var(--foreground)' }}>{dateStr}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WeekGrid ─────────────────────────────────────────────────────────────────

export function WeekGrid({ days, events, visibleAircraft, onSelectDay, nowMin }: {
  days: Date[];
  events: ScheduleEvent[];
  visibleAircraft: Aircraft[];
  onSelectDay: (date: Date) => void;
  nowMin?: number;
}) {
  const eventsByTail = events.reduce<Record<string, ScheduleEvent[]>>((acc, ev) => {
    if (ev.tail) (acc[ev.tail] ??= []).push(ev);
    return acc;
  }, {});

  return (
    <div>
      <WeekHeader days={days} />
      {visibleAircraft.map((ac, i) => (
        <WeekRow
          key={ac.tail}
          ac={ac}
          tailEvents={eventsByTail[ac.tail] ?? []}
          days={days}
          isLast={i === visibleAircraft.length - 1}
          onSelectDay={onSelectDay}
          nowMin={nowMin ?? -1}
        />
      ))}
      <WeekTimeRow />
    </div>
  );
}
