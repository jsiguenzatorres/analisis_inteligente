
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const [isBrowser, setIsBrowser] = useState(false);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen || !isBrowser) return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            {/* Backdrop with blur and dark overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out" 
                onClick={onClose}
                aria-hidden="true"
            ></div>
            
            {/* Modal Card */}
            <div 
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all scale-100 overflow-hidden border border-slate-700/50 animate-fade-in-up" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header - Premium BFA Style (Deep Corporate Blue) */}
                <div className="relative flex justify-between items-center px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-b border-white/10 shadow-lg overflow-hidden">
                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60"></div>
                    
                    <div className="flex items-center space-x-4 relative z-10">
                        {/* Icon Container - Glassmorphism & High Contrast */}
                        <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.2)] group-hover:bg-white/10 transition-all">
                            <i className="fas fa-info-circle text-amber-400 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"></i>
                        </div>
                        
                        <div className="flex flex-col">
                            <h3 className="text-xl font-extrabold text-white tracking-wide font-sans drop-shadow-md leading-tight">
                                {title}
                            </h3>
                            <div className="flex items-center mt-1">
                                <span className="h-px w-6 bg-blue-500/50 mr-2"></span>
                                <span className="text-[10px] text-blue-100 uppercase tracking-[0.2em] font-bold opacity-80">
                                    Guía Técnica
                                </span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="group p-2 rounded-full hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                        aria-label="Cerrar modal"
                    >
                        <i className="fas fa-times text-slate-400 text-lg group-hover:text-white group-hover:rotate-90 transition-all duration-300"></i>
                    </button>
                </div>

                {/* Content Area - Styled for readability */}
                <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-grow">
                    {/* The content container ensures styles from constants.tsx apply correctly */}
                    <div className="text-slate-700 leading-relaxed text-sm md:text-base">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600 font-bold text-sm transition-all transform hover:-translate-y-0.5 uppercase tracking-wide border border-slate-700"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );

    const rootElement = document.getElementById('root');
    return rootElement ? ReactDOM.createPortal(modalContent, rootElement) : null;
};

export default Modal;
