import { Link } from 'react-router-dom';
import { MdCheckCircle, MdSchedule, MdWarning } from 'react-icons/md';
import { formatNumber } from '../utils/helpers';

export const StatsGrid = ({ loading, stats }) => {
    const { pieData = [0, 0, 0, 0] } = stats;
    const [total, completed, ongoing, pending] = pieData.map(Number);

    const statCards = [
        { 
            value: completed, 
            label: 'Completed Documents', 
            icon: MdCheckCircle,
            iconBg: 'bg-green-500/10', 
            iconColor: 'text-green-600', 
            link: '/encode?status=complete',
            accentClass: 'stat-card--complete'
        },
        { 
            value: ongoing, 
            label: 'On going', 
            icon: MdSchedule,
            iconBg: 'bg-orange-500/10', 
            iconColor: 'text-orange-600', 
            link: '/encode?status=ongoing',
            accentClass: 'stat-card--ongoing'
        },
        { 
            value: pending, 
            label: 'Pending', 
            icon: MdWarning,
            iconBg: 'bg-rose-500/10', 
            iconColor: 'text-rose-600', 
            link: '/encode?status=pending',
            accentClass: 'stat-card--pending'
        },
    ];

    const renderCardContent = (card) => (
        <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
                <card.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-wider mb-0.5">{card.label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tabular-nums tracking-tight">
                        {loading ? '—' : formatNumber(card.value)}
                    </h3>
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 dashboard-stat-cards">
            {statCards.map((card, i) => (
                <Link 
                    key={card.label} 
                    to={card.link} 
                    className={`card stat-card ${card.accentClass} group relative p-5 sm:p-6 bg-white overflow-hidden`} 
                    style={{ animationDelay: `${i * 0.08}s` }}
                >
                    {renderCardContent(card)}
                </Link>
            ))}
        </div>
    );
};
