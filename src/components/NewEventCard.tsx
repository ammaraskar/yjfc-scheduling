import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TRAINER_SLOTS, type SchedulingType } from '@/data/aircraft'
import { X } from 'lucide-react'

// ─── Shared types & constants ─────────────────────────────────────────────────

export const TRAINER_DEFAULT_DURATION = 150; // first trainer block: 2h 30m
export const REGULAR_DEFAULT_DURATION = 60;  // 1 hour
const GRID_END = 24 * 60;

const ALL_TIME_SLOTS: number[] = [];
for (let m = 0; m <= GRID_END; m += 30) ALL_TIME_SLOTS.push(m);

function minToLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

function TimeSelect({ value, onChange, slots }: { value: number; onChange: (min: number) => void; slots: readonly number[] }) {
  function handleOpenChange(open: boolean) {
    if (!open) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const popup = document.querySelector('[data-slot="select-content"]') as HTMLElement | null;
      const selected = popup?.querySelector('[aria-selected="true"]') as HTMLElement | null;
      if (popup && selected) popup.scrollTop = Math.max(0, selected.offsetTop - 8);
    }));
  }

  return (
    <Select value={String(value)} onValueChange={(v) => { if (v !== null) onChange(Number(v)); }} onOpenChange={handleOpenChange}>
      <SelectTrigger size="sm" className="flex-1 min-w-0 tabular-nums">
        <span className="flex-1 text-left">{minToLabel(value)}</span>
      </SelectTrigger>
      <SelectContent hideScrollButtons alignItemWithTrigger={false}>
        {slots.map(m => (
          <SelectItem key={m} value={String(m)}>{minToLabel(m)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type DestType = 'Local' | 'Training' | 'CrossCountry' | 'StudentSolo';

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
  draft:          DraftState;
  pos:            CardPos;
  schedulingType: SchedulingType;
  hasConflict:    boolean;
  onUpdate:       (changes: Partial<DraftState>) => void;
  onClose:        () => void;
  onCreate:       () => void;
}

export function NewEventCard({ draft, pos, schedulingType, hasConflict, onUpdate, onClose, onCreate }: NewEventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const slots = schedulingType === 'trainer' ? TRAINER_SLOTS : ALL_TIME_SLOTS;

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleStartChange(newStart: number) {
    const duration = draft.endMin - draft.startMin;
    let newEnd: number;
    if (schedulingType === 'trainer') {
      // snap end to nearest trainer slot after the new start
      const validEnds = TRAINER_SLOTS.filter(s => s > newStart);
      const target = newStart + duration;
      newEnd = validEnds.reduce((best, s) =>
        Math.abs(s - target) < Math.abs(best - target) ? s : best
      , validEnds[0] ?? GRID_END);
    } else {
      newEnd = Math.min(newStart + Math.max(duration, REGULAR_DEFAULT_DURATION), GRID_END);
    }
    onUpdate({ startMin: newStart, endMin: newEnd });
  }

  function handleEndChange(newEnd: number) {
    if (newEnd > draft.startMin) onUpdate({ endMin: newEnd });
  }

  const isTrainingType = draft.destType === 'Training' || draft.destType === 'StudentSolo';
  const notesLabel = isTrainingType ? 'CFI Name' : draft.destType === 'CrossCountry' ? 'Destination' : 'Notes';
  const notesPlaceholder = isTrainingType ? 'Instructor name' : draft.destType === 'CrossCountry' ? 'e.g. KATL' : 'Optional comment';
  const notesRequired = isTrainingType || draft.destType === 'CrossCountry';

  useEffect(() => {
    if (isTrainingType && !draft.notes) {
      const saved = localStorage.getItem('yjfc_cfi');
      if (saved) onUpdate({ notes: saved });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.destType]);

  return (
    <div
      ref={cardRef}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 40,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label className="text-xs">Aircraft</Label>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{draft.tail}</span>
        </div>

        {/* Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Label className="text-xs">Time</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TimeSelect value={draft.startMin} onChange={handleStartChange} slots={slots} />
            <span className="text-muted-foreground text-xs shrink-0 select-none">–</span>
            <TimeSelect value={draft.endMin} onChange={handleEndChange} slots={slots} />
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
              <span className="flex-1 text-left">{{ Training: 'Training', StudentSolo: 'Student Solo', Local: 'Local', CrossCountry: 'Cross Country' }[draft.destType]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Training">Training</SelectItem>
              <SelectItem value="StudentSolo">Student Solo</SelectItem>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="CrossCountry">Cross Country</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Label htmlFor="ec-notes" className="text-xs">{notesLabel}{notesRequired && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}</Label>
          <Input
            id="ec-notes"
            placeholder={notesPlaceholder}
            value={draft.notes}
            onChange={e => {
              onUpdate({ notes: e.target.value });
              if (isTrainingType && e.target.value) localStorage.setItem('yjfc_cfi', e.target.value);
            }}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Conflict warning */}
      {hasConflict && (
        <div style={{ marginTop: 10, padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: '#991b1b' }}>
          This time overlaps with an existing reservation.
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" style={{ background: '#003057', color: '#fff' }} onClick={onCreate} disabled={hasConflict}>
          Create
        </Button>
      </div>
    </div>
  );
}
