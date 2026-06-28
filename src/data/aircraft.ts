import n314gt from '@/assets/airplanes/N314GT.jpg'
import n161gt from '@/assets/airplanes/N161GT.jpg'
import n885gt from '@/assets/airplanes/N885GT.jpg'
import n98714 from '@/assets/airplanes/N98714.jpg'
import n2247t from '@/assets/airplanes/N2247T.jpg'

export type AircraftStatus = 'available' | 'in_use' | 'maintenance';

export interface Squawk {
  id: string;
  text: string;
  reporter: string;
  date: string;
  note: string;
}

export interface Aircraft {
  tail: string;
  photo?: string;
  type: 'piston' | 'sim';
  makeModel: string;
  year: number;
  horsepower: number;
  cruise: number;
  seats: number;
  ratePerHour: number;
  status: AircraftStatus;
  statusNote: string;
  hobbs: number;
  tach: number;
  hundredHrRemaining: number | null;
  fuelCapacity: number | null;
  annualDue: string;
  eltExpiry: string;
  pitotStaticDue: string;
  squawks: Squawk[];
}

export const AIRCRAFT: Aircraft[] = [
  {
    tail: 'N314GT',
    photo: n314gt,
    type: 'piston',
    makeModel: 'Cessna 172P Skyhawk',
    year: 1981,
    horsepower: 180,
    cruise: 105,
    seats: 4,
    ratePerHour: 155,
    status: 'available',
    statusNote: 'Available',
    hobbs: 7841.2,
    tach: 7204.8,
    hundredHrRemaining: 72.3,
    fuelCapacity: 40,
    annualDue: 'Nov 2026',
    eltExpiry: 'Sep 2026',
    pitotStaticDue: 'Feb 2027',
    squawks: [],
  },
  {
    tail: 'N161GT',
    photo: n161gt,
    type: 'piston',
    makeModel: 'Cessna 172P Skyhawk',
    year: 1986,
    horsepower: 180,
    cruise: 110,
    seats: 4,
    ratePerHour: 167,
    status: 'available',
    statusNote: 'Available',
    hobbs: 9120.4,
    tach: 8387.1,
    hundredHrRemaining: 54.7,
    fuelCapacity: 50,
    annualDue: 'Dec 2026',
    eltExpiry: 'Jan 2027',
    pitotStaticDue: 'Jun 2027',
    squawks: [
      {
        id: 'sq-1',
        text: 'Compass card slightly off — reads ~5° east of actual',
        reporter: 'Benjamin, A.',
        date: 'Jun 20',
        note: 'Monitoring, not MEL-required',
      },
    ],
  },
  {
    tail: 'N885GT',
    photo: n885gt,
    type: 'piston',
    makeModel: 'Cessna 172S Skyhawk SP',
    year: 2004,
    horsepower: 180,
    cruise: 122,
    seats: 4,
    ratePerHour: 177,
    status: 'in_use',
    statusNote: 'In use · free at 18:00',
    hobbs: 3284.6,
    tach: 2991.2,
    hundredHrRemaining: 8.4,
    fuelCapacity: 53,
    annualDue: 'Aug 2026',
    eltExpiry: 'Mar 2027',
    pitotStaticDue: 'Jan 2027',
    squawks: [
      {
        id: 'sq-2',
        text: 'Right brake feels soft on first application',
        reporter: 'Khan, Z.',
        date: 'Jun 24',
        note: 'Monitoring, MEL not required',
      },
    ],
  },
  {
    tail: 'N98714',
    photo: n98714,
    type: 'piston',
    makeModel: 'Cessna 172P Skyhawk',
    year: 1985,
    horsepower: 180,
    cruise: 110,
    seats: 4,
    ratePerHour: 155,
    status: 'available',
    statusNote: 'Available',
    hobbs: 11203.7,
    tach: 10388.5,
    hundredHrRemaining: 38.1,
    fuelCapacity: 50,
    annualDue: 'Oct 2026',
    eltExpiry: 'Nov 2026',
    pitotStaticDue: 'Apr 2027',
    squawks: [],
  },
  {
    tail: 'N2247T',
    photo: n2247t,
    type: 'piston',
    makeModel: 'Cessna 182T Skylane',
    year: 2007,
    horsepower: 230,
    cruise: 135,
    seats: 4,
    ratePerHour: 248,
    status: 'maintenance',
    statusNote: 'Maint · 100-hr inspection',
    hobbs: 2847.0,
    tach: 2610.4,
    hundredHrRemaining: 0,
    fuelCapacity: 87,
    annualDue: 'Sep 2026',
    eltExpiry: 'Aug 2027',
    pitotStaticDue: 'Mar 2027',
    squawks: [],
  },
  {
    tail: 'BUZZ1',
    type: 'sim',
    makeModel: 'Redbird TD2',
    year: 2019,
    horsepower: 0,
    cruise: 0,
    seats: 2,
    ratePerHour: 0,
    status: 'available',
    statusNote: 'Sim · Available',
    hobbs: 0,
    tach: 0,
    hundredHrRemaining: null,
    fuelCapacity: null,
    annualDue: 'N/A',
    eltExpiry: 'N/A',
    pitotStaticDue: 'N/A',
    squawks: [],
  },
];

export function getAircraft(tail: string): Aircraft | undefined {
  return AIRCRAFT.find(a => a.tail === tail);
}

export function statusColor(status: AircraftStatus): string {
  switch (status) {
    case 'available': return '#1f9d57';
    case 'in_use': return '#EAAA00';
    case 'maintenance': return '#8a3d2f';
  }
}
