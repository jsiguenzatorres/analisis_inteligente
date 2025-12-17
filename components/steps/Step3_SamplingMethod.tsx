
import React from 'react';
import { AppState, SamplingMethod, Step } from '../../types';
import AttributeSampling from '../samplingMethods/AttributeSampling';
import MonetaryUnitSampling from '../samplingMethods/MonetaryUnitSampling';
import ClassicalVariablesSampling from '../samplingMethods/ClassicalVariablesSampling';
import NonStatisticalSampling from '../samplingMethods/NonStatisticalSampling';
import StratifiedSampling from '../samplingMethods/StratifiedSampling';
import { calculateSampleSize } from '../../services/statisticalService';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    setCurrentStep: (step: Step) => void;
}

const Step3SamplingMethod: React.FC<Props> = ({ appState, setAppState, setCurrentStep }) => {

    const handleMethodChange = (method: SamplingMethod) => {
        setAppState(prev => ({ ...prev, samplingMethod: method }));
    };

    const handleRunSampling = () => {
        const results = calculateSampleSize(appState);
        setAppState(prev => ({...prev, results}));
        setCurrentStep(Step.Results);
    };
    
    const handleBack = () => {
        setCurrentStep(Step.GeneralParams);
    };

    const tabs = [
        { id: SamplingMethod.Attribute, label: 'Atributos', icon: 'fa-check-circle' },
        { id: SamplingMethod.MUS, label: 'MUS', icon: 'fa-dollar-sign' },
        { id: SamplingMethod.Stratified, label: 'Estratificado', icon: 'fa-layer-group' },
        { id: SamplingMethod.CAV, label: 'Variables (CAV)', icon: 'fa-calculator' },
        { id: SamplingMethod.NonStatistical, label: 'No Estadístico', icon: 'fa-user-check' },
    ];

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Selección del Método de Muestreo</h2>
            <p className="text-gray-600 mb-6">Elija el método de muestreo que mejor se adapte al objetivo de su prueba de auditoría e ingrese los parámetros requeridos.</p>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50/50">
                    <nav className="-mb-px flex space-x-0 overflow-x-auto" aria-label="Tabs">
                        {tabs.map(tab => {
                             const isActive = appState.samplingMethod === tab.id;
                             return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleMethodChange(tab.id)}
                                    className={`${
                                        isActive
                                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                    } whitespace-nowrap py-4 px-6 border-b-2 font-bold text-sm flex items-center transition-colors flex-1 justify-center`}
                                >
                                    <i className={`fas ${tab.icon} mr-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}></i>
                                    {tab.label}
                                </button>
                             );
                        })}
                    </nav>
                </div>
                <div className="p-8">
                    {appState.samplingMethod === SamplingMethod.Attribute && <AttributeSampling appState={appState} setAppState={setAppState} />}
                    {appState.samplingMethod === SamplingMethod.MUS && <MonetaryUnitSampling appState={appState} setAppState={setAppState} />}
                    {appState.samplingMethod === SamplingMethod.Stratified && <StratifiedSampling appState={appState} setAppState={setAppState} />}
                    {appState.samplingMethod === SamplingMethod.CAV && <ClassicalVariablesSampling appState={appState} setAppState={setAppState} />}
                    {appState.samplingMethod === SamplingMethod.NonStatistical && <NonStatisticalSampling appState={appState} setAppState={setAppState} />}
                </div>

                 <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                    <button 
                        onClick={handleBack} 
                        className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-all hover:text-slate-800 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        Atrás
                    </button>
                    <button 
                        onClick={handleRunSampling} 
                        className="inline-flex items-center px-8 py-3 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                        <i className="fas fa-play mr-2"></i>
                        Calcular Muestra
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step3SamplingMethod;
