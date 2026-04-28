import React, { useState } from 'react';
import { formatNumber } from '../../utils/helpers.jsx';
import { MdPostAdd } from 'react-icons/md';

export const ProcurementProgress = ({ pieData, procurementMethodCounts, ringProgress, loading }) => {
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const normalizedPieData = Array.isArray(pieData) && pieData.length >= 4
        ? pieData.map((v) => Number(v) || 0)
        : [0, 0, 0, 0];
    const [_, completed, ongoing, pending] = normalizedPieData;
    const totalNorm = (completed + ongoing + pending) || 1;

    const completedPct = (completed / totalNorm) * 100;
    const ongoingPct = (ongoing / totalNorm) * 100;
    const pendingPct = (pending / totalNorm) * 100;

    const cx = 50;
    const cy = 50;
    const r = 40;
    const totalAngle = 360;
    const explodeDist = 6;

    const angleToXY = (angleDeg) => {
        const rad = (angleDeg - 90) * (Math.PI / 180);
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const wedgePath = (startDeg, endDeg) => {
        if (endDeg <= startDeg) return '';
        if (Math.abs(endDeg - startDeg) >= 360) {
            return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
        }
        const s = angleToXY(startDeg);
        const e = angleToXY(endDeg);
        const large = endDeg - startDeg > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
    };

    const deg = (pct) => (pct / 100) * totalAngle;
    const completedEnd = deg(completedPct) * ringProgress;
    const ongoingEnd = completedEnd + deg(ongoingPct) * ringProgress;
    const pendingEnd = ongoingEnd + deg(pendingPct) * ringProgress;

    const sliceMeta = [
        { label: 'Completed', value: completed, pct: completedPct, color: '#10b981', fill: 'url(#pie-completed)', start: 0, end: completedEnd },
        { label: 'On Going', value: ongoing, pct: ongoingPct, color: '#3b82f6', fill: 'url(#pie-ongoing)', start: completedEnd, end: ongoingEnd },
        { label: 'Pending', value: pending, pct: pendingPct, color: '#f59e0b', fill: 'url(#pie-pending)', start: ongoingEnd, end: pendingEnd },
    ];
    const legendMeta = sliceMeta.filter((slice) => slice.label === 'Completed' || slice.label === 'On Going');

    const barSeries = [
        { label: 'Lease of Venue', key: 'Lease of Venue', color: '#10b981', gradient: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)' },
        { label: 'Small Value', key: 'Small Value Procurement', color: '#3b82f6', gradient: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)' },
        { label: 'Public Bidding', key: 'Public Bidding', color: '#8b5cf6', gradient: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)' },
        { label: 'Negotiated', key: 'Negotiated Procurement', color: '#f59e0b', gradient: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)' },
    ];

    const barValues = barSeries.map((s) => Number(procurementMethodCounts?.[s.key]) || 0);
    const barTotal = barValues.reduce((a, b) => a + b, 0);
    const barMax = Math.max(1, ...barValues);

    return (
        <section className="overflow-visible flex flex-col min-w-0 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-1" style={{ animationDelay: '0.25s' }}>
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <p className="text-xl font-black text-slate-800 tracking-tight">Procurement Progress</p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">
                    Real-time
                </div>
            </div>
            
            <div className="p-8 flex flex-col xl:flex-row gap-12 items-center">
                <div className="flex flex-col items-center gap-5 flex-shrink-0">
                    <div className="relative w-64 h-64">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
                            <defs>
                                <linearGradient id="pie-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#34d399" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                                <linearGradient id="pie-ongoing" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#60a5fa" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                                <linearGradient id="pie-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#fbbf24" />
                                    <stop offset="100%" stopColor="#f59e0b" />
                                </linearGradient>
                            </defs>
                            {(completed + ongoing + pending) === 0 ? (
                                <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
                            ) : (
                                <g>
                                    {sliceMeta.map((slice) => {
                                        const path = wedgePath(slice.start, slice.end);
                                        if (!path) return null;
                                        const midAngle = (slice.start + slice.end) / 2;
                                        const mid = angleToXY(midAngle);
                                        const explodeDx = ((mid.x - cx) / r) * (hoveredSlice === slice.label ? explodeDist : 0);
                                        const explodeDy = ((mid.y - cy) / r) * (hoveredSlice === slice.label ? explodeDist : 0);
                                        return (
                                            <path
                                                key={slice.label}
                                                d={path}
                                                fill={slice.fill}
                                                className="transition-all duration-500 cursor-pointer"
                                                stroke="#fff"
                                                strokeWidth="2"
                                                transform={`translate(${explodeDx}, ${explodeDy})`}
                                                onMouseEnter={() => setHoveredSlice(slice.label)}
                                                onMouseLeave={() => setHoveredSlice(null)}
                                            />
                                        );
                                    })}
                                </g>
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-slate-800 leading-none tracking-tighter">
                                {completed + ongoing + pending}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                TOTAL
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                        {legendMeta.map((slice) => (
                            <button
                                key={slice.label}
                                type="button"
                                className={`min-w-0 rounded-2xl border px-3 py-2 text-left transition-all duration-200 ${
                                    hoveredSlice === slice.label
                                        ? 'border-slate-300 bg-slate-50 shadow-lg shadow-slate-200/60'
                                        : 'border-slate-100 bg-white hover:bg-slate-50'
                                }`}
                                onMouseEnter={() => setHoveredSlice(slice.label)}
                                onMouseLeave={() => setHoveredSlice(null)}
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                                    <span className="truncate text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                        {slice.label}
                                    </span>
                                </span>
                                <span className="mt-1 block text-sm font-black text-slate-800 tabular-nums">
                                    {slice.value}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full flex-1 space-y-6">
                    {barSeries.map((series, i) => {
                        const value = Number(procurementMethodCounts?.[series.key]) || 0;
                        const pctOfMax = barMax > 0 ? (value / barMax) * 100 : 0;
                        return (
                            <div key={series.key} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-800 transition-colors">
                                        {series.label}
                                    </span>
                                    <span className="text-lg font-black text-slate-800 tabular-nums">
                                        {value}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ 
                                            width: `${value > 0 ? Math.max(pctOfMax, 4) : 0}%`, 
                                            background: series.gradient,
                                            boxShadow: `0 0 12px ${series.color}40`
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
