
import React from 'react';
import { AppView } from '../../App';

interface StepperProps {
    currentView: AppView;
}

const Stepper: React.FC<StepperProps> = ({ currentView }) => {
    // Iconos actualizados "Nano Banana Design" para representar el flujo real de auditoría
    const steps = [
        { name: 'Datos Validados', id: 0, icon: 'fa-file-circle-check' }, // Archivo verificado/integro
        { name: 'Panel de Muestreo', id: 1, icon: 'fa-chart-pie' }, // Análisis visual/Dashboard
        { name: 'Configurar Muestra', id: 2, icon: 'fa-filter' }, // El proceso de filtrado estadístico
        { name: 'Resultados (PT)', id: 3, icon: 'fa-file-signature' }, // Papel de trabajo final
    ];

    const getViewIndex = (view: AppView) => {
        if (view === 'dashboard') return 1;
        if (view === 'sampling_config') return 2;
        if (view === 'results') return 3;
        return 0; // Default / Validation
    };

    const currentIndex = getViewIndex(currentView);

    return (
        <div className="w-full max-w-6xl mx-auto py-8 px-4">
            <div className="flex items-start justify-between relative isolate">
                
                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isPending = index > currentIndex;
                    const isLast = index === steps.length - 1;

                    // --- Configuración de Estilos ---
                    let colorClass = '';
                    let iconBgClass = '';
                    let iconColorClass = '';
                    let badgeClass = '';
                    let statusText = '';
                    let cardBorderClass = '';

                    if (isCompleted) {
                        colorClass = 'text-emerald-700';
                        iconBgClass = 'bg-white border-4 border-emerald-500 shadow-emerald-200';
                        iconColorClass = 'text-emerald-500';
                        badgeClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                        statusText = 'COMPLETADO';
                        cardBorderClass = 'border-b-emerald-500';
                    } else if (isCurrent) {
                        colorClass = 'text-amber-700';
                        iconBgClass = 'bg-white border-4 border-amber-400 shadow-amber-200 ring-4 ring-amber-50';
                        iconColorClass = 'text-amber-500';
                        badgeClass = 'bg-amber-50 border-amber-200 text-amber-700';
                        statusText = 'EN PROCESO';
                        cardBorderClass = 'border-b-amber-400';
                    } else {
                        // Estilo "Nano Banana" Rojo Estilizado para pendientes
                        colorClass = 'text-slate-400';
                        iconBgClass = 'bg-white border-4 border-rose-100'; 
                        iconColorClass = 'text-rose-200';
                        badgeClass = 'bg-slate-50 border-slate-200 text-slate-400';
                        statusText = 'NO INICIADO';
                        cardBorderClass = 'border-b-rose-200';
                    }

                    return (
                        <div key={step.id} className="relative flex-1 flex flex-col items-center group">
                            
                            {/* --- LÍNEAS DE CONEXIÓN (CONNECTORS) --- */}
                            {!isLast && (
                                <div className="hidden md:block absolute top-8 left-1/2 w-full h-1 z-0"> 
                                    {/* NOTA: z-0 asegura que se vea, pero los iconos tienen z-10 para taparla en los extremos */}
                                    
                                    {/* Contenedor de la línea para centrar verticalmente con el icono */}
                                    <div className="relative w-full h-full flex items-center">
                                        {/* Línea Base */}
                                        <div className={`
                                            w-full h-[4px] transform transition-all duration-500
                                            ${isCompleted 
                                                ? 'bg-emerald-400' // Línea Verde sólida
                                                : isCurrent 
                                                    ? 'bg-gradient-to-r from-amber-400 to-rose-200' // Degradado
                                                    : 'h-0 border-t-[4px] border-dotted border-rose-300' // Punteada Roja más visible
                                            }
                                        `}></div>
                                        
                                        {/* Flecha indicadora en el medio de la línea */}
                                        <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 z-10 bg-gray-100 rounded-full p-1
                                            ${isCompleted ? 'text-emerald-400' : isCurrent ? 'text-rose-300' : 'text-rose-300'}
                                        `}>
                                            <i className="fas fa-chevron-right text-xs"></i>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- ICONO CIRCULAR --- */}
                            <div className={`
                                w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500 z-10 relative
                                ${iconBgClass} shadow-lg
                                ${isCurrent ? 'scale-110' : 'scale-100'}
                            `}>
                                {isCompleted ? (
                                     <i className="fas fa-check text-2xl text-emerald-500 animate-fade-in-up"></i>
                                ) : (
                                     <i className={`fas ${step.icon} text-2xl ${iconColorClass}`}></i>
                                )}
                            </div>

                            {/* --- TARJETA DE TEXTO --- */}
                            <div className={`
                                relative bg-white rounded-xl p-3 w-[90%] md:w-[85%] flex flex-col items-center 
                                border border-gray-100 shadow-sm transition-all duration-300 z-10
                                ${isCurrent ? 'transform -translate-y-1 shadow-md ring-1 ring-amber-100' : 'hover:shadow-md'}
                            `}>
                                <h3 className={`text-xs font-bold uppercase tracking-wide text-center mb-2 ${colorClass}`}>
                                    {step.name}
                                </h3>

                                <span className={`
                                    px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider
                                    ${badgeClass}
                                `}>
                                    {statusText}
                                </span>
                                
                                {/* Borde inferior de color */}
                                <div className={`absolute bottom-0 left-4 right-4 h-[3px] rounded-t-sm ${cardBorderClass}`}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Stepper;
