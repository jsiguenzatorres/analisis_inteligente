
import React from 'react';
import { AppState, Step } from '../../types';
import Card from '../ui/Card';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT } from '../../constants';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    setCurrentStep: (step: Step) => void;
}

const Step2GeneralParams: React.FC<Props> = ({ appState, setAppState, setCurrentStep }) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppState(prev => ({
            ...prev,
            generalParams: {
                ...prev.generalParams,
                [name]: name === 'seed' ? Number(value) : value,
            }
        }));
    };
    
    const handleNext = () => {
        setCurrentStep(Step.SamplingMethod);
    };

    const handleBack = () => {
        setCurrentStep(Step.Connection);
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Parámetros Generales de la Auditoría</h2>
            <p className="text-gray-600 mb-6">Defina los parámetros generales que guiarán el proceso de muestreo, asegurando la estandarización del flujo de trabajo.</p>
            
            <Card>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Objetivo Específico del Muestreo</label>
                        <textarea name="objective" value={appState.generalParams.objective} onChange={handleChange} rows={3} className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Ej. Verificar la validez de las transacciones de venta superiores a $1,000 (prueba sustantiva)." />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="standard" className="block text-sm font-bold text-gray-700 mb-1">Estándar de Referencia</label>
                            <div className="relative">
                                <select id="standard" name="standard" value={appState.generalParams.standard} onChange={handleChange} className="block w-full pl-4 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg shadow-sm appearance-none bg-white">
                                    <option>NIA 530</option>
                                    <option>MIPP</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="template" className="block text-sm font-bold text-gray-700 mb-1">Plantilla de Documentación</label>
                            <div className="relative">
                                <select id="template" name="template" value={appState.generalParams.template} onChange={handleGeneralChange => handleChange(handleGeneralChange)} className="block w-full pl-4 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg shadow-sm appearance-none bg-white">
                                    <option>NIA 530 Detalle</option>
                                    <option>MIPP Hallazgos y Remediación</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                        </div>
                        <div>
                           <label htmlFor="seed" className="flex items-center text-sm font-bold text-gray-700 mb-1">
                               <span>Mecanismo de Semilla (Seed)</span>
                               <span className="ml-2">
                                   <InfoHelper 
                                       title={ASSISTANT_CONTENT.semilla.title} 
                                       content={ASSISTANT_CONTENT.semilla.content} 
                                       currentValue={appState.generalParams.seed}
                                   />
                               </span>
                           </label>
                           <input type="number" id="seed" name="seed" value={appState.generalParams.seed} onChange={handleChange} className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-between pt-6 border-t border-gray-100">
                    <button 
                        onClick={handleBack} 
                        className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-all hover:text-slate-800 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        Atrás
                    </button>
                    <button 
                        onClick={handleNext} 
                        className="px-8 py-3 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Siguiente <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default Step2GeneralParams;
