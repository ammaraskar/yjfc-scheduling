import { apiClient } from './client';
import type { ApiFetch } from './client';

export interface LiveSquawk {
  title: string;
  date: string;
  dotColor: string;
  detail: string;
}

export interface MaintenanceItem {
  name: string;
  adUrl: string | null;
  dateDue: string | null;
  timeDue: number | null;
}

export interface ResStatus {
  tail: string;
  location: string;
  lastMaintEntry: string;
  lastMaintTach: number | null;
  ttaf: number | null;
  tsmoh: number | null;
  squawks: LiveSquawk[];
  maintenanceItems: MaintenanceItem[];
}

export function parseMaintDescription(info: string): string {
  // Parse semicolon-delimited fields: "shortForm;;fullDescription;;mob:...;;email;;..."
  // Sometimes fullDescription is omitted: "shortForm;;mob:...;;email;;..."
  // Contact info fields start with "mob:" or contain "@"
  const parts = info
    .split(';;')
    .map(p => p.trim())
    .filter(p => p && p !== ';'); // Filter out empty and lone semicolons
  
  // Helper to check if a part is contact info
  const isContactInfo = (part: string): boolean => 
    part.startsWith('mob:') || part.includes('@');
  
  // If we have at least 2 parts and the second one is NOT contact info, use it
  if (parts.length > 1 && !isContactInfo(parts[1])) {
    return parts[1];
  }
  
  // Otherwise fall back to the first part (short description)
  return parts[0] || '';
}

export function parseResStatus(html: string): ResStatus {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const tail = doc.getElementById('ctl00_CPLPopup_sp_resname')?.textContent?.trim() ?? '';
  const location = doc.getElementById('ctl00_CPLPopup_sp_location')?.textContent?.trim() ?? '';
  const lastMaintEntry = doc.getElementById('ctl00_CPLPopup_sp_entryInfo')?.textContent?.trim() ?? '';

  // Parse tach from "Last maint entry: 3157.80 on ..."
  const maintMatch = lastMaintEntry.match(/:\s*([\d.]+)/);
  const lastMaintTach = maintMatch ? parseFloat(maintMatch[1]) : null;

  // Parse "TTAF: 8011.00"
  const ttafText = doc.getElementById('ctl00_CPLPopup_div_TTAF')?.textContent ?? '';
  const ttafMatch = ttafText.match(/TTAF:\s*([\d.]+)/);
  const ttaf = ttafMatch ? parseFloat(ttafMatch[1]) : null;

  // Parse "TSMOH: 895.70"
  const tsmohText = doc.getElementById('ctl00_CPLPopup_div_TSMOH')?.textContent ?? '';
  const tsmohMatch = tsmohText.match(/TSMOH:\s*([\d.]+)/);
  const tsmoh = tsmohMatch ? parseFloat(tsmohMatch[1]) : null;

  // Parse squawks from accordion
  const squawks: LiveSquawk[] = [];
  const accordionDiv = doc.getElementById('ctl00_CPLPopup_acc_squawks');
  if (accordionDiv) {
    const headers = accordionDiv.querySelectorAll('.accordionHeader');
    const contents = accordionDiv.querySelectorAll('.accordionContent');

    headers.forEach((header, i) => {
      const dot = header.querySelector('.dot') as HTMLElement | null;
      const dotColor = dot?.style.backgroundColor ?? 'green';

      const innerDiv = header.querySelector('div');
      let date = '';
      let title = '';

      if (innerDiv) {
        for (const node of innerDiv.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent?.trim() ?? '';
            if (t) date = t;
          } else if (node.nodeName === 'SPAN') {
            const el = node as Element;
            if (!el.classList.contains('dot')) {
              title = el.textContent?.trim() ?? '';
            }
          }
        }
      }

      const detail = contents[i]?.querySelector('.squawk_detail')?.textContent?.trim() ?? '';
      if (title) squawks.push({ title, date, dotColor, detail });
    });
  }

  // Parse scheduled maintenance table
  const maintenanceItems: MaintenanceItem[] = [];
  const table = doc.getElementById('ctl00_CPLPopup_dg_SchedMaint');
  if (table) {
    table.querySelectorAll('tr').forEach((row, i) => {
      if (i === 0) return; // header row
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) return;

      const nameCell = cells[0];
      const adUrl = nameCell.querySelector('a')?.getAttribute('href') ?? null;
      const name = nameCell.textContent?.trim() ?? '';

      const dateDue = cells[1].querySelector('span')?.textContent?.trim() || null;
      const timeDueText = cells[2].querySelector('span')?.textContent?.trim() || null;
      const timeDue = timeDueText ? parseFloat(timeDueText) : null;

      if (name) {
        maintenanceItems.push({
          name,
          adUrl: adUrl || null,
          dateDue: dateDue || null,
          timeDue: timeDue !== null && !isNaN(timeDue) ? timeDue : null,
        });
      }
    });
  }

  return { tail, location, lastMaintEntry, lastMaintTach, ttaf, tsmoh, squawks, maintenanceItems };
}

export async function getResStatus(
  userid: string,
  session: string,
  tail: string,
  fetch: ApiFetch = apiClient,
): Promise<ResStatus> {
  const path = `/ResStatus.aspx?WINDOW=YES&USERID=${userid}&SESSION=${session}&N_NO=${encodeURIComponent(tail)}&parent=Schedule4`;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`getResStatus failed: ${res.status} ${res.statusText}`);
  return parseResStatus(await res.text());
}
