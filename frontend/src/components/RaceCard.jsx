import { Calendar, MapPin } from 'lucide-react';

export default function RaceCard({ race, onNavigate }) {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ĐÃ LÊN LỊCH':
        return 'bg-primary-container text-on-primary-container';
      case 'MỞ NHẬN ĐĂNG KÝ':
        return 'bg-secondary-container text-on-secondary-container';
      default:
        return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  return (
    <div className={`min-w-[280px] sm:min-w-[320px] bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between snap-start hover:border-secondary/40 transition-all duration-300 group ${
      race.status === 'ĐÃ LÊN LỊCH' ? 'emerald-accent-bar' : ''
    }`}>
      <div>
        <div className="flex justify-between items-center gap-2 mb-3">
          <span className={`text-[10px] font-semibold font-mono tracking-wider uppercase px-2.5 py-1 rounded-md ${getStatusBadgeClass(race.status)}`}>
            {race.status}
          </span>
          <span className="text-xs text-on-surface-variant font-mono flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary" />
            {race.date}, {race.time}
          </span>
        </div>
        <h3 className="font-serif text-lg font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">
          {race.name}
        </h3>
      </div>
      
      <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-2">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{race.venue}</span>
        </div>
      </div>
      
      <button 
        onClick={() => onNavigate('racedetails')}
        className="mt-5 w-full bg-surface-container-highest hover:bg-secondary hover:text-on-secondary text-xs font-semibold uppercase tracking-wider py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-on-surface border-none"
      >
        Xem chi tiết
      </button>
    </div>
  );
}
