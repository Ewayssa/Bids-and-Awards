import { Link } from 'react-router-dom';
import { MdCheckCircle, MdSchedule } from 'react-icons/md';
import { formatNumber } from '../utils/helpers';

export const StatsGrid = ({ loading, stats }) => {
    const { pieData = [0, 0, 0, 0] } = stats;
    const [, completed, ongoing] = pieData.map(Number);

    const statCards = [
        { 
            value: completed, 
            label: 'Completed', 
            icon: MdCheckCircle,
            color: 'from-emerald-500 to-emerald-600',
            bg: 'bg-emerald-50/50',
            text: 'text-emerald-700',
            link: '/encode?status=complete',
        },
        { 
            value: ongoing, 
            label: 'On-going', 
            icon: MdSchedule,
            color: 'from-amber-500 to-amber-600',
            bg: 'bg-amber-50/50',
            text: 'text-amber-700',
            link: '/encode?status=ongoing',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {statCards.map((card, i) => (
                <Link 
                    key={card.label} 
                    to={card.link} 
                    className="group relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 hover:-translate-y-1"
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-[0.03] rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150`} />
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                            <card.icon className="w-7 h-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{card.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-slate-800 tabular-nums tracking-tighter">
                                    {loading ? '—' : formatNumber(card.value)}
                                </h3>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Records</span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};
