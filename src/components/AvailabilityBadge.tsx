import { type LiveStatus, statusDotColor } from '@/lib/liveStatus';

function badgeStyle(s: LiveStatus): React.CSSProperties {
  switch (s) {
    case 'available':   return { background: '#e8f7ee', color: '#1f7a45', border: '1px solid #b4ddc5' };
    case 'in_use':      return { background: '#fff8e6', color: '#9a6b00', border: '1px solid #f0e2a0' };
    case 'maintenance': return { background: '#fdf0ee', color: '#8a3d2f', border: '1px solid #e8c4bc' };
  }
}

export function AvailabilityBadge({ status, note }: { status: LiveStatus; note: string }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-full px-[10px] py-[3px] text-[12px] font-medium"
      style={badgeStyle(status)}
    >
      <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: statusDotColor(status) }} />
      {note}
    </span>
  );
}
