import { Link } from 'wouter'
import TopBar from '@/components/TopBar'
import { AIRCRAFT, statusColor, type Aircraft, type AircraftStatus } from '@/data/aircraft'

function statusLabel(status: AircraftStatus): string {
  switch (status) {
    case 'available': return 'Available';
    case 'in_use': return 'In use';
    case 'maintenance': return 'Maintenance';
  }
}

function AircraftCard({ aircraft }: { aircraft: Aircraft }) {
  const color = statusColor(aircraft.status);

  return (
    <Link href={`/aircraft/${aircraft.tail}`}>
      <div
        className="bg-white rounded-[10px] border overflow-hidden cursor-pointer transition-shadow"
        style={{ borderColor: '#e6e9ee', boxShadow: '0 2px 8px rgba(16,33,56,0.06)' }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,33,56,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,33,56,0.06)')}
      >
        {/* Photo */}
        {aircraft.photo ? (
          <img
            src={aircraft.photo}
            alt={aircraft.tail}
            className="w-full object-cover"
            style={{ height: 140 }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center font-mono text-[11px] tracking-[0.05em]"
            style={{
              height: 140,
              background: 'repeating-linear-gradient(135deg, #eef2f6 0 14px, #e6ebf1 14px 28px)',
              color: '#9aa4ae',
            }}
          >
            {aircraft.type === 'sim' ? 'SIMULATOR' : 'AIRCRAFT PHOTO'}
          </div>
        )}

        <div className="p-[14px]">
          {/* Tail + type */}
          <div className="flex items-baseline gap-[8px] mb-[6px]">
            <span
              className="font-mono font-semibold text-[18px]"
              style={{ color: '#003057', letterSpacing: '-0.01em' }}
            >
              {aircraft.tail}
            </span>
            <span className="text-[11px]" style={{ color: '#8a94a0' }}>
              {aircraft.makeModel.split(' ').slice(1, 3).join(' ')}
            </span>
          </div>

          <div className="text-[12px] mb-[10px]" style={{ color: '#5b6675' }}>
            {aircraft.makeModel} · {aircraft.year}
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[6px]">
              <span
                className="w-[8px] h-[8px] rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="text-[12px] font-medium" style={{ color: '#3a4654' }}>
                {statusLabel(aircraft.status)}
              </span>
            </div>
            <span
              className="font-mono font-semibold text-[13px]"
              style={{ color: '#003057' }}
            >
              ${aircraft.ratePerHour}/hr
            </span>
          </div>


        </div>
      </div>
    </Link>
  );
}

export default function AircraftPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f9fb' }}>
      <TopBar />

      <main className="flex-1 px-6 py-6 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-[22px]" style={{ color: '#003057' }}>Aircraft</h1>
            <p className="text-[13px] mt-[2px]" style={{ color: '#8a94a0' }}>
              {AIRCRAFT.length} aircraft · KPDK
            </p>
          </div>
          <div className="flex items-center gap-[8px] text-[12px] font-medium" style={{ color: '#5b6675' }}>
            <span className="flex items-center gap-[5px]">
              <span className="w-[8px] h-[8px] rounded-full" style={{ background: '#1f9d57' }} />
              Available
            </span>
            <span className="flex items-center gap-[5px] ml-2">
              <span className="w-[8px] h-[8px] rounded-full" style={{ background: '#EAAA00' }} />
              In use
            </span>
            <span className="flex items-center gap-[5px] ml-2">
              <span className="w-[8px] h-[8px] rounded-full" style={{ background: '#8a3d2f' }} />
              Maintenance
            </span>
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {AIRCRAFT.map(a => (
            <AircraftCard key={a.tail} aircraft={a} />
          ))}
        </div>
      </main>
    </div>
  );
}
