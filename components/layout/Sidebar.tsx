
import React from 'react';
import { Step } from '../../types';

interface SidebarProps {
    currentStep: Step;
    setCurrentStep: (step: Step) => void;
    isConnectionValid: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentStep, setCurrentStep, isConnectionValid }) => {
    
    const steps = [
        { id: Step.Connection, label: '1. Conexión de Datos', icon: 'fa-database' },
        { id: Step.GeneralParams, label: '2. Parámetros Generales', icon: 'fa-sliders' },
        { id: Step.SamplingMethod, label: '3. Método de Muestreo', icon: 'fa-cogs' },
        { id: Step.Results, label: '4. Resultados y Artefactos', icon: 'fa-chart-pie' },
    ];

    const getStepClass = (stepId: Step) => {
        const isActive = currentStep === stepId;
        const isDisabled = !isConnectionValid && stepId !== Step.Connection;
        
        let classes = 'flex items-center px-4 py-3 text-sm font-medium rounded-lg ';
        if (isDisabled) {
            classes += 'text-gray-400 cursor-not-allowed';
        } else if (isActive) {
            classes += 'bg-blue-100 text-blue-700';
        } else {
            classes += 'text-gray-600 hover:bg-gray-200 hover:text-gray-900';
        }
        return classes;
    };
    
    const handleStepClick = (stepId: Step) => {
       const isDisabled = !isConnectionValid && stepId !== Step.Connection;
       if (!isDisabled) {
           setCurrentStep(stepId);
       }
    };

    return (
        <aside className="w-64 bg-white flex-shrink-0 border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center justify-center border-b border-gray-200">
                <div className="flex items-center">
                    <i className="fas fa-tasks text-2xl text-blue-600"></i>
                    <span className="ml-3 text-lg font-semibold text-gray-700">Flujo de Auditoría</span>
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {steps.map(step => (
                    <button key={step.id} onClick={() => handleStepClick(step.id)} className={getStepClass(step.id) + ' w-full text-left'}>
                        <i className={`fas ${step.icon} w-6 h-6 mr-3`}></i>
                        <span>{step.label}</span>
                    </button>
                ))}
            </nav>
            <div className="px-4 py-4 border-t border-gray-200 text-xs text-gray-400">
                <p>&copy; 2024 AAMA v3.0</p>
                <p>Conformidad NIA 530 / MIPP</p>
            </div>
        </aside>
    );
};

export default Sidebar;
