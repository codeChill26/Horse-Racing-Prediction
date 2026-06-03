export type PageType = 'dashboard' | 'signin' | 'signup' | 'racedetails';

export interface HorseRank {
  rank: number;
  name: string;
  stable: string;
  pts: number;
}

export interface JockeyRank {
  rank: number;
  name: string;
  wins: number;
  initials: string;
}

export interface Race {
  id: string;
  title: string;
  tournament: string;
  distance: string;
  legs: string;
  status: 'Scheduled' | 'Registrations Open' | 'Upcoming';
  time: string;
  accent?: boolean;
}

export interface GateEntry {
  gate: number;
  horse: string;
  jockey: string;
  form: (number | string)[];
  favorite?: boolean;
  odds: string;
  imageUrl?: string;
}

export interface User {
  fullName: string;
  email: string;
  role: 'owner' | 'jockey' | 'spectator';
  points: number;
}
