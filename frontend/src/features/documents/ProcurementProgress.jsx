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
        // Handle full circle case
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
        { label: 'On-going', value: ongoing, pct: ongoingPct, color: '#3b82f6', fill: 'url(#pie-ongoing)', start: completedEnd, end: ongoingEnd },
        { label: 'Pending', value: pending, pct: pendingPct, color: '#f59e0b', fill: 'url(#pie-pending)', start: ongoingEnd, end: pendingEnd },
    ];

    const barSeries = [
        { label: 'Lease of Venue', key: 'Lease of Venue', color: '#22c55e', gradient: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)' },
        { label: 'Small Value Procurement', key: 'Small Value Procurement', color: '#3b82f6', gradient: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)' },
        { label: 'Public Bidding', key: 'Public Bidding', color: '#8b5cf6', gradient: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)' },
    ];

    const barValues = barSeries.map((s) => Number(procurementMethodCounts?.[s.key]) || 0);
    const barTotal = barValues.reduce((a, b) => a + b, 0);
    const barMax = Math.max(1, ...barValues);

    return (
        <section className="overflow-visible flex flex-col min-w-0 dashboard-section border-b lg:border-b-0 border-[var(--border-light)] dashboard-section-progress" style={{ animationDelay: '0.25s' }}>
            <div className="px-6 py-5 border-b border-[var(--border-light)] bg-white/50">
                <h2 className="text-sm font-bold text-[var(--text)] uppercase tracking-widest flex items-center gap-2">
                    <MdPostAdd className="w-4 h-4 text-[var(--primary)]" />
                    Procurement Progress
                </h2>
                <p className="text-[11px] text-[var(--text-subtle)] mt-1 font-medium">Real-time status overview</p>
            </div>
            <div className="p-6 flex flex-col xl:flex-row gap-8 min-w-0 overflow-visible items-center sm:items-stretch bg-white">
                <div className="flex flex-col items-center py-6 sm:py-0 flex-shrink-0 xl:border-r border-[var(--border-light)] xl:pr-8">
                    <div className="relative w-72 h-72 flex-shrink-0 dashboard-pie-container">
                        <svg viewBox="0 0 100 100" className="w-full h-full dashboard-pie-svg filter drop-shadow-xl" aria-hidden>
                            <defs>
                                <linearGradient id="pie-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                                <linearGradient id="pie-ongoing" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#2563eb" />
                                </linearGradient>
                                <linearGradient id="pie-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#d97706" />
                                </linearGradient>
                            </defs>
                            {(completed + ongoing + pending) === 0 ? (
                                <circle cx={cx} cy={cy} r={r} fill="var(--background-subtle)" stroke="var(--border-light)" strokeWidth="1" className="dashboard-pie-empty" />
                            ) : (
                                <g>
                                    {sliceMeta.map((slice, idx) => {
                                        const path = wedgePath(slice.start, slice.end);
                                        if (!path) return null;
                                        const midAngle = (slice.start + slice.end) / 2;
                                        const mid = angleToXY(midAngle);
                                        const explodeDx = ((mid.x - cx) / r) * explodeDist;
                                        const explodeDy = ((mid.y - cy) / r) * explodeDist;
                                        return (
                                            <path
                                                key={slice.label}
                                                d={path}
                                                fill={slice.fill}
                                                className="dashboard-pie-wedge transition-transform duration-500 cursor-pointer"
                                                stroke="#fff"
                                                strokeWidth="2"
                                                transform={hoveredSlice === slice.label ? `translate(${explodeDx}, ${explodeDy})` : undefined}
                                                style={{ animationDelay: `${0.35 + idx * 0.1}s` }}
                                                onMouseEnter={() => setHoveredSlice(slice.label)}
                                                onMouseLeave={() => setHoveredSlice(null)}
                                            />
                                        );
                                    })}
                                </g>
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-[var(--text)] leading-none tracking-tighter">
                                {completed + ongoing + pending}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest mt-1">
                                TOTAL
                            </span>
                        </div>
                    </div>
                    {(completed + ongoing + pending) > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-8">
                            {sliceMeta.map((slice) => (
                                <div key={slice.label} className="flex items-center gap-2 group cursor-default" onMouseEnter={() => setHoveredSlice(slice.label)} onMouseLeave={() => setHoveredSlice(null)}>
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-[var(--text)] leading-none group-hover:text-[var(--primary)] transition-colors">{slice.label}</span>
                                        <span className="text-[10px] font-semibold text-[var(--text-subtle)] tabular-nums mt-0.5">{formatNumber(slice.value)} records</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-full min-w-0 flex-1 pt-10 xl:pt-4 xl:pl-10">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[var(--text)] uppercase tracking-widest">Procurement Methods</h3>
                        <span className="text-[10px] font-bold text-[var(--text-subtle)] bg-[var(--background-subtle)] px-2.5 py-1 rounded-full border border-[var(--border-light)] uppercase tracking-wider">Top Types</span>
                    </div>
                    <div className="space-y-10">
                        {(completed + ongoing + pending) === 0 ? (
                                    <div className="py-12 px-6 rounded-2xl bg-[var(--background-subtle)]/30 border-2 border-dashed border-[var(--border-light)] text-center">
                                <p className="text-sm font-bold text-[var(--text-muted)]">No data available yet</p>
                                <p className="text-xs text-[var(--text-subtle)] mt-2 font-medium">Once documents are submitted, their classification will appear here.</p>
                            </div>
                        ) : barTotal === 0 ? (
                            <div className="py-12 px-6 rounded-2xl bg-[var(--background-subtle)]/30 border-2 border-dashed border-[var(--border-light)] text-center">
                                <p className="text-sm font-bold text-[var(--text-muted)]">No classified data</p>
                                <p className="text-xs text-[var(--text-subtle)] mt-2 font-medium">Sub-documents like SVP or Public Bidding are required for metrics.</p>
                            </div>
                        ) : (
                            barSeries.map((series, i) => {
                                const value = Number(procurementMethodCounts?.[series.key]) || 0;
                                const pctOfTotal = barTotal > 0 ? (value / barTotal) * 100 : 0;
                                const pctOfMax = barMax > 0 ? (value / barMax) * 100 : 0;
                                const barWidthPct = value > 0 ? Math.max(pctOfMax, 4) : 0;
                                return (
                                    <div key={series.key} className="group min-w-0" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: series.color }} />
                                                <span className="text-base font-bold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors tracking-tight">{series.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-[var(--text)] tabular-nums">{value}</span>
                                                <span className="text-[10px] font-bold text-[var(--text-subtle)] ml-1">({formatNumber(pctOfTotal, 0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-6 w-full rounded-full bg-[var(--background-subtle)]/40 backdrop-blur-sm overflow-hidden border border-[var(--border-light)] relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] group-hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative animate-shimmer"
                                                style={{ 
                                                    width: `${barWidthPct}%`, 
                                                    background: series.gradient,
                                                    boxShadow: hoveredSlice === series.key || hoveredSlice === null ? `0 4px 12px ${series.color}40` : 'none'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
