import { HorseRank, JockeyRank, Race, GateEntry } from '../types';

export const TOP_HORSES: HorseRank[] = [
  { rank: 1, name: 'Midnight Runner', stable: 'Ironclad', pts: 4250 },
  { rank: 2, name: 'Gilded Star', stable: 'Royal Turf', pts: 3980 },
  { rank: 3, name: 'Thunderhoof', stable: 'Apex', pts: 3810 },
  { rank: 4, name: 'Shadow Dancer', stable: 'Midnight', pts: 3650 },
  { rank: 5, name: 'Silver Bullet', stable: 'Steel', pts: 3420 }
];

export const TOP_JOCKEYS: JockeyRank[] = [
  { rank: 1, name: 'Marcus Sterling', wins: 86, initials: 'M.S' },
  { rank: 2, name: 'Elena Vance', wins: 82, initials: 'E.V' },
  { rank: 3, name: 'David Kim', wins: 78, initials: 'D.K' },
  { rank: 4, name: 'Sarah Hughes', wins: 75, initials: 'S.H' },
  { rank: 5, name: 'Julian Dupont', wins: 71, initials: 'J.D' }
];

export const UPCOMING_RACES: Race[] = [
  {
    id: 'emerald-stakes',
    title: 'The Emerald Stakes',
    tournament: 'Crown Jewel Tournament',
    distance: '3km',
    legs: '3 Legs',
    status: 'Scheduled',
    time: 'Today, 14:00',
    accent: true
  },
  {
    id: 'midnight-sprint',
    title: 'Midnight Sprint',
    tournament: 'Global Series',
    distance: '1.5km',
    legs: '1 Leg',
    status: 'Registrations Open',
    time: 'Tomorrow, 16:30'
  },
  {
    id: 'autumn-classic',
    title: 'Autumn Classic',
    tournament: 'Seasonal Cup',
    distance: '2.4km',
    legs: '2 Legs',
    status: 'Upcoming',
    time: 'Oct 24, 09:00'
  }
];

export const THE_ROYAL_SPRINT_ENTRIES: GateEntry[] = [
  {
    gate: 1,
    horse: 'Midnight Runner',
    jockey: 'Marcus Vale',
    form: [1, 2, 1, '-'],
    favorite: true,
    odds: '2/1',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC7s38q9664kVgT_TSMvx5ObdS38kkZe5uF6UrviMkqKIHLcOF_Z1Rzu0mD1XGM7vNv_VZkT7kRFqCj34p_HnnA3lrX9eKsfefIMoLP-QTQGWquTSSN4wKo6Zm3n_tprTQ8UGppUo1DUxWUV2gw6JfF2FnOQhzDHY4VRojci3k0CbwwwEQpA_KcIEFhMuBvlToRUHkwSObe3l-RSNW9h6vVLx8e8GjjAV2XwefX_aJYq765M0GqAewsEpebSlxLywFFHw5gLMgjAcj'
  },
  {
    gate: 2,
    horse: 'Gilded Majesty',
    jockey: 'Sarah Thorne',
    form: [4, 2, 5, 3],
    odds: '5/2'
  },
  {
    gate: 3,
    horse: 'Storm Caller',
    jockey: 'Elias Rook',
    form: [6, 8, 5, 4],
    odds: '8/1'
  }
];
