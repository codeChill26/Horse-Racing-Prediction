import React from 'react';
import { Race, PageType } from '../types';
import { Route, Flag, Calendar } from 'lucide-react';

interface RaceCardProps {
  key?: string;
  race: Race;
  onNavigate: (page: PageType) => void;
}

export default function RaceCard({ race, onNavigate }: RaceCardProps) {
  // Define status styling based on exact spec
  const getStatusBadge = (status: Race['status']) => {
    switch (status) {
      case 'Scheduled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary font-semibold text-[10px] tracking-wider uppercase border border-primary/20">
            Scheduled
          </span>
        );
      case 'Registrations Open':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded bg-secondary/15 text-secondary font-semibold text-[10px] tracking-wider uppercase border border-secondary/20">
            Registrations Open
          </span>
        );
      case 'Upcoming':
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded bg-outline-variant/30 text-on-surface-variant font-semibold text-[10px] tracking-wider uppercase border border-outline-variant/50">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div 
      className={`min-w-[300px] flex-1 bg-surface-container-low rounded-xl p-6 snap-start hover:bg-surface-container hover:border-outline-variant/50 transition-all duration-300 border border-outline-variant/20 flex flex-col justify-between ${
        race.accent ? 'emerald-accent-bar ambient-shadow border-l-0' : ''
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          {getStatusBadge(race.status)}
          <span className="text-on-surface-variant font-mono text-[11px] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-on-surface-variant/70" />
            {race.time}
          </span>
        </div>

        <h3 className="font-serif text-2xl text-on-surface mb-1 font-semibold tracking-tight">
          {race.title}
        </h3>
        <p className="text-on-surface-variant font-sans text-xs mb-6">
          {race.tournament}
        </p>

        <div className="flex items-center gap-4 mb-6 text-on-tertiary-container text-xs">
          <div className="flex items-center gap-1.5">
            <Route className="w-4 h-4 text-primary/75" />
            <span className="font-medium">{race.distance}</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/50" />
          <div className="flex items-center gap-1.5">
            <Flag className="w-4 h-4 text-secondary/75" />
            <span className="font-medium">{race.legs}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onNavigate('racedetails')}
        className="block text-center w-full py-2.5 border border-outline-variant text-[13px] font-semibold uppercase tracking-wider rounded-lg text-on-surface hover:text-secondary hover:border-secondary hover:bg-secondary/5 transition-all cursor-pointer"
      >
        View Details
      </button>
    </div>
  );
}
