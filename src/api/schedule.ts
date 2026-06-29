import { apiClient } from './client';
import type { ApiFetch } from './client';

export class SessionExpiredError extends Error {
  constructor() { super('Session invalid or expired'); this.name = 'SessionExpiredError'; }
}

export const EventClass = {
  Maint:   'maint',
  Predone: 'predone',
  Other:   'other',
  // A maintenance event placed on top of an existing reservation, superseding it.
  // The aircraft is pulled from service even though a pilot already had it booked.
  Ovly:    'ovly',
  Stby:    'stby1',
} as const;

export type EventClass = typeof EventClass[keyof typeof EventClass];

export interface ScheduleEvent {
  id: number;
  userId: string;
  resourceId: number;
  start: string;
  end: string;
  dest: string;
  title: string;
  name: string;
  tail: string;
  info: string;
  emailto: string;
  callto: string;
  mob?: string;
  dateMade: string;
  madeByName: string;
  tagMsg: string;
  classNames: EventClass[];
  ruleExempt: boolean;
}

function formatDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(raw: any): ScheduleEvent {
  return {
    id: raw.id,
    userId: raw.userId,
    resourceId: raw.resourceId,
    start: raw.start,
    end: raw.end,
    dest: raw.dest ?? '',
    title: raw.title ?? '',
    name: raw.name ?? '',
    tail: raw.NNO ?? '',
    info: raw.info ?? '',
    emailto: raw.emailto ?? '',
    callto: raw.callto ?? '',
    mob: raw.mob,
    dateMade: raw.date_made ?? '',
    madeByName: raw.made_by_name ?? '',
    tagMsg: raw.tagMsg ?? '',
    classNames: (raw.className ?? EventClass.Other).split(/\s+/).filter(Boolean).map((c: string) => c as EventClass),
    ruleExempt: raw.rule_exempt ?? false,
  };
}

export async function getSchedule(
  userid: string,
  session: string,
  start: Date,
  end: Date,
  userfilter = 0,
  fetch: ApiFetch = apiClient,
): Promise<ScheduleEvent[]> {
  const params = new URLSearchParams({
    ver: 'sch_4.0.0',
    user_id: userid,
    ses_id: session,
    c: 'fCal',
    subCmd: 'sch',
    start: formatDate(start),
    end: formatDate(end),
    userfilter: String(userfilter),
  });
  const path = `/SchedData.aspx?${params}`;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`getSchedule failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((data as any)?.rtn_data === 'Session invalid or expired') throw new SessionExpiredError();
  return (data as unknown[]).map(mapEvent);
}
