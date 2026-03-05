import React from 'react';

/**
 * Reusable page header with title, subtitle, and optional actions.
 */
const PageHeader = ({ title, subtitle, children, titleSize = 'lg' }) => {
    const titleClass = titleSize === 'lg' ? 'page-title-lg' : 'page-title';

    return (
        <header className="page-header min-w-0">
            <div className="flex items-start min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                    <h1 className={titleClass}>{title}</h1>
                    {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
                </div>
            </div>
            {children && (
                <div className="flex-shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {children}
                </div>
            )}
        </header>
    );
};

export default PageHeader;
