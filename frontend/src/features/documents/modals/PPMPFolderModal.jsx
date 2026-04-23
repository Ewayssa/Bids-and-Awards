import React, { useState, useEffect, useRef } from 'react';
import { 
    MdDownload, 
    MdDescription,
    MdCheckCircle
} from 'react-icons/md';
import Modal from '../../../components/Modal';

// Memoized Document Item to prevent unnecessary re-renders
const DocItem = React.memo(({ doc, isNear, innerRef }) => {
    return (
        <div 
            ref={innerRef}
            data-id={doc.id}
            className="w-full h-full bg-white snap-start snap-always relative overflow-hidden flex items-center justify-center"
        >
            {isNear ? (
                <div className="w-full h-full relative overflow-hidden">
                    {/* The Clipping Trick: Make iframe slightly larger than container to hide its native scrollbars */}
                    <iframe 
                        src={`${doc.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                        className="absolute inset-0 w-[108%] h-[108%] -top-[4%] -left-[4%] border-none"
                        title={doc.title}
                        loading="lazy"
                    />
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300">
                    <MdDescription className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Loading Document...</p>
                </div>
            )}
        </div>
    );
}, (prev, next) => prev.isNear === next.isNear && prev.doc.id === next.doc.id);

const PPMPFolderModal = ({ isOpen, onClose, ppmpNo, documents }) => {
    const [activeId, setActiveId] = useState(null);
    const scrollContainerRef = useRef(null);
    const itemRefs = useRef({});

    // Hooks order must be preserved - hooks before early return
    const folderDocs = (documents || [])
        .filter(d => d.file_url)
        .sort((a, b) => {
            const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
            const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
            return aTime - bTime;
        });

    // Intersection Observer to update sidebar on scroll
    useEffect(() => {
        if (!isOpen || folderDocs.length === 0) return;

        const observerOptions = {
            root: scrollContainerRef.current,
            rootMargin: '-15% 0px -60% 0px', // Precise middle-of-screen detection
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveId(entry.target.dataset.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        
        const currentItems = itemRefs.current;
        Object.values(currentItems).forEach(el => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [isOpen, folderDocs]);

    // Auto-scroll sidebar when main content scrolls
    useEffect(() => {
        if (activeId) {
            const sidebarItem = document.getElementById(`sidebar-doc-${activeId}`);
            if (sidebarItem) {
                sidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [activeId]);

    const scrollToDoc = (id) => {
        const element = itemRefs.current[id];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleDownload = () => {
        folderDocs.forEach((doc, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = doc.file_url;
                link.download = doc.title || `doc_${index}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 500);
        });
    };

    if (!isOpen) return null;

    const displayPPMP = ppmpNo?.replace(/Market scoping\s*(for)?\s*/gi, '') || 'Unassigned';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Procurement Documentation: PPMP ${displayPPMP}`}
            size="2xl"
            showCloseButton={true}
        >
            <div className="flex bg-white -m-6 h-[80vh] overflow-hidden">
                {/* Fixed Sidebar */}
                <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col h-full z-10">
                    <div className="p-6 border-b border-slate-200 bg-white/50 backdrop-blur-md">
                        <button
                            onClick={handleDownload}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-xl shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            <MdDownload className="w-4 h-4" />
                            Download
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {folderDocs.map((doc) => (
                            <button
                                key={doc.id}
                                id={`sidebar-doc-${doc.id}`}
                                onClick={() => scrollToDoc(doc.id)}
                                className={`w-full group text-left p-4 rounded-xl transition-all duration-300 border-l-4 ${
                                    activeId === String(doc.id) || (!activeId && folderDocs[0]?.id === doc.id)
                                    ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]' 
                                    : 'hover:bg-slate-100 border-transparent hover:translate-x-1'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                        (activeId === String(doc.id)) ? 'text-[var(--primary)]' : 'text-slate-400'
                                    }`}>
                                        {doc.category || 'General'}
                                    </span>
                                    {(activeId === String(doc.id)) && <MdCheckCircle className="w-3.5 h-3.5 text-[var(--primary)]" />}
                                </div>
                                <h5 className={`text-xs font-bold leading-tight ${
                                    (activeId === String(doc.id)) ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-800'
                                }`}>
                                    {doc.subDoc || 'Untitled'}
                                </h5>
                                <p className="text-[9px] text-slate-400 mt-1 truncate">{doc.title}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Seamless Scrollable Document Area - Visual scrollbar hidden for 'single-scroll' feel */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto bg-white snap-y snap-mandatory scrollbar-hide"
                    style={{ 
                        msOverflowStyle: 'none', 
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    <style>{`
                        .scrollbar-hide::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    {folderDocs.length > 0 ? (() => {
                        const activeIdx = folderDocs.findIndex(d => String(d.id) === activeId);
                        return folderDocs.map((doc, idx) => (
                            <DocItem 
                                key={doc.id}
                                doc={doc}
                                isNear={activeIdx === -1 || Math.abs(idx - activeIdx) <= 1}
                                innerRef={el => itemRefs.current[doc.id] = el}
                            />
                        ));
                    })() : (
                        <div className="flex flex-col items-center justify-center py-40 opacity-20 h-full">
                            <MdDescription className="w-24 h-24 mb-6" />
                            <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">No Documents</h3>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PPMPFolderModal;
