import React from 'react';

/**
 * Reusable page header: title, optional subtitle, optional actions (right-aligned).
 * @param {boolean} insideCard - When true, header is the top of a card.
 * @param {string} variant - 'default' | 'minimal'
 */
const PageHeader = ({ title, subtitle, children, titleSize = 'lg', insideCard = false, variant = 'default' }) => {
    const titleClass = titleSize === 'lg' ? 'page-title-lg' : 'page-title';
    const hasActions = Boolean(children);

    return (
        <header className={`page-header min-w-0 ${insideCard ? 'page-header--inside' : ''} ${variant === 'minimal' ? 'page-header--minimal' : ''}`}>
            <div className="page-header__accent" aria-hidden />
            <div className="page-header__inner">
                <div className="page-header__main">
                    <h1 className={titleClass}>{title}</h1>
                    {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
                </div>
                {hasActions && <div className="page-header__actions">{children}</div>}
            </div>
        </header>
    );
};

export default PageHeader;
