import React, { useState } from 'react';
import { formatNumber } from '../../utils/helpers';

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
        { label: 'On-going', value: ongoing, pct: ongoingPct, color: '#f59e0b', fill: 'url(#pie-ongoing)', start: completedEnd, end: ongoingEnd },
        { label: 'Pending', value: pending, pct: pendingPct, color: '#ef4444', fill: 'url(#pie-pending)', start: ongoingEnd, end: pendingEnd },
    ];

    const barSeries = [
        { label: 'Lease of Venue', key: 'Lease of Venue', color: '#22c55e', gradient: 'linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)' },
        { label: 'Small Value Procurement', key: 'Small Value Procurement', color: '#3b82f6', gradient: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)' },
        { label: 'Public Bidding', key: 'Public Bidding', color: '#8b5cf6', gradient: 'linear-gradient(180deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)' },
    ];

    const barValues = barSeries.map((s) => Number(procurementMethodCounts?.[s.key]) || 0);
    const barTotal = barValues.reduce((a, b) => a + b, 0);
    const barMax = Math.max(1, ...barValues);

    return (
        <section className="overflow-visible flex flex-col min-w-0 dashboard-section border-b-2 lg:border-b-0 border-[var(--border)] dashboard-section-progress" style={{ animationDelay: '0.25s' }}>
            <div className="section-header section-header--nested">
                <h2 className="text-base font-bold text-[var(--text)]">Procurement Progress</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Overview by completion</p>
            </div>
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-6 min-w-0 overflow-visible items-center sm:items-stretch">
                <div className="flex flex-col items-center py-4 sm:py-0 flex-shrink-0">
                    <div className="relative w-56 h-56 sm:w-72 sm:h-72 flex-shrink-0 dashboard-pie-container">
                        <svg viewBox="0 0 100 100" className="w-full h-full dashboard-pie-svg" aria-hidden>
                            <defs>
                                <filter id="dashboard-pie-shadow" x="-30%" y="-30%" width="160%" height="160%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.15" />
                                </filter>
                                <linearGradient id="pie-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#16a34a" />
                                    <stop offset="100%" stopColor="#22c55e" />
                                </linearGradient>
                                <linearGradient id="pie-ongoing" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#fde047" />
                                    <stop offset="100%" stopColor="#eab308" />
                                </linearGradient>
                                <linearGradient id="pie-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f87171" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                            {(completed + ongoing + pending) === 0 ? (
                                <circle cx={cx} cy={cy} r={r} fill="var(--border-light)" stroke="var(--border)" strokeWidth="2" className="dashboard-pie-empty" />
                            ) : (
                                <g filter="url(#dashboard-pie-shadow)">
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
                                                className="dashboard-pie-wedge"
                                                stroke="rgba(255,255,255,0.4)"
                                                strokeWidth="1.5"
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
                        {hoveredSlice && (completed + ongoing + pending) > 0 && (() => {
                            const slice = sliceMeta.find((s) => s.label === hoveredSlice);
                            return slice ? (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 flex flex-nowrap items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-light)] shadow-lg whitespace-nowrap z-10 pointer-events-none dashboard-pie-tooltip">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: slice.color }} />
                                    <span className="text-sm font-medium text-[var(--text)]">{slice.label}</span>
                                    <span className="text-xs text-[var(--text-muted)] tabular-nums">{formatNumber(slice.value)} ({formatNumber(slice.pct, 0)}%)</span>
                                </div>
                            ) : null;
                        })()}
                    </div>
                    {(completed + ongoing + pending) > 0 && (
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 pt-3">
                            {sliceMeta.map((slice) => (
                                <div key={slice.label} className="flex items-center gap-2 dashboard-pie-legend-item">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white shadow-sm" style={{ backgroundColor: slice.color }} />
                                    <span className="text-xs font-medium text-[var(--text)]">{slice.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-full min-w-0 flex-1 sm:min-w-[200px] pt-6 sm:pt-0 sm:pl-6">
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-[var(--text)]">Procurement Types</h3>
                    </div>
                    <div className="space-y-2">
                        {(completed + ongoing + pending) === 0 ? (
                                    <div className="py-8 px-4 rounded-xl bg-[var(--background-subtle)] border border-dashed border-[var(--border-light)] text-center">
                                <p className="text-sm font-medium text-[var(--text-muted)]">No documents yet</p>
                                <p className="text-xs text-[var(--text-subtle)] mt-1">Counts will appear here once documents are uploaded.</p>
                            </div>
                        ) : barTotal === 0 ? (
                            <div className="py-8 px-4 rounded-xl bg-[var(--background-subtle)] border border-dashed border-[var(--border-light)] text-center">
                                <p className="text-sm font-medium text-[var(--text-muted)]">No procurement method data</p>
                                <p className="text-xs text-[var(--text-subtle)] mt-1">Upload documents with Lease of Venue / Small Value Procurement / Public Bidding</p>
                            </div>
                        ) : (
                            barSeries.map((series, i) => {
                                const value = Number(procurementMethodCounts?.[series.key]) || 0;
                                const pctOfTotal = barTotal > 0 ? (value / barTotal) * 100 : 0;
                                const pctOfMax = barMax > 0 ? (value / barMax) * 100 : 0;
                                const barWidthPct = value > 0 ? Math.max(pctOfMax, 8) : 0;
                                return (
                                    <div key={series.key} className="flex flex-col gap-2 min-w-0 dashboard-bar-row rounded-xl px-3 py-2.5 -mx-1 transition-colors duration-200" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
                                        <div className="flex justify-between items-baseline gap-2 min-w-0">
                                            <span className="text-sm font-medium text-[var(--text)] truncate">{series.label}</span>
                                            <span className="text-sm font-semibold text-[var(--text)] tabular-nums flex-shrink-0">
                                                {loading ? '—' : (barTotal > 0 && value >= 0 ? `${formatNumber(pctOfTotal, 0)}%` : '—')}
                                            </span>
                                        </div>
                                        <div className="h-12 w-full rounded-xl bg-gradient-to-b from-[var(--background-subtle)] to-[var(--border-light)] overflow-hidden border border-[var(--border-light)] relative shadow-inner">
                                            <div
                                                className={`h-full transition-all duration-700 ease-out dashboard-bar-fill ${barWidthPct >= 99 ? 'rounded-xl' : 'rounded-l-xl'}`}
                                                style={{ width: `${barWidthPct}%`, background: value > 0 ? series.gradient : 'transparent', boxShadow: value > 0 ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 3px 8px rgba(0,0,0,0.15)' : undefined }}
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
