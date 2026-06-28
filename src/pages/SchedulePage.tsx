import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import { getSchedule, type ScheduleEvent } from '@/api'
import { useAuth } from '@/auth'

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function parseDestType(dest: string): { type: string; sub: string } {
  const sep = dest.indexOf(':');
  if (sep === -1) return { type: dest, sub: '' };
  return { type: dest.slice(0, sep), sub: dest.slice(sep + 1) };
}

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  Training: { background: '#e8f0fb', color: '#2952a3', border: '1px solid #bed0f7' },
  Rental:   { background: '#e4f3e9', color: '#1f7a45', border: '1px solid #b4e0c4' },
  Charter:  { background: '#f3e8fb', color: '#6b2da3', border: '1px solid #d9b4f7' },
  Other:    { background: '#f0f1f3', color: '#555e6b', border: '1px solid #d1d5db' },
};

function typeBadge(dest: string) {
  const { type } = parseDestType(dest);
  const style = TYPE_STYLES[type] ?? TYPE_STYLES['Other'];
  return (
    <span
      className="text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0"
      style={style}
    >
      {type}
    </span>
  );
}

function tailBadge(tail: string) {
  return (
    <span className="text-[11px] font-bold rounded px-1.5 py-0.5 bg-[#003057] text-white font-mono shrink-0">
      {tail}
    </span>
  );
}

function EventRow({ event }: { event: ScheduleEvent }) {
  const { sub } = parseDestType(event.dest);
  const displayName = event.name.trim() || sub;
  const instructor = event.tagMsg.trim();

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#e9ecf0] last:border-0">
      <div className="text-[11px] text-[#6b7a8d] font-mono w-[105px] shrink-0 pt-0.5">
        {formatTime(event.start)}–{formatTime(event.end)}
      </div>
      {tailBadge(event.tail)}
      {typeBadge(event.dest)}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#1a202c] truncate">{displayName}</div>
        {instructor && (
          <div className="text-[11px] text-[#6b7a8d]">with {instructor}</div>
        )}
      </div>
    </div>
  );
}

function DaySection({ date, events }: { date: Date; events: ScheduleEvent[] }) {
  const today = isToday(date);
  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide"
        style={{ color: today ? '#003057' : '#6b7a8d' }}
      >
        {formatDayHeader(date)}
        {today && (
          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-[#003057] text-white normal-case tracking-normal">
            Today
          </span>
        )}
      </div>
      <div className="bg-white rounded-lg mx-4 shadow-sm border border-[#e9ecf0] px-4">
        {events.length === 0 ? (
          <div className="py-4 text-[13px] text-[#9aa5b4] italic">No reservations</div>
        ) : (
          events.map(ev => <EventRow key={ev.id} event={ev} />)
        )}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { session } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 7);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    getSchedule(session.userid, session.session, weekStart, weekEnd)
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, session]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function eventsForDay(d: Date): ScheduleEvent[] {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return events
      .filter(ev => {
        const s = new Date(ev.start);
        return `${s.getFullYear()}-${s.getMonth()}-${s.getDate()}` === key;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  const weekLabel = (() => {
    const s = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = addDays(weekEnd, -1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb]">
      <TopBar />
      <main className="flex-1 max-w-2xl mx-auto w-full pb-8">
        {/* Week navigation */}
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => setWeekStart(d => addDays(d, -7))}
            className="text-[13px] font-medium text-[#003057] hover:underline px-2 py-1"
          >
            ← Prev
          </button>
          <span className="text-[14px] font-semibold text-[#1a202c]">{weekLabel}</span>
          <button
            onClick={() => setWeekStart(d => addDays(d, 7))}
            className="text-[13px] font-medium text-[#003057] hover:underline px-2 py-1"
          >
            Next →
          </button>
        </div>

        {loading && (
          <div className="text-center py-12 text-[#9aa5b4] text-[14px]">Loading schedule…</div>
        )}
        {error && (
          <div className="mx-4 p-4 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && days.map(d => (
          <DaySection key={d.toISOString()} date={d} events={eventsForDay(d)} />
        ))}
      </main>
    </div>
  );
}
