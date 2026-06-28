import { apiClient } from './client';
import type { ApiFetch } from './client';

export interface UserInfo {
  firstName: string;
  middleInitial: string;
  lastName: string;
  homePhone: string;
  workPhone: string;
  cellPhone: string;
  fax: string;
  faxDeliveryInfo: string;
  email1: string;
  email1Terse: boolean;
  email2: string;
  email2Terse: boolean;
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function parseUserInfo(html: string): UserInfo {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function inputValue(id: string): string {
    return (doc.getElementById(`ctl00_CPL1_${id}`) as HTMLInputElement | null)?.value ?? '';
  }

  function checkboxChecked(id: string): boolean {
    return (doc.getElementById(`ctl00_CPL1_${id}`) as HTMLInputElement | null)?.checked ?? false;
  }

  function selectValue(id: string): string {
    return (doc.getElementById(`ctl00_CPL1_${id}`) as HTMLSelectElement | null)?.value ?? '';
  }

  return {
    firstName: inputValue('tx_firstname'),
    middleInitial: inputValue('tx_mi'),
    lastName: inputValue('tx_lastname'),
    homePhone: inputValue('tx_hmphone'),
    workPhone: inputValue('tx_wrkphone'),
    cellPhone: inputValue('tx_cellphone'),
    fax: inputValue('tx_fax'),
    faxDeliveryInfo: inputValue('tx_faxDeliv'),
    email1: inputValue('tx_email'),
    email1Terse: checkboxChecked('ck_terse1'),
    email2: inputValue('tx_email2'),
    email2Terse: checkboxChecked('ck_terse2'),
    streetAddress: inputValue('tx_street'),
    streetAddress2: inputValue('tx_street2'),
    city: inputValue('tx_city'),
    state: inputValue('tx_St'),
    zip: inputValue('tx_zip'),
    country: selectValue('Country1_ddl_country'),
  };
}

export async function getUserInfo(
  userid: string,
  session: string,
  fetch: ApiFetch = apiClient,
): Promise<UserInfo> {
  const res = await fetch(`/UserInfo.aspx?userid=${userid}&session=${session}&GETUSER=M`);
  if (!res.ok) throw new Error(`getUserInfo failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return parseUserInfo(html);
}
