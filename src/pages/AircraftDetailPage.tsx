import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import TopBar from '@/components/TopBar'
import { getAircraft, type AircraftStatus } from '@/data/aircraft'
import { getResStatus, type ResStatus } from '@/api'
import { useAuth } from '@/auth'

interface SquawkEntry {
  date: string;
  text: string;
  author: string;
}

function parseSquawkEntries(detail: string): SquawkEntry[] {
  // Each entry starts with MM/DD/YY on a new line (first entry has no leading newline)
  const chunks = detail.split(/\n(?=\d{2}\/\d{2}\/\d{2}\s)/);
  const entries: SquawkEntry[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{2})\s+([\s\S]*)/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const rest = dateMatch[2].trim();

    // Author is in the last (Name) group at the end of the entry
    const authorMatch = rest.match(/\(([^)]+)\)\s*$/);
    const author = authorMatch ? authorMatch[1] : '';
    const text = authorMatch
      ? rest.slice(0, rest.length - authorMatch[0].length).trim()
      : rest;

    entries.push({ date, text, author });
  }

  return entries;
}

function statusBadge(status: AircraftStatus, note: string) {
  const styles: Record<AircraftStatus, React.CSSProperties> = {
    available: { background: '#e4f3e9', color: '#1f7a45', border: '1px solid #b4e0c4' },
    in_use: { background: '#fff4d6', color: '#9a6b00', border: '1px solid #f0dca0' },
    maintenance: { background: '#fdf0ee', color: '#8a3d2f', border: '1px solid #e8c4bc' },
  };
  return (
    <span
      className="font-bold text-[10px] md:text-[11px] rounded-[20px] px-[9px] md:px-[11px] py-[3px] md:py-[4px]"
      style={styles[status]}
    >
      ● {note}
    </span>
  );
}

function StatCard({ label, value, valueColor, loading }: { label: string; value: string; valueColor?: string; loading?: boolean }) {
  return (
    <div
      className="rounded-[8px] p-[7px_9px] md:p-[9px_11px]"
      style={{ background: '#f7f9fb', border: '1px solid #eef1f4' }}
    >
      <div
        className="text-[9.5px] md:text-[10px] font-semibold uppercase tracking-[0.05em] mb-[1px] md:mb-[2px]"
        style={{ color: '#8a94a0' }}
      >
        {label}
      </div>
      <div
        className="font-mono font-semibold text-[13.5px] md:text-[15px]"
        style={{ color: loading ? '#cdd5dd' : (valueColor ?? '#1a2430') }}
      >
        {loading ? '···' : value}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between text-[12.5px] md:text-[13px] pb-[6px] md:pb-[7px]"
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
  loading?: boolean;
}

function AirworthinessRow({ label, value, variant, loading }: AirworthinessRowProps) {
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
      className="flex items-center justify-between rounded-[7px] p-[7px_9px] md:p-[8px_11px] text-[12.5px] md:text-[13px]"
      style={styles[variant]}
    >
      <span style={{ color: '#3a4654' }}>{label}</span>
      <span className="font-semibold font-mono text-[12px]" style={{ color: loading ? '#cdd5dd' : valueColor[variant] }}>
        {loading ? '···' : value}
      </span>
    </div>
  );
}

export default function AircraftDetailPage({ tail }: { tail: string }) {
  const aircraft = getAircraft(tail);
  const { session } = useAuth();
  const [liveData, setLiveData] = useState<ResStatus | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoadingLive(true);
    getResStatus(session.userid, session.session, tail)
      .then(setLiveData)
      .catch(console.error)
      .finally(() => setLoadingLive(false));
  }, [tail, session]);

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

  const isSim = aircraft.type === 'sim';

  // Derive live values with static fallbacks
  const ttaf = liveData?.ttaf ?? aircraft.hobbs;
  const tsmoh = liveData?.tsmoh ?? aircraft.tach;

  const findMaintItem = (pattern: RegExp) =>
    liveData?.maintenanceItems.find(item => pattern.test(item.name));

  const hundredHrItem = findMaintItem(/100.hour.inspection/i);
  const computedHundredHrRemaining =
    hundredHrItem?.timeDue != null && liveData?.lastMaintTach != null
      ? Math.round((hundredHrItem.timeDue - liveData.lastMaintTach) * 10) / 10
      : null;
  const hundredHrRemaining = computedHundredHrRemaining ?? aircraft.hundredHrRemaining;

  const annualDue = findMaintItem(/annual.inspection/i)?.dateDue ?? aircraft.annualDue;
  const eltExpiry = findMaintItem(/elt.battery/i)?.dateDue ?? aircraft.eltExpiry;
  const pitotStaticDue =
    findMaintItem(/static.*altimeter|altimeter.*cert/i)?.dateDue ??
    findMaintItem(/transponder.*91\.413/i)?.dateDue ??
    aircraft.pitotStaticDue;

  const hundredHrVariant =
    hundredHrRemaining === null
      ? 'na'
      : hundredHrRemaining < 10
      ? 'warn'
      : 'ok';

  const liveSquawks = liveData?.squawks ?? null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f9fb' }}>
      <TopBar />

      <main className="flex-1 px-2 py-3 md:px-6 md:py-6 max-w-[1200px] mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-[7px] text-[11.5px] md:text-[13px] mb-3 md:mb-5" style={{ color: '#8a94a0' }}>
          <Link href="/schedule"><span className="cursor-pointer hover:underline">Schedule</span></Link>
          <span style={{ color: '#cdd5dd' }}>/</span>
          <Link href="/aircraft"><span className="cursor-pointer hover:underline">Aircraft</span></Link>
          <span style={{ color: '#cdd5dd' }}>/</span>
          <span className="font-mono font-bold" style={{ color: '#003057' }}>{aircraft.tail}</span>
        </div>

        <div
          className="bg-white rounded-[8px] md:rounded-[10px] overflow-hidden"
          style={{ border: '1px solid #e6e9ee', boxShadow: '0 6px 24px rgba(16,33,56,0.08)' }}
        >
          {/* Hero */}
          <div className="flex flex-col gap-[11px] md:flex-row md:gap-[22px] p-[11px] md:p-[22px]" style={{ borderBottom: '1px solid #eef1f4' }}>
            {/* Photo */}
            {aircraft.photo ? (
              <img
                src={aircraft.photo}
                alt={aircraft.tail}
                className="rounded-[9px] md:rounded-[10px] shrink-0 object-cover w-full md:w-[330px] h-[168px] md:h-[200px]"
                style={{ border: '1px solid #e3e7ec' }}
              />
            ) : (
              <div
                className="rounded-[9px] md:rounded-[10px] shrink-0 flex items-center justify-center font-mono text-[11px] tracking-[0.05em] w-full md:w-[330px] h-[168px] md:h-[200px]"
                style={{
                  background: 'repeating-linear-gradient(135deg, #eef2f6 0 14px, #e6ebf1 14px 28px)',
                  border: '1px solid #e3e7ec',
                  color: '#9aa4ae',
                }}
              >
                {isSim ? 'SIMULATOR' : 'AIRCRAFT PHOTO'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-[10px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-[10px] flex-wrap">
                    <span
                      className="font-mono font-semibold text-[22px] md:text-[28px]"
                      style={{ color: '#003057', letterSpacing: '-0.01em' }}
                    >
                      {aircraft.tail}
                    </span>
                    {statusBadge(aircraft.status, aircraft.statusNote)}
                  </div>
                  <div className="text-[13px] md:text-[14px] mt-[2px] md:mt-[4px]" style={{ color: '#5b6675' }}>
                    {aircraft.makeModel} · {aircraft.year}
                  </div>
                  {liveData?.location && (
                    <div className="text-[11.5px] md:text-[12px] mt-[1px] md:mt-[2px]" style={{ color: '#8a94a0' }}>
                      Based at {liveData.location}
                    </div>
                  )}
                </div>
                {!isSim && (
                  <div className="text-right shrink-0 pt-[1px]">
                    <div className="font-mono font-bold text-[18px] md:text-[22px] leading-none" style={{ color: '#003057' }}>
                      ${aircraft.ratePerHour}
                      <span className="text-[12px] md:text-[13px] font-normal ml-[1px]" style={{ color: '#9aa4ae' }}>/hr</span>
                    </div>
                    <div className="text-[10.5px] md:text-[11px] mt-[1px]" style={{ color: '#9aa4ae' }}>wet · Hobbs</div>
                  </div>
                )}
                {isSim && (
                  <div className="text-right shrink-0 pt-[1px]">
                    <div className="font-mono font-bold text-[18px] md:text-[22px] leading-none" style={{ color: '#003057' }}>
                      ${aircraft.ratePerHour}
                      <span className="text-[12px] md:text-[13px] font-normal ml-[1px]" style={{ color: '#9aa4ae' }}>/hr</span>
                    </div>
                    <div className="text-[10.5px] md:text-[11px] mt-[1px]" style={{ color: '#9aa4ae' }}>FAA AATD</div>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              {!isSim ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px] md:gap-[10px] mt-[10px] md:mt-[18px]">
                  <StatCard label="Total Time Airframe" value={ttaf.toFixed(1)} loading={loadingLive && !liveData} />
                  <StatCard label="Time Since Overhaul" value={tsmoh.toFixed(1)} loading={loadingLive && !liveData} />
                  <StatCard
                    label="100-hr in"
                    value={hundredHrRemaining !== null ? `${hundredHrRemaining} h` : 'N/A'}
                    valueColor={hundredHrVariant === 'warn' ? '#9a6b00' : undefined}
                    loading={loadingLive && !liveData}
                  />
                  <StatCard
                    label="Fuel capacity"
                    value={aircraft.fuelCapacity !== null ? `${aircraft.fuelCapacity} gal` : 'N/A'}
                  />
                </div>
              ) : (
                <div className="mt-[12px] md:mt-[18px] p-[10px] md:p-[12px] rounded-[8px] text-[12.5px] md:text-[13px]" style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#5b6675' }}>
                  Redbird simulator · Located in the club office
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row">
            {/* Left column */}
            <div className="order-2 md:order-1 flex-1 p-[11px] md:p-[20px_22px] border-t md:border-t-0 md:border-r border-[#eef1f4] flex flex-col gap-[16px] md:gap-[22px]">

              {/* Specifications */}
              <div className="order-2 md:order-1">
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[8px] md:mb-[12px]"
                  style={{ color: '#8a94a0' }}
                >
                  Specifications
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[11px_26px]">
                  {!isSim && <SpecRow label="Power" value={`${aircraft.horsepower} hp`} />}
                  {!isSim && <SpecRow label="Cruise" value={`${aircraft.cruise} kt`} />}
                  {!isSim && <SpecRow label="Fuel capacity" value={aircraft.fuelCapacity !== null ? `${aircraft.fuelCapacity} gal` : 'N/A'} />}
                  <SpecRow label="Seats" value={String(aircraft.seats)} />
                </div>
              </div>

              {/* Airworthiness */}
              {!isSim && (
                <div className="order-3 md:order-2">
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[8px] md:mb-[12px]"
                    style={{ color: '#8a94a0' }}
                  >
                    Airworthiness
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <AirworthinessRow label="Annual inspection" value={`due ${annualDue}`} variant="ok" loading={loadingLive && !liveData} />
                    <AirworthinessRow
                      label="100-hr inspection"
                      value={
                        hundredHrRemaining !== null
                          ? hundredHrRemaining === 0
                            ? 'In progress'
                            : `${hundredHrRemaining} h remaining`
                          : 'N/A'
                      }
                      variant={hundredHrVariant}
                      loading={loadingLive && !liveData}
                    />
                    <AirworthinessRow label="ELT battery" value={`exp ${eltExpiry}`} variant="ok" loading={loadingLive && !liveData} />
                    <AirworthinessRow label="Pitot-static / transponder" value={`due ${pitotStaticDue}`} variant="ok" loading={loadingLive && !liveData} />
                  </div>
                </div>
              )}

              {/* Squawks */}
              <div className="order-1 md:order-3">
                <div className="flex items-center gap-[8px] mb-[8px] md:mb-[12px]">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.07em]"
                    style={{ color: '#8a94a0' }}
                  >
                    Open squawks
                  </span>
                  {liveSquawks !== null && liveSquawks.length > 0 && (
                    <span
                      className="font-bold text-[11px] rounded-[10px] px-[7px] py-[1px]"
                      style={{ color: '#9a6b00', background: '#fff4d6' }}
                    >
                      {liveSquawks.length}
                    </span>
                  )}
                  {liveSquawks === null && aircraft.squawks.length > 0 && (
                    <span
                      className="font-bold text-[11px] rounded-[10px] px-[7px] py-[1px]"
                      style={{ color: '#9a6b00', background: '#fff4d6' }}
                    >
                      {aircraft.squawks.length}
                    </span>
                  )}
                </div>

                {loadingLive && liveSquawks === null ? (
                  <div
                    className="rounded-[8px] p-[9px_11px] md:p-[11px_13px] text-[12.5px] md:text-[13px]"
                    style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#cdd5dd' }}
                  >
                    Loading squawks…
                  </div>
                ) : liveSquawks !== null ? (
                  liveSquawks.length === 0 ? (
                    <div
                      className="rounded-[8px] p-[9px_11px] md:p-[11px_13px] text-[12.5px] md:text-[13px]"
                      style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#8a94a0' }}
                    >
                      No open squawks
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[8px]">
                      {liveSquawks.map((sq, i) => {
                        const isGrounding = sq.dotColor === 'red';
                        return (
                          <div
                            key={i}
                            className="rounded-[8px] p-[9px_11px] md:p-[11px_13px]"
                            style={{
                              background: isGrounding ? '#fdf0ee' : '#fff8ec',
                              border: `1px solid ${isGrounding ? '#e8c4bc' : '#f0e2c0'}`,
                            }}
                          >
                            <div className="flex items-center gap-[7px]">
                              <span
                                className="w-[8px] h-[8px] rounded-full shrink-0"
                                style={{ background: isGrounding ? '#c0392b' : '#d99000' }}
                              />
                              <span className="text-[12.5px] md:text-[13px] font-semibold flex-1" style={{ color: '#1a2430' }}>
                                {sq.title}
                              </span>
                              <span className="text-[11px] shrink-0" style={{ color: '#8a94a0' }}>{sq.date}</span>
                            </div>
                            {sq.detail && (
                              <div className="mt-[6px] pl-[14px] md:pl-[16px] flex flex-col gap-[6px] md:gap-[8px]">
                                {parseSquawkEntries(sq.detail).map((entry, j) => (
                                  <div key={j}>
                                    <div className="flex gap-[8px] items-baseline">
                                      <span
                                        className="font-mono text-[10.5px] shrink-0 rounded-[4px] px-[5px] py-[1px]"
                                        style={{ background: '#f1f4f7', color: '#8a94a0' }}
                                      >
                                        {entry.date}
                                      </span>
                                      <span className="text-[12px] md:text-[12.5px]" style={{ color: '#1a2430', lineHeight: 1.45 }}>
                                        {entry.text}
                                      </span>
                                    </div>
                                    {entry.author && (
                                      <div
                                        className="text-[10.5px] md:text-[11px] mt-[1px] md:mt-[2px] pl-[49px] md:pl-[55px]"
                                        style={{ color: '#8a94a0' }}
                                      >
                                        — {entry.author}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  // Fall back to static squawks
                  aircraft.squawks.length === 0 ? (
                    <div
                      className="rounded-[8px] p-[9px_11px] md:p-[11px_13px] text-[12.5px] md:text-[13px]"
                      style={{ background: '#f7f9fb', border: '1px solid #eef1f4', color: '#8a94a0' }}
                    >
                      No open squawks
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[8px]">
                      {aircraft.squawks.map(sq => (
                        <div
                          key={sq.id}
                          className="flex gap-[10px] items-start rounded-[8px] p-[9px_11px] md:p-[11px_13px]"
                          style={{ background: '#fff8ec', border: '1px solid #f0e2c0' }}
                        >
                          <span
                            className="w-[8px] h-[8px] rounded-full shrink-0 mt-[5px]"
                            style={{ background: '#d99000' }}
                          />
                          <div>
                            <div className="text-[12.5px] md:text-[13px] font-semibold" style={{ color: '#1a2430' }}>
                              {sq.text}
                            </div>
                            <div className="text-[11.5px] mt-[2px]" style={{ color: '#8a94a0' }}>
                              Reported by {sq.reporter} · {sq.date} · {sq.note}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Scheduled Maintenance */}
              {liveData && liveData.maintenanceItems.length > 0 && (
                <div className="order-4 md:order-4">
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[8px] md:mb-[12px]"
                    style={{ color: '#8a94a0' }}
                  >
                    Scheduled Maintenance
                  </div>
                  <div className="overflow-x-auto rounded-[8px]" style={{ border: '1px solid #eef1f4' }}>
                    <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f7f9fb', borderBottom: '1px solid #eef1f4' }}>
                          <th className="text-left p-[7px_12px] font-semibold" style={{ color: '#5b6675' }}>Item</th>
                          <th className="text-right p-[7px_12px] font-semibold" style={{ color: '#5b6675' }}>Date Due</th>
                          <th className="text-right p-[7px_12px] font-semibold" style={{ color: '#5b6675' }}>Time Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveData.maintenanceItems.map((item, i) => (
                          <tr
                            key={i}
                            style={{ borderTop: i > 0 ? '1px solid #f1f4f7' : undefined }}
                          >
                            <td className="p-[7px_12px]" style={{ color: '#1a2430' }}>
                              {item.adUrl ? (
                                <a
                                  href={item.adUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#003057', textDecoration: 'underline' }}
                                >
                                  {item.name}
                                </a>
                              ) : (
                                item.name
                              )}
                            </td>
                            <td className="text-right p-[7px_12px] font-mono" style={{ color: '#5b6675' }}>
                              {item.dateDue ?? '—'}
                            </td>
                            <td className="text-right p-[7px_12px] font-mono" style={{ color: '#5b6675' }}>
                              {item.timeDue !== null ? item.timeDue.toFixed(1) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {liveData.lastMaintEntry && (
                    <div className="text-[11.5px] mt-[6px]" style={{ color: '#8a94a0' }}>
                      {liveData.lastMaintEntry}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right rail */}
            <div className="order-1 md:order-2 shrink-0 w-full md:w-[300px] p-[11px] md:p-[20px]" style={{ background: '#fbfcfd' }}>
              <button
                className="block w-full text-center text-[13.5px] md:text-[14px] font-bold rounded-[9px] py-[10px] md:py-[12px] mb-[7px] md:mb-[8px] cursor-pointer"
                style={{ color: '#003057', background: '#EAAA00', boxShadow: '0 1px 2px rgba(234,170,0,0.4)' }}
              >
                + Reserve {aircraft.tail}
              </button>
              <button
                className="block w-full text-center text-[12.5px] md:text-[13px] font-semibold rounded-[9px] py-[8px] md:py-[9px] mb-[12px] md:mb-[20px] cursor-pointer"
                style={{ color: '#003057', border: '1px solid #cdd5dd', background: '#fff' }}
              >
                Find next available time
              </button>

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
