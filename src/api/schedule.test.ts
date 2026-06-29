import { describe, it, expect, vi } from 'vitest';
import { getSchedule, EventClass, SessionExpiredError } from './schedule';

const RAW_EVENTS = [
  {
    id: 17221283,
    orig_key: 17221283,
    userId: '155975',
    resourceId: 6937,
    start: '2026-06-27T07:00:00',
    end: '2026-06-27T07:30:00',
    startorig: '2026-06-27T07:00:00',
    endorig: '2026-06-27T07:30:00',
    dest: 'Other:Weekly Inspection',
    title: 'Weekly Inspection, ',
    name: ' Weekly Inspection',
    name2: ' Weekly Inspection',
    NNO: 'N885GT',
    cat_grp: 1,
    cat: 'AIRPLANE',
    info: 'Other:Weekly Inspection ;;Jingzhi Yang;;greerhardesty@gmail.com;;',
    emailto: 'greerhardesty@gmail.com',
    callto: '',
    made_code: 0,
    date_made: '2026-06-21T21:58:34.277',
    made_by_name: ' Weekly Inspection',
    rule_exempt: true,
    tagMsg: 'Jingzhi Yang',
    className: 'other',
  },
  {
    id: 17233109,
    orig_key: 17162397,
    userId: '149904',
    resourceId: 6937,
    start: '2026-06-27T08:00:00',
    end: '2026-06-27T09:25:21.650',
    startorig: '2026-06-27T08:00:00',
    endorig: '2026-06-27T09:25:21.650',
    dest: 'Training:Heidi',
    title: 'Gupta, Rajan',
    name: 'Rajan Gupta',
    name2: 'Rajan Gupta',
    NNO: 'N885GT',
    cat_grp: 1,
    cat: 'AIRPLANE',
    info: 'Training:Heidi;;mob:4044558636 ;;rajan@desipilot.com;;',
    emailto: 'rajan@desipilot.com',
    callto: '4044558636',
    mob: '4044558636',
    made_code: 64,
    date_made: '2026-05-25T20:35:16.560',
    made_by_name: 'Rajan Gupta',
    rule_exempt: false,
    tagMsg: '',
    className: 'other',
    file_id: 13861,
  },
];

function stubFetch(body: unknown, status = 200) {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  return mockFetch;
}

describe('getSchedule', () => {
  it('calls the correct endpoint with formatted dates and credentials', async () => {
    const fetch = stubFetch([]);
    await getSchedule('148772', 'ABC-SESSION', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);
    expect(fetch).toHaveBeenCalledOnce();
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain('/SchedData.aspx');
    expect(url).toContain('user_id=148772');
    expect(url).toContain('ses_id=ABC-SESSION');
    expect(url).toContain('start=06%2F27%2F2026');
    expect(url).toContain('end=06%2F28%2F2026');
    expect(url).toContain('subCmd=sch');
    expect(url).toContain('c=fCal');
  });

  it('passes userfilter parameter', async () => {
    const fetch = stubFetch([]);
    await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 1, fetch);
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain('userfilter=1');
  });

  it('maps NNO to tail and remaps snake_case fields', async () => {
    const fetch = stubFetch(RAW_EVENTS);
    const events = await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);

    expect(events[0].tail).toBe('N885GT');
    expect(events[0].dateMade).toBe('2026-06-21T21:58:34.277');
    expect(events[0].madeByName).toBe(' Weekly Inspection');
    expect(events[0].ruleExempt).toBe(true);
    expect(events[0].mob).toBeUndefined();

    expect(events[1].tail).toBe('N885GT');
    expect(events[1].mob).toBe('4044558636');
    expect(events[1].ruleExempt).toBe(false);
  });

  it('returns events with correct core fields', async () => {
    const fetch = stubFetch(RAW_EVENTS);
    const events = await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      id: 17221283,
      userId: '155975',
      resourceId: 6937,
      start: '2026-06-27T07:00:00',
      end: '2026-06-27T07:30:00',
      dest: 'Other:Weekly Inspection',
      name: ' Weekly Inspection',
      tagMsg: 'Jingzhi Yang',
      emailto: 'greerhardesty@gmail.com',
    });
    expect(events[1]).toMatchObject({
      id: 17233109,
      dest: 'Training:Heidi',
      name: 'Rajan Gupta',
      callto: '4044558636',
    });
  });

  it('returns an empty array for an empty response', async () => {
    const fetch = stubFetch([]);
    const events = await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);
    expect(events).toEqual([]);
  });

  it('throws on non-ok response', async () => {
    const fetch = stubFetch('Unauthorized', 401);
    await expect(
      getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch),
    ).rejects.toThrow('getSchedule failed: 401');
  });

  it('throws SessionExpiredError when rtn_data indicates session expired', async () => {
    const fetch = stubFetch({ rtn_data: 'Session invalid or expired' });
    await expect(
      getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch),
    ).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('parses multiple space-separated classNames', async () => {
    const fetch = stubFetch([{ ...RAW_EVENTS[0], className: 'predone other' }]);
    const events = await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);
    expect(events[0].classNames).toContain(EventClass.Predone);
    expect(events[0].classNames).toContain(EventClass.Other);
    expect(events[0].classNames).toHaveLength(2);
  });

  it('parses ovly className as an overlay maintenance event superseding a reservation', async () => {
    const fetch = stubFetch([{ ...RAW_EVENTS[0], className: 'ovly' }]);
    const events = await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);
    expect(events[0].classNames).toContain(EventClass.Ovly);
    expect(events[0].classNames).toHaveLength(1);
  });

  it('parses stby1 className as a standby reservation', async () => {
    const fetch = stubFetch([{ ...RAW_EVENTS[0], className: 'stby1' }]);
    const events = await getSchedule('148772', 'S', new Date(2026, 5, 27), new Date(2026, 5, 28), 0, fetch);
    expect(events[0].classNames).toContain(EventClass.Stby);
    expect(events[0].classNames).toHaveLength(1);
  });
});
