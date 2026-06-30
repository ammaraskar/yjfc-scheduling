import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Link } from 'wouter'
import TopBar from '@/components/TopBar'
import { getSchedule, EventClass, SessionExpiredError, type ScheduleEvent, fetchMetar, displayId, formatWind, formatVisib, formatClouds, formatUpdated, fltCatColor, type MetarResponse, parseMaintDescription } from '@/api'
import { eventMinutesForDay, liveStatus, statusDotColor } from '@/lib/liveStatus'
import { useAuth } from '@/auth'
import { AIRCRAFT } from '@/data/aircraft'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SlidersHorizontal, ChevronDown, Wrench } from 'lucide-react'
import { startOfDay, addDays, isToday, toDateParam, sundayOfWeek } from '@/lib/dateUtils'
import { parseDestType, parseDestAirport, eventVisual, MAINT_STRIPE, OVLY_BG, formatTimeRange } from '@/lib/eventVisual'
import { WeekGrid, weekRangeLabel, weekRangeLabelCompact } from './WeekPage'
import { NewEventCard, REGULAR_DEFAULT_DURATION, type DraftState, type DestType, type CardPos, minToCompact } from '@/components/NewEventCard'
import { TRAINER_SLOTS, type SchedulingType } from '@/data/aircraft'


// ─── Portrait detection ───────────────────────────────────────────────────────

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return portrait;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayLabelCompact(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

// ─── Timeline constants ──────────────────────────────────────────────────────

const GRID_START = 6 * 60;    // 6 am
const GRID_END   = 24 * 60;   // 12:00 am
const GRID_SPAN  = GRID_END - GRID_START; // 1080 min
const EVENT_EDGE_CLIP_END = 23 * 60 + 30; // Keep off-screen edge treatment at 11:30 pm
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

const DRAFT_MIN_DURATION = 30;

function snapMin(min: number): number {
  return Math.round(min / 30) * 30;
}

function clampNum(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function snapTrainer(min: number): number {
  return TRAINER_SLOTS.reduce((best, s) =>
    Math.abs(s - min) < Math.abs(best - min) ? s : best
  , TRAINER_SLOTS[0]);
}


function trainerNextSlot(afterMin: number): number {
  return TRAINER_SLOTS.find(s => s > afterMin) ?? GRID_END;
}

function trainerPrevSlot(beforeMin: number): number {
  return [...TRAINER_SLOTS].reverse().find(s => s < beforeMin) ?? TRAINER_SLOTS[0];
}

function hasOverlap(events: ScheduleEvent[], startMin: number, endMin: number, date: Date): boolean {
  return events.some(ev => {
    const { startMin: evStart, endMin: evEnd } = eventMinutesForDay(ev, date);
    return startMin < evEnd && endMin > evStart;
  });
}

// ─── METAR hook ──────────────────────────────────────────────────────────────

const METAR_REFRESH_MS = 5 * 60 * 1000;

function useMetar(stationId: string): MetarResponse | null {
  const [metar, setMetar] = useState<MetarResponse | null>(null);
  useEffect(() => {
    function load() {
      fetchMetar(stationId).then(setMetar).catch(() => {/* silently ignore */});
    }
    load();
    const id = setInterval(load, METAR_REFRESH_MS);
    return () => clearInterval(id);
  }, [stationId]);
  return metar;
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

const NOW_LINE_COLOR = 'var(--club-gold)';
const NOW_LINE_OPACITY = 0.7;
const NOW_MARKER_OPACITY = 0.85;
const NOW_LINE_THICKNESS = 2;
const NOW_MARKER_SIZE = 10;
const NOW_DASH_LEN = 6;
const NOW_DASH_GAP = 4;

const NOW_MARKER_OFFSET = -(NOW_MARKER_SIZE - NOW_LINE_THICKNESS) / 2;

const NOW_LINE_STYLE = {
  opacity: NOW_LINE_OPACITY,
  pointerEvents: 'none' as const,
  zIndex: 10,
};

const NOW_MARKER_STYLE = {
  position: 'absolute' as const,
  width: NOW_MARKER_SIZE,
  height: NOW_MARKER_SIZE,
  borderRadius: '50%',
  background: NOW_LINE_COLOR,
  opacity: NOW_MARKER_OPACITY,
  border: '2px solid var(--card)',
  boxShadow: `0 0 0 1px ${NOW_LINE_COLOR}`,
};

// ─── Horizontal view ─────────────────────────────────────────────────────────

function HorizEvent({ event, selectedDate }: { event: ScheduleEvent; selectedDate: Date }) {
  const { startMin, endMin } = eventMinutesForDay(event, selectedDate);
  const left  = toLeftPct(startMin);
  const width = toLeftPct(endMin) - left;
  if (width < 0.3) return null;

  const vis  = eventVisual(event.dest, event.classNames);
  const { sub } = parseDestType(event.dest);
  const isMaint = event.classNames.includes(EventClass.Maint);
  const name = isMaint ? 'Maintenance' : event.name.trim() || sub;
  const detail = isMaint ? parseMaintDescription(event.info).trim() : event.tagMsg.trim();
  const predone = event.classNames.includes(EventClass.Predone);
  const clipsLeft  = startMin < GRID_START;
  const clipsRight = endMin   > EVENT_EDGE_CLIP_END;
  const rL = clipsLeft  ? 0 : 7;
  const rR = clipsRight ? 0 : 7;
  const lOff = clipsLeft  ? 0 : 2;
  const rOff = clipsRight ? 0 : 2;

  const airport = parseDestAirport(event.dest);
  
  // Truncate description if too long (max ~40 chars)
  const truncateDesc = (desc: string): string => {
    if (desc.length > 40) return desc.substring(0, 37) + '...';
    return desc;
  };

  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: 'absolute', top: 7, bottom: 7,
      left: `calc(${left}% + ${lOff}px)`, width: `calc(${width}% - ${lOff + rOff}px)`,
      background: vis.bg,
      border: vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderLeft: predone ? '3px solid #16a34a' : vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderRadius: `${rL}px ${rR}px ${rR}px ${rL}px`,
      padding: '5px 9px',
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6,
      overflow: 'hidden',
      color: vis.text,
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.18)',
      minWidth: 0,
      boxSizing: 'border-box',
      zIndex: vis.overlay ? 5 : undefined,
    }}>
      {isMaint && <Wrench size={16} style={{ flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </span>
        <span style={{ fontSize: 11.5, color: vis.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isMaint ? truncateDesc(detail) : `${formatTimeRange(event)}${detail ? ` · ${detail}` : ''}`}
          {predone && <span style={{ color: '#16a34a' }}> · ✓ precheck</span>}
        </span>
      </div>
      {airport && (
        <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, background: 'rgba(255,255,255,0.18)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.03em' }}>
          {airport}
        </span>
      )}
    </div>
  );
}

// Draft chip rendered directly in the horizontal timeline row
function DraftHorizChip({ startMin, endMin, destType, schedulingType, onChangeTimes }: {
  startMin: number; endMin: number; destType: DestType; schedulingType: SchedulingType;
  onChangeTimes: (start: number, end: number) => void;
}) {
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const left  = toLeftPct(startMin);
  const width = toLeftPct(endMin) - left;
  if (width < 0.3) return null;

  const vis       = eventVisual(`${destType}:`, []);
  const gripColor = vis.text === '#ffffff' ? 'rgba(255,255,255,0.65)' : 'rgba(0,53,95,0.4)';

  function startDrag(target: 'start' | 'end' | 'move', e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const anchorX     = e.clientX;
    const anchorStart = startMin;
    const anchorEnd   = endMin;
    const row   = (e.currentTarget as HTMLElement).closest('[data-timeline-row]');
    const trackW = row?.getBoundingClientRect().width ?? 640;

    function onMove(ev: PointerEvent) {
      const deltaMin = (ev.clientX - anchorX) / trackW * GRID_SPAN;
      const dur = anchorEnd - anchorStart;
      let ns = anchorStart, ne = anchorEnd;
      if (schedulingType === 'trainer') {
        if (target === 'start') {
          ns = snapTrainer(anchorStart + deltaMin);
          if (ns >= anchorEnd) ns = trainerPrevSlot(anchorEnd);
        } else if (target === 'end') {
          ne = snapTrainer(anchorEnd + deltaMin);
          if (ne <= anchorStart) ne = trainerNextSlot(anchorStart);
        } else {
          ns = snapTrainer(anchorStart + deltaMin);
          ne = trainerNextSlot(ns - 1 + dur); // preserve slot span
          if (ns >= ne) ne = trainerNextSlot(ns);
        }
      } else {
        if (target === 'start') {
          ns = snapMin(clampNum(anchorStart + deltaMin, GRID_START, anchorEnd - DRAFT_MIN_DURATION));
        } else if (target === 'end') {
          ne = snapMin(clampNum(anchorEnd + deltaMin, anchorStart + DRAFT_MIN_DURATION, GRID_END));
        } else {
          ns = snapMin(clampNum(anchorStart + deltaMin, GRID_START, GRID_END - dur));
          ne = ns + dur;
        }
      }
      onChangeTimes(ns, ne);
    }

    function onEnd() {
      window.removeEventListener('pointermove',   onMove);
      window.removeEventListener('pointerup',     onEnd);
      window.removeEventListener('pointercancel', onEnd);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      cleanupRef.current = null;
    }

    document.body.style.cursor     = target === 'move' ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove',   onMove);
    window.addEventListener('pointerup',     onEnd);
    window.addEventListener('pointercancel', onEnd);
    cleanupRef.current = onEnd;
  }

  const HANDLE_W = 18;
  const gripBars = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
      <div style={{ width: 2, height: 12, borderRadius: 1, background: gripColor }} />
      <div style={{ width: 2, height: 12, borderRadius: 1, background: gripColor }} />
    </div>
  );

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 6, bottom: 6,
        left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`,
        background: vis.bg,
        border: vis.dashed ? '1.5px dashed #00355f' : 'none',
        borderRadius: 7,
        boxShadow: '0 0 0 2px var(--card), 0 0 0 3.5px #003057, 0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
        cursor: 'grab', userSelect: 'none', touchAction: 'none',
        zIndex: 20,
      }}
      onPointerDown={(e) => startDrag('move', e)}
    >
      <div
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: HANDLE_W, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ew-resize', touchAction: 'none' }}
        onPointerDown={(e) => { e.stopPropagation(); startDrag('start', e); }}
      >
        {gripBars}
      </div>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: vis.text, overflow: 'hidden', whiteSpace: 'nowrap', padding: `0 ${HANDLE_W + 2}px`, pointerEvents: 'none' }}>
        {minToCompact(startMin)} – {minToCompact(endMin)}
      </div>
      <div
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: HANDLE_W, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ew-resize', touchAction: 'none' }}
        onPointerDown={(e) => { e.stopPropagation(); startDrag('end', e); }}
      >
        {gripBars}
      </div>
    </div>
  );
}

function HoverHorizChip({ startMin, endMin }: { startMin: number; endMin: number }) {
  const left  = toLeftPct(startMin);
  const width = toLeftPct(endMin) - left;
  if (width < 0.3) return null;
  return (
    <div style={{
      position: 'absolute', top: 6, bottom: 6,
      left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`,
      background: 'rgba(0,53,95,0.28)',
      borderRadius: 7,
      pointerEvents: 'none',
      zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
        {minToCompact(startMin)} – {minToCompact(endMin)}
      </span>
    </div>
  );
}

function HorizNowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < GRID_START || nowMin > GRID_END) return null;
  const left = toLeftPct(nowMin);
  return (
    <div style={{
      ...NOW_LINE_STYLE,
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: `${left}%`,
      width: NOW_LINE_THICKNESS,
      backgroundImage: `repeating-linear-gradient(to bottom, ${NOW_LINE_COLOR} 0 ${NOW_DASH_LEN}px, transparent ${NOW_DASH_LEN}px ${NOW_DASH_LEN + NOW_DASH_GAP}px)`,
    }}>
      <div style={{ ...NOW_MARKER_STYLE, top: NOW_MARKER_OFFSET, left: NOW_MARKER_OFFSET }} />
    </div>
  );
}

function HorizontalView({ eventsByTail, nowMin, aircraft, selectedDate, onSlotClick, draft, onDraftChange }: { eventsByTail: Record<string, ScheduleEvent[]>; nowMin: number; aircraft: typeof AIRCRAFT; selectedDate: Date; onSlotClick: (tail: string, clickedMin: number, cx: number, cy: number, rect: DOMRect) => void; draft: DraftState | null; onDraftChange: (start: number, end: number) => void }) {
  const [hover, setHover] = useState<{ tail: string; startMin: number; valid: boolean } | null>(null);
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
              <div
                key={ac.tail}
                data-timeline-row=""
                style={{ position: 'relative', height: 64, borderBottom: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none', cursor: !draft && hover?.tail === ac.tail && !hover.valid ? 'default' : 'cell' }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onSlotClick(ac.tail, GRID_START + ((e.clientX - rect.left) / rect.width) * GRID_SPAN, e.clientX, e.clientY, rect);
                }}
                onMouseMove={(e) => {
                  if (draft) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const raw = GRID_START + ((e.clientX - rect.left) / rect.width) * GRID_SPAN;
                  const startMin = ac.schedulingType === 'trainer'
                    ? snapTrainer(raw)
                    : snapMin(clampNum(raw, GRID_START, GRID_END - REGULAR_DEFAULT_DURATION));
                  const endMin = ac.schedulingType === 'trainer'
                    ? trainerNextSlot(startMin)
                    : Math.min(startMin + REGULAR_DEFAULT_DURATION, GRID_END);
                  const valid = !hasOverlap(eventsByTail[ac.tail] ?? [], startMin, endMin, selectedDate);
                  setHover({ tail: ac.tail, startMin, valid });
                }}
                onMouseLeave={() => setHover(null)}
              >
                {(eventsByTail[ac.tail] ?? []).map(ev => (
                  <HorizEvent key={ev.id} event={ev} selectedDate={selectedDate} />
                ))}
                {!draft && hover?.tail === ac.tail && hover.valid && (
                  <HoverHorizChip
                    startMin={hover.startMin}
                    endMin={ac.schedulingType === 'trainer' ? trainerNextSlot(hover.startMin) : Math.min(hover.startMin + REGULAR_DEFAULT_DURATION, GRID_END)}
                  />
                )}
                {draft?.tail === ac.tail && (
                  <DraftHorizChip
                    startMin={draft.startMin}
                    endMin={draft.endMin}
                    destType={draft.destType}
                    schedulingType={ac.schedulingType}
                    onChangeTimes={onDraftChange}
                  />
                )}
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
const VERT_TIME_COL_W = 32;
const VERT_AIRCRAFT_COL_MIN_W = 96;

function VertEvent({ event, selectedDate }: { event: ScheduleEvent; selectedDate: Date }) {
  const { startMin, endMin } = eventMinutesForDay(event, selectedDate);
  const clipsTop    = startMin < GRID_START;
  const clipsBottom = endMin   > EVENT_EDGE_CLIP_END;

  // Clamp to grid bounds (mirrors toLeftPct clamping in the horizontal view)
  const visStart  = Math.max(startMin, GRID_START);
  const visEnd    = Math.min(endMin, GRID_END);
  const topPct    = (visStart - GRID_START) / GRID_SPAN * 100;
  const heightPct = (visEnd - visStart) / GRID_SPAN * 100;
  if (heightPct < 0.3) return null;

  const vis  = eventVisual(event.dest, event.classNames);
  const { sub } = parseDestType(event.dest);
  const isMaint = event.classNames.includes(EventClass.Maint);
  const name = isMaint ? 'Maintenance' : event.name.trim() || sub;
  const predone = event.classNames.includes(EventClass.Predone);
  const airport = parseDestAirport(event.dest);
  const rT = clipsTop    ? 0 : 6;
  const rB = clipsBottom ? 0 : 6;
  const tOff = clipsTop    ? 0 : 2;
  const bOff = clipsBottom ? 0 : 2;

  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: 'absolute', left: 3, right: 3,
      top: `calc(${topPct}% + ${tOff}px)`, height: `calc(${heightPct}% - ${tOff + bOff}px)`,
      background: vis.bg,
      border: vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderTop: predone ? '3px solid #16a34a' : vis.dashed ? '1.5px dashed #00355f' : undefined,
      borderRadius: `${rT}px ${rT}px ${rB}px ${rB}px`,
      padding: '5px 7px',
      overflow: 'hidden',
      color: vis.text,
      boxSizing: 'border-box',
      boxShadow: vis.dashed ? 'none' : '0 1px 3px rgba(0,0,0,.15)',
      zIndex: vis.overlay ? 5 : undefined,
    }}>
      {isMaint && <Wrench size={14} style={{ marginBottom: 3 }} />}
      {predone && <div style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', marginBottom: 2 }}>✓ precheck</div>}
      <div style={{ fontWeight: 600, fontSize: 12, overflowWrap: 'break-word' }}>{name}</div>
      <div style={{ fontSize: 10.5, color: vis.subText, marginTop: 1, overflowWrap: 'break-word' }}>
        {isMaint ? parseMaintDescription(event.info).trim() : formatTimeRange(event)}
      </div>
      {airport && (
        <div style={{ marginTop: 3 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(255,255,255,0.18)', borderRadius: 3, padding: '1px 4px' }}>
            {airport}
          </span>
        </div>
      )}
    </div>
  );
}

// Draft chip rendered directly in the vertical timeline column
function DraftVertChip({ startMin, endMin, destType, schedulingType, onChangeTimes }: {
  startMin: number; endMin: number; destType: DestType; schedulingType: SchedulingType;
  onChangeTimes: (start: number, end: number) => void;
}) {
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const visStart  = Math.max(startMin, GRID_START);
  const visEnd    = Math.min(endMin, GRID_END);
  const topPct    = (visStart - GRID_START) / GRID_SPAN * 100;
  const heightPct = (visEnd - visStart) / GRID_SPAN * 100;
  if (heightPct < 0.3) return null;

  const vis       = eventVisual(`${destType}:`, []);
  const gripColor = vis.text === '#ffffff' ? 'rgba(255,255,255,0.65)' : 'rgba(0,53,95,0.4)';
  const colH      = HOURS.length * ROW_H; // known constant, no DOM measurement needed

  const HANDLE_H = 14;

  function startDrag(target: 'start' | 'end' | 'move', e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const anchorY     = e.clientY;
    const anchorStart = startMin;
    const anchorEnd   = endMin;

    function onMove(ev: PointerEvent) {
      const deltaMin = (ev.clientY - anchorY) / colH * GRID_SPAN;
      const dur = anchorEnd - anchorStart;
      let ns = anchorStart, ne = anchorEnd;
      if (schedulingType === 'trainer') {
        if (target === 'start') {
          ns = snapTrainer(anchorStart + deltaMin);
          if (ns >= anchorEnd) ns = trainerPrevSlot(anchorEnd);
        } else if (target === 'end') {
          ne = snapTrainer(anchorEnd + deltaMin);
          if (ne <= anchorStart) ne = trainerNextSlot(anchorStart);
        } else {
          ns = snapTrainer(anchorStart + deltaMin);
          ne = trainerNextSlot(ns - 1 + dur);
          if (ns >= ne) ne = trainerNextSlot(ns);
        }
      } else {
        if (target === 'start') {
          ns = snapMin(clampNum(anchorStart + deltaMin, GRID_START, anchorEnd - DRAFT_MIN_DURATION));
        } else if (target === 'end') {
          ne = snapMin(clampNum(anchorEnd + deltaMin, anchorStart + DRAFT_MIN_DURATION, GRID_END));
        } else {
          ns = snapMin(clampNum(anchorStart + deltaMin, GRID_START, GRID_END - dur));
          ne = ns + dur;
        }
      }
      onChangeTimes(ns, ne);
    }

    function onEnd() {
      window.removeEventListener('pointermove',   onMove);
      window.removeEventListener('pointerup',     onEnd);
      window.removeEventListener('pointercancel', onEnd);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      cleanupRef.current = null;
    }

    document.body.style.cursor     = target === 'move' ? 'grabbing' : 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove',   onMove);
    window.addEventListener('pointerup',     onEnd);
    window.addEventListener('pointercancel', onEnd);
    cleanupRef.current = onEnd;
  }

  const gripBars = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
      <div style={{ width: 14, height: 2, borderRadius: 1, background: gripColor }} />
      <div style={{ width: 14, height: 2, borderRadius: 1, background: gripColor }} />
    </div>
  );

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', left: 3, right: 3,
        top: `calc(${topPct}% + 2px)`, height: `calc(${heightPct}% - 4px)`,
        background: vis.bg,
        border: vis.dashed ? '1.5px dashed #00355f' : 'none',
        borderRadius: 6,
        boxShadow: '0 0 0 2px var(--card), 0 0 0 3px #003057, 0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        cursor: 'grab', userSelect: 'none', touchAction: 'none',
        zIndex: 20,
      }}
      onPointerDown={(e) => startDrag('move', e)}
    >
      <div
        style={{ height: HANDLE_H, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize', touchAction: 'none', flexShrink: 0 }}
        onPointerDown={(e) => { e.stopPropagation(); startDrag('start', e); }}
      >
        {gripBars}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: vis.text, overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 4px', pointerEvents: 'none' }}>
        {minToCompact(startMin)}–{minToCompact(endMin)}
      </div>
      <div
        style={{ height: HANDLE_H, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize', touchAction: 'none', flexShrink: 0 }}
        onPointerDown={(e) => { e.stopPropagation(); startDrag('end', e); }}
      >
        {gripBars}
      </div>
    </div>
  );
}

function HoverVertChip({ startMin, endMin }: { startMin: number; endMin: number }) {
  const visStart  = Math.max(startMin, GRID_START);
  const visEnd    = Math.min(endMin, GRID_END);
  const topPct    = (visStart - GRID_START) / GRID_SPAN * 100;
  const heightPct = (visEnd - visStart) / GRID_SPAN * 100;
  if (heightPct < 0.3) return null;
  return (
    <div style={{
      position: 'absolute', left: 3, right: 3,
      top: `calc(${topPct}% + 2px)`, height: `calc(${heightPct}% - 4px)`,
      background: 'rgba(0,53,95,0.28)',
      borderRadius: 6,
      pointerEvents: 'none',
      zIndex: 5,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
        {minToCompact(startMin)}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
        {minToCompact(endMin)}
      </span>
    </div>
  );
}

function VertNowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < GRID_START || nowMin > GRID_END) return null;
  const topPct = (nowMin - GRID_START) / GRID_SPAN * 100;
  return (
    <div style={{
      ...NOW_LINE_STYLE,
      position: 'absolute',
      left: VERT_TIME_COL_W,
      right: 0,
      top: `${topPct}%`,
      height: NOW_LINE_THICKNESS,
      backgroundImage: `repeating-linear-gradient(to right, ${NOW_LINE_COLOR} 0 ${NOW_DASH_LEN}px, transparent ${NOW_DASH_LEN}px ${NOW_DASH_LEN + NOW_DASH_GAP}px)`,
    }}>
      <div style={{ ...NOW_MARKER_STYLE, left: NOW_MARKER_OFFSET, top: NOW_MARKER_OFFSET }} />
    </div>
  );
}

function VerticalView({ eventsByTail, nowMin, aircraft, selectedDate, onSlotClick, draft, onDraftChange }: { eventsByTail: Record<string, ScheduleEvent[]>; nowMin: number; aircraft: typeof AIRCRAFT; selectedDate: Date; onSlotClick: (tail: string, clickedMin: number, cx: number, cy: number, rect: DOMRect) => void; draft: DraftState | null; onDraftChange: (start: number, end: number) => void }) {
  const [hover, setHover] = useState<{ tail: string; startMin: number; valid: boolean } | null>(null);
  const totalH = HOURS.length * ROW_H;
  const minGridWidth = VERT_TIME_COL_W + aircraft.length * VERT_AIRCRAFT_COL_MIN_W;
  return (
    <div style={{ background: 'var(--card)', overflowX: 'auto' }}>
      <div style={{ minWidth: minGridWidth }}>
        {/* Column headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          <div style={{ width: VERT_TIME_COL_W, flexShrink: 0, borderRight: '1px solid var(--border)' }} />
          {aircraft.map((ac, i) => {
            const live = nowMin >= 0 ? liveStatus(eventsByTail[ac.tail] ?? [], nowMin, selectedDate) : null;
            const dotColor = live ? statusDotColor(live.status) : undefined;
            return (
              <div key={ac.tail} style={{ flex: 1, height: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <Link href={`/aircraft/${ac.tail}`}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--foreground)', cursor: 'pointer', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >{ac.tail}</span>
                </Link>
                <span style={{ fontSize: 9.5, color: 'var(--muted-foreground)' }}>{ac.makeModel.split(' ')[1] ?? ''}</span>
                {live && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{live.shortNote}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Body */}
        <div style={{ display: 'flex', height: totalH, position: 'relative' }}>
          {/* Hour gutter */}
          <div style={{ width: VERT_TIME_COL_W, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: ROW_H, fontSize: 10, color: 'var(--muted-foreground)', padding: '3px 0 0 5px', borderTop: '1px solid var(--border)' }}>
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {/* Aircraft columns */}
          {aircraft.map((ac, i) => (
            <div
              key={ac.tail}
              style={{ flex: 1, position: 'relative', borderRight: i < aircraft.length - 1 ? '1px solid var(--border)' : 'none', background: `repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px ${ROW_H}px)`, cursor: !draft && hover?.tail === ac.tail && !hover.valid ? 'default' : 'cell' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onSlotClick(ac.tail, GRID_START + ((e.clientY - rect.top) / rect.height) * GRID_SPAN, e.clientX, e.clientY, rect);
              }}
              onMouseMove={(e) => {
                if (draft) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const raw = GRID_START + ((e.clientY - rect.top) / rect.height) * GRID_SPAN;
                const startMin = ac.schedulingType === 'trainer'
                  ? snapTrainer(raw)
                  : snapMin(clampNum(raw, GRID_START, GRID_END - REGULAR_DEFAULT_DURATION));
                const endMin = ac.schedulingType === 'trainer'
                  ? trainerNextSlot(startMin)
                  : Math.min(startMin + REGULAR_DEFAULT_DURATION, GRID_END);
                const valid = !hasOverlap(eventsByTail[ac.tail] ?? [], startMin, endMin, selectedDate);
                setHover({ tail: ac.tail, startMin, valid });
              }}
              onMouseLeave={() => setHover(null)}
            >
              {(eventsByTail[ac.tail] ?? []).map(ev => (
                <VertEvent key={ev.id} event={ev} selectedDate={selectedDate} />
              ))}
              {!draft && hover?.tail === ac.tail && hover.valid && (
                <HoverVertChip
                  startMin={hover.startMin}
                  endMin={ac.schedulingType === 'trainer' ? trainerNextSlot(hover.startMin) : Math.min(hover.startMin + REGULAR_DEFAULT_DURATION, GRID_END)}
                />
              )}
              {draft?.tail === ac.tail && (
                <DraftVertChip
                  startMin={draft.startMin}
                  endMin={draft.endMin}
                  destType={draft.destType}
                  schedulingType={ac.schedulingType}
                  onChangeTimes={onDraftChange}
                />
              )}
            </div>
          ))}
          <VertNowLine nowMin={nowMin} />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { session, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [viewMode, setViewMode]         = useState<'day' | 'week'>('day');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTails, setSelectedTails] = useState<Set<string>>(() => new Set(AIRCRAFT.filter(a => a.type !== 'sim').map(a => a.tail)));
  const [filterOpen, setFilterOpen] = useState(false);
  const portrait = usePortrait();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nowMin = useNowMinutes();
  const metar  = useMetar('KPDK');

  const [draft, setDraft]     = useState<DraftState | null>(null);
  const [cardPos, setCardPos] = useState<CardPos>({ x: 0, y: 0 });

  function handleSlotClick(tail: string, clickedMin: number, clickX: number, clickY: number, anchorRect: DOMRect) {
    const ac = AIRCRAFT.find(a => a.tail === tail);
    const isTrainer = ac?.schedulingType === 'trainer';
    const startMin = isTrainer
      ? snapTrainer(clickedMin)
      : snapMin(clampNum(clickedMin, GRID_START, GRID_END - REGULAR_DEFAULT_DURATION));
    const endMin = isTrainer
      ? trainerNextSlot(startMin)
      : Math.min(startMin + REGULAR_DEFAULT_DURATION, GRID_END);
    if (hasOverlap(eventsByTail[tail] ?? [], startMin, endMin, selectedDate)) return;
    const CARD_W = 296;
    const CARD_H = 310;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    setDraft({ tail, startMin, endMin, destType: 'Rental', notes: '' });

    if (anchorRect.width > anchorRect.height) {
      // Horizontal row: card below the row, horizontally centred on click
      const y = Math.max(72, Math.min(anchorRect.bottom + 8, vh - CARD_H - 8));
      const x = Math.max(8, Math.min(clickX - CARD_W / 2, vw - CARD_W - 8));
      setCardPos({ x, y });
    } else if (vw >= 600) {
      // Wide screen vertical column: card to the right (or left) of column
      let x = anchorRect.right + 8;
      if (x + CARD_W > vw - 8) x = Math.max(8, anchorRect.left - CARD_W - 8);
      const y = Math.max(72, Math.min(clickY - CARD_H / 3, vh - CARD_H - 8));
      setCardPos({ x, y });
    } else {
      // Narrow screen vertical view: compute chip screen coords, place card above
      // or below whichever side has more room, centred in the viewport.
      const chipTopPx    = anchorRect.top + (startMin - GRID_START) / GRID_SPAN * anchorRect.height;
      const chipBottomPx = anchorRect.top + (endMin   - GRID_START) / GRID_SPAN * anchorRect.height;
      const roomAbove = chipTopPx - 72;          // space between toolbar and chip top
      const roomBelow = vh - chipBottomPx - 8;   // space between chip bottom and screen bottom
      let y: number;
      if (roomAbove >= CARD_H || roomAbove >= roomBelow) {
        y = Math.max(72, chipTopPx - CARD_H - 8);
      } else {
        y = Math.min(chipBottomPx + 8, vh - CARD_H - 8);
      }
      const x = Math.max(8, Math.min((vw - CARD_W) / 2, vw - CARD_W - 8));
      setCardPos({ x, y });
    }
  }

  function handleDraftChange(startMin: number, endMin: number) {
    setDraft(d => d ? { ...d, startMin, endMin } : d);
  }

  const weekStart = sundayOfWeek(selectedDate);
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const fetchKey  = viewMode === 'week'
    ? `week-${toDateParam(weekStart)}`
    : `day-${toDateParam(selectedDate)}`;

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    const start = viewMode === 'week' ? weekStart : selectedDate;
    const end   = viewMode === 'week' ? addDays(weekStart, 7) : addDays(selectedDate, 1);
    getSchedule(session.userid, session.session, start, end)
      .then(data => { setEvents(data); setLoading(false); })
      .catch(err  => {
        if (err instanceof SessionExpiredError) { logout(); return; }
        console.log(err); setError(String(err)); setLoading(false);
      });
  // weekStart/selectedDate are stable for a given fetchKey
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, session]);

  const eventsByTail = events.reduce<Record<string, ScheduleEvent[]>>((acc, ev) => {
    if (ev.tail) (acc[ev.tail] ??= []).push(ev);
    return acc;
  }, {});

  const today           = isToday(selectedDate);
  const allSelected     = selectedTails.size === AIRCRAFT.length;
  const visibleAircraft = AIRCRAFT.filter(a => selectedTails.has(a.tail));
  const showTodayBtn    = viewMode === 'day' ? !today : !days.some(d => isToday(d));
  const dateLabel = viewMode === 'week'
    ? (portrait ? weekRangeLabelCompact(days) : weekRangeLabel(days))
    : (portrait ? formatDayLabelCompact(selectedDate) : formatDayLabel(selectedDate));

  function toggleTail(tail: string) {
    setSelectedTails(prev => {
      const next = new Set(prev);
      if (next.has(tail)) { next.delete(tail); } else { next.add(tail); }
      return next;
    });
  }

  function prevPeriod() {
    setSelectedDate(d => addDays(viewMode === 'week' ? weekStart : d, viewMode === 'week' ? -7 : -1));
  }
  function nextPeriod() {
    setSelectedDate(d => addDays(viewMode === 'week' ? weekStart : d, viewMode === 'week' ? 7 : 1));
  }

  const filteredEvents = events.filter(ev => !ev.tail || selectedTails.has(ev.tail));

  return (
    <div className="h-screen flex flex-col bg-muted overflow-hidden">
      <TopBar />

      {/* Toolbar */}
      <div className="flex items-center border-b border-border bg-card" style={{ padding: portrait ? '6px 10px' : '10px 16px', gap: portrait ? 6 : 12, overflow: 'hidden' }}>
        {/* Date / week navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: '4px 5px', flexShrink: 0 }}>
          <button
            onClick={prevPeriod}
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', borderRadius: 5, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}
          >‹</button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              style={{ fontWeight: 700, fontSize: portrait ? 13 : 14, minWidth: portrait ? 0 : (viewMode === 'week' ? 190 : 170), textAlign: 'center', userSelect: 'none', color: 'var(--foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 5 }}
            >
              {dateLabel}
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
            onClick={nextPeriod}
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', borderRadius: 5, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}
          >›</button>
        </div>
        {showTodayBtn && !portrait && (
          <button
            onClick={() => setSelectedDate(startOfDay(new Date()))}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 13px', cursor: 'pointer', background: 'var(--card)', flexShrink: 0 }}
          >
            Today
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Day / Week toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('day')}
            style={{ padding: portrait ? '6px 10px' : '6px 14px', background: viewMode === 'day' ? '#003057' : 'var(--card)', color: viewMode === 'day' ? '#fff' : 'var(--muted-foreground)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >Day</button>
          <button
            onClick={() => setViewMode('week')}
            style={{ padding: portrait ? '6px 10px' : '6px 14px', background: viewMode === 'week' ? '#003057' : 'var(--card)', color: viewMode === 'week' ? '#fff' : 'var(--muted-foreground)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderLeft: '1px solid var(--border)' }}
          >Week</button>
        </div>
        {/* Aircraft filter */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px',
            background: allSelected ? 'var(--card)' : '#003057',
            color: allSelected ? 'var(--muted-foreground)' : '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>
            <SlidersHorizontal size={14} />
            {portrait
              ? (allSelected ? 'All' : `${selectedTails.size}`)
              : (allSelected ? 'All aircraft' : `${selectedTails.size} aircraft`)}
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
      </div>

      {/* Legend strip */}
      <div className="flex items-center justify-between border-b border-border bg-muted" style={{ padding: '7px 18px', fontSize: 12, gap: 14, flexWrap: 'wrap' as const }}>
        <MetarStrip metar={metar} />
        <div className="flex items-center flex-wrap" style={{ gap: 14 }}>
          <LegendItem color="#00355f" label="Rental" />
          <LegendItem color="var(--club-gold)" label="Training" />
          <LegendItem color={undefined} label="Standby" dashed className="hidden sm:flex" />
          <LegendItem color={undefined} label={<><span className="hidden sm:inline">Maintenance</span><span className="sm:hidden">MX</span></>} stripe />
          <LegendItem color={OVLY_BG} label="Superseded" className="hidden sm:flex" />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: 'var(--card)', borderRadius: 0, overflowY: 'auto', overflowX: 'hidden' }}>
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
          viewMode === 'week'
            ? (
              <WeekGrid
                days={days}
                events={filteredEvents}
                visibleAircraft={visibleAircraft}
                onSelectDay={day => { setSelectedDate(day); setViewMode('day'); }}
                nowMin={nowMin}
                portrait={portrait}
              />
            )
            : portrait
              ? <VerticalView   eventsByTail={eventsByTail} nowMin={today ? nowMin : -1} aircraft={visibleAircraft} selectedDate={selectedDate} onSlotClick={handleSlotClick} draft={draft} onDraftChange={handleDraftChange}/>
              : <HorizontalView eventsByTail={eventsByTail} nowMin={today ? nowMin : -1} aircraft={visibleAircraft} selectedDate={selectedDate} onSlotClick={handleSlotClick} draft={draft} onDraftChange={handleDraftChange}/>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div className="flex items-center justify-between border-t border-border bg-muted" style={{ padding: '8px 18px', fontSize: 11, color: 'var(--muted-foreground)' }}>
          {viewMode === 'week' ? (
            <>
              <span className="hidden sm:inline">{visibleAircraft.length} aircraft · {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} this week</span>
              <span>Each cell is a 6a–midnight timeline. Tap a cell to switch to day view.</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{visibleAircraft.length} aircraft · {filteredEvents.length} reservation{filteredEvents.length !== 1 ? 's' : ''}</span>
              <span>Local {localTime()} · {zuluTime()}</span>
            </>
          )}
        </div>
      )}
      {draft && (
        <NewEventCard
          draft={draft}
          pos={cardPos}
          schedulingType={AIRCRAFT.find(a => a.tail === draft.tail)?.schedulingType ?? 'regular'}
          hasConflict={hasOverlap(eventsByTail[draft.tail] ?? [], draft.startMin, draft.endMin, selectedDate)}
          onUpdate={(changes) => setDraft(d => d ? { ...d, ...changes } : d)}
          onClose={() => setDraft(null)}
          onCreate={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function MetarStrip({ metar }: { metar: MetarResponse | null }) {
  if (!metar) return null;
  const id = displayId(metar.icaoId);
  const wind = formatWind(metar.wdir, metar.wspd, metar.wgst);
  const vis = formatVisib(metar.visib);
  const clouds = formatClouds(metar.clouds, metar.cover);
  const catColor = fltCatColor(metar.fltCat);
  const updated = formatUpdated(metar.receiptTime);

  const badge = (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: catColor, borderRadius: 4, padding: '1px 6px', lineHeight: '16px' }}>
      {metar.fltCat}
    </span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, color: 'var(--muted-foreground)' }}>
      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--foreground)' }}>{id}</span>

      {/* On sm+: badge inline with no tooltip */}
      <span className="hidden sm:inline">{badge}</span>

      {/* On narrow: badge is tooltip trigger; details shown inside tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="sm:hidden" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            {badge}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {vis} · {clouds} · {metar.temp}°C · Updated {updated}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <span style={{ fontWeight: 500 }}><span className="hidden sm:inline">Wind </span>{wind}</span>

      {/* Extra details hidden on narrow screens */}
      <span className="hidden sm:contents">
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>{vis}</span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>{clouds}</span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>{metar.temp}°C</span>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.7 }}>Updated {updated}</span>
      </span>
    </div>
  );
}

function LegendItem({ color, label, dashed, stripe, className }: { color?: string; label: ReactNode; dashed?: boolean; stripe?: boolean; className?: string }) {
  return (
    <span className={`flex items-center text-[10px] sm:text-xs font-medium text-muted-foreground${className ? ` ${className}` : ''}`} style={{ gap: 6 }}>
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
