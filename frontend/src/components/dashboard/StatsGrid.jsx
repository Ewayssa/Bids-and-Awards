import { Link } from 'react-router-dom';
import { MdCheckCircle, MdSchedule, MdWarning } from 'react-icons/md';
import { formatNumber } from '../../utils/formatNumber';

export const StatsGrid = ({ loading, stats }) => {
    const { pieData = [0, 0, 0, 0] } = stats;
    const [total, completed, ongoing, pending] = pieData.map(Number);

    const statCards = [
        { 
            value: completed, 
            label: 'Completed', 
            icon: MdCheckCircle,
            iconBg: 'bg-green-50', 
            iconColor: 'text-green-600', 
            link: '/encode?status=complete',
            accentClass: 'stat-card--complete'
        },
        { 
            value: ongoing, 
            label: 'On-going', 
            icon: MdSchedule,
            iconBg: 'bg-amber-50', 
            iconColor: 'text-amber-600', 
            link: '/encode?status=ongoing',
            accentClass: 'stat-card--ongoing'
        },
        { 
            value: pending, 
            label: 'Pending', 
            icon: MdWarning,
            iconBg: 'bg-rose-50', 
            iconColor: 'text-rose-600', 
            link: '/encode?status=pending',
            accentClass: 'stat-card--pending'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 dashboard-stat-cards">
            {statCards.map((card, i) => (
                <Link 
                    key={card.label} 
                    to={card.link} 
                    className={`card stat-card ${card.accentClass} overflow-visible p-5 sm:p-6 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[var(--shadow-lg)] group block min-w-0 dashboard-stat-card`} 
                    style={{ animationDelay: `${i * 0.08}s` }}
                >
                    <div className="mb-3">
                        <span className={`inline-flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 shadow-sm ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                            <card.icon className="w-5 h-5" />
                        </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">{card.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[var(--text)] tabular-nums mt-0.5">
                        {loading ? '—' : formatNumber(card.value)}
                    </p>
                </Link>
            ))}
        </div>
    );
};
