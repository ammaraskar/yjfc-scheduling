// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { getUserInfo, parseUserInfo } from './userinfo';

const FIXTURE_HTML = `<!DOCTYPE html>
<html><body>
<input id="ctl00_CPL1_tx_firstname" value="Jane" />
<input id="ctl00_CPL1_tx_mi" value="Q" />
<input id="ctl00_CPL1_tx_lastname" value="Doe" />
<input id="ctl00_CPL1_tx_hmphone" value="5551234567" />
<input id="ctl00_CPL1_tx_wrkphone" value="" />
<input id="ctl00_CPL1_tx_cellphone" value="5559876543" />
<input id="ctl00_CPL1_tx_fax" value="" />
<input id="ctl00_CPL1_tx_faxDeliv" value="" />
<input id="ctl00_CPL1_tx_email" value="jane@example.com" />
<input id="ctl00_CPL1_ck_terse1" type="checkbox" />
<input id="ctl00_CPL1_tx_email2" value="jane2@example.com" />
<input id="ctl00_CPL1_ck_terse2" type="checkbox" checked />
<input id="ctl00_CPL1_tx_street" value="123 Main St" />
<input id="ctl00_CPL1_tx_street2" value="Apt 4" />
<input id="ctl00_CPL1_tx_city" value="Springfield" />
<input id="ctl00_CPL1_tx_St" value="IL" />
<input id="ctl00_CPL1_tx_zip" value="62701" />
<select id="ctl00_CPL1_Country1_ddl_country">
  <option value="CA">Canada</option>
  <option value="US" selected>United States</option>
</select>
</body></html>`;

describe('parseUserInfo', () => {
  it('parses name fields', () => {
    const info = parseUserInfo(FIXTURE_HTML);
    expect(info.firstName).toBe('Jane');
    expect(info.middleInitial).toBe('Q');
    expect(info.lastName).toBe('Doe');
  });

  it('parses phone fields', () => {
    const info = parseUserInfo(FIXTURE_HTML);
    expect(info.homePhone).toBe('5551234567');
    expect(info.workPhone).toBe('');
    expect(info.cellPhone).toBe('5559876543');
    expect(info.fax).toBe('');
    expect(info.faxDeliveryInfo).toBe('');
  });

  it('parses email fields and terse checkboxes', () => {
    const info = parseUserInfo(FIXTURE_HTML);
    expect(info.email1).toBe('jane@example.com');
    expect(info.email1Terse).toBe(false);
    expect(info.email2).toBe('jane2@example.com');
    expect(info.email2Terse).toBe(true);
  });

  it('parses address fields', () => {
    const info = parseUserInfo(FIXTURE_HTML);
    expect(info.streetAddress).toBe('123 Main St');
    expect(info.streetAddress2).toBe('Apt 4');
    expect(info.city).toBe('Springfield');
    expect(info.state).toBe('IL');
    expect(info.zip).toBe('62701');
    expect(info.country).toBe('US');
  });
});

describe('getUserInfo', () => {
  it('fetches the correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(FIXTURE_HTML, { status: 200 }));
    await getUserInfo('111', 'ABC-123', mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      '/UserInfo.aspx?userid=111&session=ABC-123&GETUSER=M',
    );
  });

  it('returns parsed user info', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(FIXTURE_HTML, { status: 200 }));
    const info = await getUserInfo('111', 'ABC-123', mockFetch);
    expect(info.firstName).toBe('Jane');
    expect(info.lastName).toBe('Doe');
  });

  it('throws when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(getUserInfo('x', 'y', mockFetch)).rejects.toThrow('getUserInfo failed: 403');
  });
});
