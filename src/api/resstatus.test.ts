// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { getResStatus, parseResStatus, parseMaintDescription } from './resstatus';

const FIXTURE_HTML = `<!DOCTYPE html>
<html><body>
<span id="ctl00_CPLPopup_sp_resname">N885GT</span>
<span id="ctl00_CPLPopup_sp_location">PDK</span>
<span id="ctl00_CPLPopup_sp_entryInfo">Last maint entry: 3157.80 on 6/27/2026 9:25:21 AM</span>
<div id="ctl00_CPLPopup_div_TTAF_TSMOH">
  <div id="ctl00_CPLPopup_div_TTAF" style="display:inline-block; margin-right: 12px">TTAF: 8011.00</div>
  <div id="ctl00_CPLPopup_div_TSMOH" style="display:inline-block">TSMOH: 895.70</div>
</div>
<div id="ctl00_CPLPopup_acc_squawks" class="accordion">
  <div id="ctl00_CPLPopup_h0" class="accordionHeader">
    <div>
      <div style="display:inline-block; width: 25px"></div>
      <span class="dot" style="background-color:green"></span>
      6/22/2026
      <span>Flap Tracks</span>
    </div>
  </div>
  <div id="ctl00_CPLPopup_c0" class="accordionContent">
    <span class="squawk_detail">06/22/26 Flap tracks and rollers to be replaced at next 100-hr.(N885GT Crewchief)
</span>
  </div>
  <div id="ctl00_CPLPopup_h1" class="accordionHeader">
    <div>
      <div style="display:inline-block; width: 25px"></div>
      <span class="dot" style="background-color:red"></span>
      6/10/2026
      <span>Bad EGT #4</span>
    </div>
  </div>
  <div id="ctl00_CPLPopup_c1" class="accordionContent">
    <span class="squawk_detail">06/10/26 EGT reads incorrectly high.(Ariel Mordoch)
06/11/26 Still observed.(Jacob Lee)
</span>
  </div>
</div>
<table id="ctl00_CPLPopup_dg_SchedMaint" border="1">
  <tr><th scope="col">Item Name</th><th scope="col">Date Due</th><th scope="col">Time Due</th></tr>
  <tr>
    <td><a href="https://rgl.faa.gov/example" id="ctl00_CPLPopup_dg_SchedMaint_ctl02_a_name">AD 84-26-02 500 Hr Air Filter Replacement</a></td>
    <td><span style="color:"></span></td>
    <td><span style="color:"></span></td>
  </tr>
  <tr>
    <td><span id="ctl00_CPLPopup_dg_SchedMaint_ctl03_sp_name">100 Hour Inspection</span></td>
    <td><span style="color:"></span></td>
    <td><span style="color:">3174.7</span></td>
  </tr>
  <tr>
    <td><span id="ctl00_CPLPopup_dg_SchedMaint_ctl04_sp_name">Annual Inspection</span></td>
    <td><span style="color:">11/30/26</span></td>
    <td><span style="color:"></span></td>
  </tr>
</table>
</body></html>`;

describe('parseResStatus', () => {
  it('parses basic metadata', () => {
    const status = parseResStatus(FIXTURE_HTML);
    expect(status.tail).toBe('N885GT');
    expect(status.location).toBe('PDK');
    expect(status.lastMaintEntry).toBe('Last maint entry: 3157.80 on 6/27/2026 9:25:21 AM');
    expect(status.lastMaintTach).toBe(3157.80);
    expect(status.ttaf).toBe(8011.00);
    expect(status.tsmoh).toBe(895.70);
  });

  it('parses squawk titles and dates', () => {
    const { squawks } = parseResStatus(FIXTURE_HTML);
    expect(squawks).toHaveLength(2);
    expect(squawks[0].title).toBe('Flap Tracks');
    expect(squawks[0].date).toBe('6/22/2026');
    expect(squawks[1].title).toBe('Bad EGT #4');
    expect(squawks[1].date).toBe('6/10/2026');
  });

  it('parses squawk dot color', () => {
    const { squawks } = parseResStatus(FIXTURE_HTML);
    expect(squawks[0].dotColor).toBe('green');
    expect(squawks[1].dotColor).toBe('red');
  });

  it('parses squawk detail text', () => {
    const { squawks } = parseResStatus(FIXTURE_HTML);
    expect(squawks[0].detail).toBe('06/22/26 Flap tracks and rollers to be replaced at next 100-hr.(N885GT Crewchief)');
    expect(squawks[1].detail).toContain('06/10/26 EGT reads incorrectly high.(Ariel Mordoch)');
    expect(squawks[1].detail).toContain('06/11/26 Still observed.(Jacob Lee)');
  });

  it('parses maintenance item with AD link', () => {
    const { maintenanceItems } = parseResStatus(FIXTURE_HTML);
    const ad = maintenanceItems.find(item => item.name.includes('AD 84-26-02'));
    expect(ad).toBeDefined();
    expect(ad!.adUrl).toBe('https://rgl.faa.gov/example');
    expect(ad!.dateDue).toBeNull();
    expect(ad!.timeDue).toBeNull();
  });

  it('parses maintenance item with time due', () => {
    const { maintenanceItems } = parseResStatus(FIXTURE_HTML);
    const hundredHr = maintenanceItems.find(item => item.name.includes('100 Hour'));
    expect(hundredHr).toBeDefined();
    expect(hundredHr!.timeDue).toBe(3174.7);
    expect(hundredHr!.dateDue).toBeNull();
  });

  it('parses maintenance item with date due', () => {
    const { maintenanceItems } = parseResStatus(FIXTURE_HTML);
    const annual = maintenanceItems.find(item => item.name.includes('Annual'));
    expect(annual).toBeDefined();
    expect(annual!.dateDue).toBe('11/30/26');
    expect(annual!.timeDue).toBeNull();
    expect(annual!.adUrl).toBeNull();
  });

  it('returns empty arrays when accordion and table are absent', () => {
    const minimal = `<!DOCTYPE html><html><body>
      <span id="ctl00_CPLPopup_sp_resname">N314GT</span>
      <span id="ctl00_CPLPopup_sp_location">PDK</span>
    </body></html>`;
    const status = parseResStatus(minimal);
    expect(status.tail).toBe('N314GT');
    expect(status.ttaf).toBeNull();
    expect(status.tsmoh).toBeNull();
    expect(status.lastMaintTach).toBeNull();
    expect(status.squawks).toEqual([]);
    expect(status.maintenanceItems).toEqual([]);
  });
});

describe('getResStatus', () => {
  it('fetches the correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(FIXTURE_HTML, { status: 200 }));
    await getResStatus('148772', 'ABC-123', 'N885GT', mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      '/ResStatus.aspx?WINDOW=YES&USERID=148772&SESSION=ABC-123&N_NO=N885GT&parent=Schedule4',
    );
  });

  it('returns parsed status', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(FIXTURE_HTML, { status: 200 }));
    const status = await getResStatus('148772', 'ABC-123', 'N885GT', mockFetch);
    expect(status.tail).toBe('N885GT');
    expect(status.location).toBe('PDK');
  });

  it('throws when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(getResStatus('x', 'y', 'N885GT', mockFetch)).rejects.toThrow('getResStatus failed: 403');
  });
});

describe('parseMaintDescription', () => {
  it('extracts full description from semicolon-delimited fields', () => {
    const info = '100-hr;;100-hour inspection at GVL;;mob:678-777-6788;;whitmerm@thenerdwerks.com;;';
    expect(parseMaintDescription(info)).toBe('100-hour inspection at GVL');
  });

  it('falls back to short description when full description is missing', () => {
    const info = 'Repainting;;mob:7702654914;;owengcarroll@gmail.com;;';
    expect(parseMaintDescription(info)).toBe('Repainting');
  });

  it('falls back to first part when only one field exists', () => {
    const info = 'Single field description';
    expect(parseMaintDescription(info)).toBe('Single field description');
  });

  it('handles whitespace correctly', () => {
    const info = '  short  ;;  full description  ;;  mob:123  ;;';
    expect(parseMaintDescription(info)).toBe('full description');
  });

  it('returns empty string when input is empty or all whitespace', () => {
    expect(parseMaintDescription('')).toBe('');
    expect(parseMaintDescription(';;')).toBe('');
    expect(parseMaintDescription('   ;;   ;;   ')).toBe('');
  });

  it('returns empty string when all parts are empty after trimming', () => {
    const info = ';;;;;;;';
    expect(parseMaintDescription(info)).toBe('');
  });

  it('detects email addresses in any field as contact info', () => {
    const info = 'short;;user@example.com;;other;;';
    expect(parseMaintDescription(info)).toBe('short');
  });

  it('handles "mob:" prefix correctly', () => {
    const info = 'Inspection;;mob:555-1234;;';
    expect(parseMaintDescription(info)).toBe('Inspection');
  });
});
