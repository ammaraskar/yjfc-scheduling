import { Link } from 'wouter'
import TopBar from '@/components/TopBar'
import { getAircraft, statusColor, type AircraftStatus } from '@/data/aircraft'

function statusBadge(status: AircraftStatus, note: string) {
  const styles: Record<AircraftStatus, React.CSSProperties> = {
    available: { background: '#e4f3e9', color: '#1f7a45', border: '1px solid #b4e0c4' },
    in_use: { background: '#fff4d6', color: '#9a6b00', border: '1px solid #f0dca0' },
    maintenance: { background: '#fdf0ee', color: '#8a3d2f', border: '1px solid #e8c4bc' },
  };
  return (
    <span
      className="font-bold text-[11px] rounded-[20px] px-[11px] py-[4px]"
      style={styles[status]}
    >
      ● {note}
    </span>
  );
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      className="rounded-[8px] p-[9px_11px]"
      style={{ background: '#f7f9fb', border: '1px solid #eef1f4' }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.05em] mb-[2px]"
        style={{ color: '#8a94a0' }}
      >
        {label}
      </div>
      <div
        className="font-mono font-semibold text-[15px]"
        style={{ color: valueColor ?? '#1a2430' }}
      >
        {value}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between text-[13px] pb-[7px]"
      style={{ borderBottom: '1px solid #f1f4f7' }}
    >
      <span style={{ color: '#8a94a0' }}>{label}</span>
      <span className="font-semibold text-right" style={{ color: '#1a2430', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

interface AirworthinessRowProps {
  label: string;
  value: string;
  variant: 'ok' | 'warn' | 'na';
}

function AirworthinessRow({ label, value, variant }: AirworthinessRowProps) {
  const styles: Record<'ok' | 'warn' | 'na', React.CSSProperties> = {
    ok: { background: '#f7f9fb', border: '1px solid #eef1f4' },
    warn: { background: '#fff8ec', border: '1px solid #f0e2c0' },
    na: { background: '#f7f9fb', border: '1px solid #eef1f4' },
  };
  const valueColor: Record<'ok' | 'warn' | 'na', string> = {
    ok: '#1f7a45',
    warn: '#9a6b00',
    na: '#9aa4ae',
  };
  return (
    <div
      className="flex items-center justify-between rounded-[7px] p-[8px_11px] text-[13px]"
      style={styles[variant]}
    >
      <span style={{ color: '#3a4654' }}>{label}</span>
      <span className="font-semibold font-mono text-[12px]" style={{ color: valueColor[variant] }}>
        {value}
      </span>
    </div>
  );
}

export default function AircraftDetailPage({ tail }: { tail: string }) {
  const aircraft = getAircraft(tail);

  if (!aircraft) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#f7f9fb' }}>
        <TopBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="font-mono font-bold text-[24px] mb-2" style={{ color: '#003057' }}>{tail}</div>
            <div style={{ color: '#8a94a0' }}>Aircraft not found.</div>
            <Link href="/aircraft">
              <span className="text-sm font-semibold cursor-pointer mt-4 block" style={{ color: '#003057' }}>
                ← Back to Aircraft
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const color = statusColor(aircraft.status);
  const isSim = aircraft.type === 'sim';

  const hundredHrVariant =
    aircraft.hundredHrRemaining === null
      ? 'na'
      : aircraft.hundredHrRemaining < 10
      ? 'warn'
      : 'ok';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f9fb' }}>
      <TopBar />

      <main className="flex-1 px-6 py-6 max-w-[1200px] mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-[8px] text-[13px] mb-5" style={{ color: '#8a94a0' }}>
          <Link href="/schedule"><span className="cursor-pointer hover:underline">Schedule</span></Link>
          <span style={{ color: '#cdd5dd' }}>/</span>
          <Link href="/aircraft"><span className="cursor-pointer hover:underline">Aircraft</span></Link>
          <span style={{ color: '#cdd5dd' }}>/</span>
          <span className="font-mono font-bold" style={{ color: '#003057' }}>{aircraft.tail}</span>
        </div>

        <div
          className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: '1px solid #e6e9ee', boxShadow: '0 6px 24px rgba(16,33,56,0.08)' }}
        >
          {/* Hero */}
          <div className="flex gap-[22px] p-[22px]" style={{ borderBottom: '1px solid #eef1f4' }}>
            {/* Photo */}
            {aircraft.photo ? (
              <img
                src={aircraft.photo}
                alt={aircraft.tail}
                className="rounded-[10px] shrink-0 object-cover"
                style={{ width: 330, height: 200, border: '1px solid #e3e7ec' }}
              />
            ) : (
              <div
                className="rounded-[10px] shrink-0 flex items-center justify-center font-mono text-[11px] tracking-[0.05em]"
                style={{
                  width: 330,
                  height: 200,
                  background: 'repeating-linear-gradient(135deg, #eef2f6 0 14px, #e6ebf1 14px 28px)',
                  border: '1px solid #e3e7ec',
                  color: '#9aa4ae',
                }}
              >
                {isSim ? 'SIMULATOR' : 'AIRCRAFT PHOTO'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-[10px] flex-wrap">
                    <span
                      className="font-mono font-semibold text-[28px]"
                      style={{ color: '#003057', letterSpacing: '-0.01em' }}
                    >
                      {aircraft.tail}
                    </span>
                    {statusBadge(aircraft.status, aircraft.statusNote)}
                  </div>
                  <div className="text-[14px] mt-[4px]" style={{ color: '#5b6675' }}>
                    {aircraft.makeModel} · {aircraft.year}
                  </div>
                </div>
                {!isSim && (
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[22px]" style={{ color: '#003057' }}>
                      ${aircraft.ratePerHour}
                      <span className="text-[13px] font-normal" style={{ color: '#9aa4ae' }}>/hr</span>
                    </div>
                    <div className="text-[11px]" style={{ color: '#9aa4ae' }}>wet · Hobbs</div>
                  </div>
                )}
                {isSim && (
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[22px]" style={{ color: '#003057' }}>
                      ${aircraft.ratePerHour}
                      <span className="text-[13px] font-normal" style={{ color: '#9aa4ae' }}>/hr</span>
                    </div>
                    <div className="text-[11px]" style={{ color: '#9aa4ae' }}>FAA AATD</div>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              {!isSim ? (
                <div className="grid grid-cols-4 gap-[10px] mt-[18px]">
                  <StatCard label="Hobbs" value={aircraft.hobbs.toFixed(1)} />
                  <StatCard label="Tach" value={aircraft.tach.toFixed(1)} />
                  <StatCard
                    label="100-hr in"
                    value={aircraft.hundredHrRemaining !== null ? `${aircraft.hundredHrRemaining} h` : 'N/A'}
                    valueColor={hundredHrVariant === 'warn' ? '#9a6b00' : undefined}
                  />
                  <StatCard
                    label="Fuel capacity"
                    value={aircraft.fuelCapacity !== null ? `${aircraft.fuelCapacity} gal` : 'N/A'}
                  />
                </div>
              ) : (
                <div className="mt-[18px] p-[12px] rounded-[8px] text-[13px]" style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#5b6675' }}>
                  Redbird simulator · Located in the club office
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex">
            {/* Left column */}
            <div className="flex-1 p-[20px_22px]" style={{ borderRight: '1px solid #eef1f4' }}>

              {/* Specifications */}
              <div
                className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[12px]"
                style={{ color: '#8a94a0' }}
              >
                Specifications
              </div>
              <div className="grid grid-cols-2 gap-[11px_26px] mb-[22px]">
                {!isSim && <SpecRow label="Power" value={`${aircraft.horsepower} hp`} />}
                {!isSim && <SpecRow label="Cruise" value={`${aircraft.cruise} kt`} />}
                {!isSim && <SpecRow label="Fuel capacity" value={aircraft.fuelCapacity !== null ? `${aircraft.fuelCapacity} gal` : 'N/A'} />}
                <SpecRow label="Seats" value={String(aircraft.seats)} />
              </div>

              {/* Airworthiness */}
              {!isSim && (
                <>
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[12px]"
                    style={{ color: '#8a94a0' }}
                  >
                    Airworthiness
                  </div>
                  <div className="flex flex-col gap-[8px] mb-[22px]">
                    <AirworthinessRow label="Annual inspection" value={`due ${aircraft.annualDue}`} variant="ok" />
                    <AirworthinessRow
                      label="100-hr inspection"
                      value={
                        aircraft.hundredHrRemaining !== null
                          ? aircraft.hundredHrRemaining === 0
                            ? 'In progress'
                            : `${aircraft.hundredHrRemaining} h remaining`
                          : 'N/A'
                      }
                      variant={hundredHrVariant}
                    />
                    <AirworthinessRow label="ELT battery" value={`exp ${aircraft.eltExpiry}`} variant="ok" />
                    <AirworthinessRow label="Pitot-static / transponder" value={`due ${aircraft.pitotStaticDue}`} variant="ok" />
                  </div>
                </>
              )}

              {/* Squawks */}
              <div className="flex items-center gap-[8px] mb-[12px]">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.07em]"
                  style={{ color: '#8a94a0' }}
                >
                  Open squawks
                </span>
                {aircraft.squawks.length > 0 && (
                  <span
                    className="font-bold text-[11px] rounded-[10px] px-[7px] py-[1px]"
                    style={{ color: '#9a6b00', background: '#fff4d6' }}
                  >
                    {aircraft.squawks.length}
                  </span>
                )}
              </div>

              {aircraft.squawks.length === 0 ? (
                <div
                  className="rounded-[8px] p-[11px_13px] text-[13px]"
                  style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#8a94a0' }}
                >
                  No open squawks
                </div>
              ) : (
                <div className="flex flex-col gap-[8px]">
                  {aircraft.squawks.map(sq => (
                    <div
                      key={sq.id}
                      className="flex gap-[10px] items-start rounded-[8px] p-[11px_13px]"
                      style={{ background: '#fff8ec', border: '1px solid #f0e2c0' }}
                    >
                      <span
                        className="w-[8px] h-[8px] rounded-full shrink-0 mt-[5px]"
                        style={{ background: '#d99000' }}
                      />
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1a2430' }}>
                          {sq.text}
                        </div>
                        <div className="text-[11.5px] mt-[2px]" style={{ color: '#8a94a0' }}>
                          Reported by {sq.reporter} · {sq.date} · {sq.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right rail */}
            <div className="shrink-0 p-[20px]" style={{ width: 300, background: '#fbfcfd' }}>
              <button
                className="block w-full text-center text-[14px] font-bold rounded-[9px] py-[12px] mb-[8px] cursor-pointer"
                style={{ color: '#003057', background: '#EAAA00', boxShadow: '0 1px 2px rgba(234,170,0,0.4)' }}
              >
                + Reserve {aircraft.tail}
              </button>
              <button
                className="block w-full text-center text-[13px] font-semibold rounded-[9px] py-[9px] mb-[20px] cursor-pointer"
                style={{ color: '#003057', border: '1px solid #cdd5dd', background: '#fff' }}
              >
                Find next available time
              </button>

              {/* Status indicator */}
              <div
                className="rounded-[11px] overflow-hidden mb-[20px]"
                style={{ border: '1px solid #e3e7ec' }}
              >
                <div
                  className="flex items-center gap-[8px] px-[12px] py-[9px]"
                  style={{ background: '#003057', color: '#fff' }}
                >
                  <span
                    className="w-[8px] h-[8px] rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[12.5px] font-bold">Current status</span>
                </div>
                <div className="p-[12px]">
                  <div className="flex items-center gap-[8px] mb-[4px]">
                    <span
                      className="w-[10px] h-[10px] rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[13px] font-semibold" style={{ color: '#1a2430' }}>
                      {aircraft.statusNote}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upcoming reservations placeholder */}
              <div
                className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[11px]"
                style={{ color: '#8a94a0' }}
              >
                Upcoming reservations
              </div>
              <div
                className="rounded-[8px] p-[12px] text-[12px] text-center"
                style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#9aa4ae' }}
              >
                No upcoming reservations
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
