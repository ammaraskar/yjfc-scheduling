import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AIRCRAFT } from '@/data/aircraft'
import { X } from 'lucide-react'

// ─── Shared types & constants ─────────────────────────────────────────────────

export const DEFAULT_DURATION = 150; // 2h 30m
const MIN_DURATION = 30;
const GRID_END = 24 * 60;

export type DestType = 'Rental' | 'Training' | 'Standby';

export interface DraftState {
  tail:      string;
  startMin:  number;
  endMin:    number;
  destType:  DestType;
  notes:     string;
}

// ─── Time helpers (used by both the card and SchedulePage chip components) ───

export function minToTimeStr(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeStrToMin(s: string): number {
  const [h, m] = s.split(':').map(Number);
  if (isNaN(h)) return 0;
  return h * 60 + (m || 0);
}

export function minToCompact(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h < 12 ? 'a' : 'p';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

// ─── Floating card ────────────────────────────────────────────────────────────

export interface CardPos {
  x: number;
  y: number;
}

export interface NewEventCardProps {
  draft:    DraftState;
  pos:      CardPos;
  onUpdate: (changes: Partial<DraftState>) => void;
  onClose:  () => void;
  onCreate: () => void;
}

export function NewEventCard({ draft, pos, onUpdate, onClose, onCreate }: NewEventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newStart = timeStrToMin(e.target.value);
    const duration = Math.max(draft.endMin - draft.startMin, MIN_DURATION);
    onUpdate({ startMin: newStart, endMin: Math.min(newStart + duration, GRID_END) });
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newEnd = timeStrToMin(e.target.value);
    if (newEnd > draft.startMin) onUpdate({ endMin: newEnd });
  }

  const notesPlaceholder =
    draft.destType === 'Training' ? 'Instructor name'
    : draft.destType === 'Standby' ? 'Optional note'
    : 'Destination, e.g. KATL';

  return (
    <div
      ref={cardRef}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 60,
        width: 288,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '14px 16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--foreground)' }}>New Reservation</span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: 'var(--muted-foreground)', borderRadius: 4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>

        {/* Aircraft */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Label htmlFor="ec-aircraft" className="text-xs">Aircraft</Label>
          <Select value={draft.tail} onValueChange={(v) => { if (v !== null) onUpdate({ tail: v }); }}>
            <SelectTrigger id="ec-aircraft" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AIRCRAFT.map(ac => (
                <SelectItem key={ac.tail} value={ac.tail}>
                  {ac.tail} – {ac.makeModel.split(' ').slice(1, 3).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Label className="text-xs">Time</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Input
              type="time"
              value={minToTimeStr(draft.startMin)}
              onChange={handleStartChange}
              className="flex-1 min-w-0 tabular-nums h-7 text-xs"
              aria-label="Start time"
            />
            <span className="text-muted-foreground text-xs shrink-0 select-none">–</span>
            <Input
              type="time"
              value={minToTimeStr(draft.endMin)}
              onChange={handleEndChange}
              className="flex-1 min-w-0 tabular-nums h-7 text-xs"
              aria-label="End time"
            />
          </div>
        </div>

        {/* Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Label htmlFor="ec-type" className="text-xs">Type</Label>
          <Select
            value={draft.destType}
            onValueChange={(v) => onUpdate({ destType: v as DestType })}
          >
            <SelectTrigger id="ec-type" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rental">Rental</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
              <SelectItem value="Standby">Standby</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Label htmlFor="ec-notes" className="text-xs">Notes</Label>
          <Input
            id="ec-notes"
            placeholder={notesPlaceholder}
            value={draft.notes}
            onChange={e => onUpdate({ notes: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" style={{ background: '#003057', color: '#fff' }} onClick={onCreate}>
          Create
        </Button>
      </div>
    </div>
  );
}
