
import React, { useState, useEffect } from 'react';
import { AppState, SamplingMethod, Step, AuditObservation } from '../../types';
import AttributeSampling from '../samplingMethods/AttributeSampling';
import MonetaryUnitSampling from '../samplingMethods/MonetaryUnitSampling';
import ClassicalVariablesSampling from '../samplingMethods/ClassicalVariablesSampling';
import NonStatisticalSampling from '../samplingMethods/NonStatisticalSampling';
import StratifiedSampling from '../samplingMethods/StratifiedSampling';
import ObservationsManager from '../sampling/ObservationsManager';
import { calculateSampleSize } from '../../services/statisticalService';
import { supabase } from '../../services/supabaseClient';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    setCurrentStep: (step: Step) => void;
}

const Step3SamplingMethod: React.FC<Props> = ({ appState, setAppState, setCurrentStep }) => {
    const [loading, setLoading] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'config' | 'observations'>('config');
    const [dataStatus, setDataStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error' | 'empty', count: number }>({ status: 'idle', count: 0 });

    useEffect(() => {
        const checkDataAvailability = async () => {
            if (!appState.selectedPopulation) return;

            setDataStatus(prev => ({ ...prev, status: 'loading' }));
            try {
                const { count, error } = await supabase
                    .from('audit_data_rows')
                    .select('*', { count: 'exact', head: true })
                    .eq('population_id', appState.selectedPopulation.id);

                if (error) {
                    setDataStatus({ status: 'error', count: 0 });
                } else {
                    const finalCount = count || 0;
                    setDataStatus({ status: finalCount > 0 ? 'success' : 'empty', count: finalCount });
                }
            } catch (e) {
                setDataStatus({ status: 'error', count: 0 });
            }
        };

        checkDataAvailability();
    }, [appState.selectedPopulation]);

    const handleMethodChange = (method: SamplingMethod) => {
        setAppState(prev => ({ ...prev, samplingMethod: method }));
    };

    const handleRunSampling = async () => {
        setLoading(true);
        try {
            let realRows: any[] = [];
            
            if (appState.selectedPopulation) {
                const { data, error } = await supabase
                    .from('audit_data_rows')
                    .select('unique_id_col, monetary_value_col, raw_json')
                    .eq('population_id', appState.selectedPopulation.id)
                    .limit(10000); 
                
                if (error || !data || data.length === 0) {
                    alert("ERROR CRÍTICO: No se encontraron registros asociados.");
                    setLoading(false);
                    return;
                }
                realRows = data;
            }

            const results = calculateSampleSize(appState, realRows);
            // Adjuntar observaciones actuales a los resultados para el reporte
            results.observations = appState.observations;
            
            setAppState(prev => ({...prev, results}));
            setCurrentStep(Step.Results);
        } catch (error) {
            alert("Ocurrió un error inesperado calculando la muestra.");
        } finally {
            setLoading(false);
        }
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
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Selección del Método de Muestreo</h2>
                    <p className="text-slate-500 text-sm">Configure los parámetros técnicos o registre observaciones cualitativas de la población.</p>
                </div>
                <div className="mt-1">
                    {dataStatus.status === 'success' && (
                        <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 uppercase tracking-widest flex items-center shadow-sm">
                            <i className="fas fa-database mr-2"></i> {dataStatus.count.toLocaleString()} Registros Reales
                        </span>
                    )}
                </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                {/* Tabs de Métodos */}
                <div className="border-b border-slate-100 bg-slate-50/50">
                    <nav className="flex overflow-x-auto" aria-label="Tabs">
                        {tabs.map(tab => {
                             const isActive = appState.samplingMethod === tab.id;
                             return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleMethodChange(tab.id)}
                                    className={`${
                                        isActive
                                            ? 'border-blue-600 text-blue-700 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.03)]'
                                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    } whitespace-nowrap py-5 px-6 border-b-2 font-black text-[10px] uppercase tracking-[0.15em] flex items-center transition-all flex-1 justify-center`}
                                >
                                    <i className={`fas ${tab.icon} mr-3 ${isActive ? 'text-blue-600' : 'text-slate-300'}`}></i>
                                    {tab.label}
                                </button>
                             );
                        })}
                    </nav>
                </div>

                {/* Sub-Tabs: Configuración vs Observaciones */}
                <div className="flex bg-slate-100/50 p-2 border-b border-slate-100">
                    <button 
                        onClick={() => setActiveSubTab('config')}
                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'config' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <i className="fas fa-cog mr-2"></i> Configuración Técnica
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('observations')}
                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'observations' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <i className="fas fa-clipboard-list mr-2"></i> Observaciones ({(appState.observations || []).length})
                    </button>
                </div>

                <div className="p-8">
                    {activeSubTab === 'config' ? (
                        <>
                            {appState.samplingMethod === SamplingMethod.Attribute && <AttributeSampling appState={appState} setAppState={setAppState} />}
                            {appState.samplingMethod === SamplingMethod.MUS && <MonetaryUnitSampling appState={appState} setAppState={setAppState} />}
                            {appState.samplingMethod === SamplingMethod.Stratified && <StratifiedSampling appState={appState} setAppState={setAppState} />}
                            {appState.samplingMethod === SamplingMethod.CAV && <ClassicalVariablesSampling appState={appState} setAppState={setAppState} />}
                            {appState.samplingMethod === SamplingMethod.NonStatistical && <NonStatisticalSampling appState={appState} setAppState={setAppState} />}
                        </>
                    ) : (
                        <ObservationsManager 
                            populationId={appState.selectedPopulation!.id} 
                            method={appState.samplingMethod}
                            onObservationsUpdate={(obs) => setAppState(prev => ({...prev, observations: obs}))}
                        />
                    )}
                </div>

                 <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <button 
                        onClick={() => setCurrentStep(Step.GeneralParams)} 
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-all shadow-sm"
                    >
                        <i className="fas fa-chevron-left mr-3"></i> Atrás
                    </button>
                    <button 
                        onClick={handleRunSampling} 
                        disabled={loading || dataStatus.status !== 'success'}
                        className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all transform hover:-translate-y-1 disabled:opacity-50"
                    >
                        {loading ? <i className="fas fa-circle-notch fa-spin mr-3"></i> : <i className="fas fa-calculator mr-3 text-cyan-400"></i>}
                        Calcular Muestra Definitiva
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step3SamplingMethod;
