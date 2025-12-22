
import React from 'react';
import { AppState } from '../../types';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT } from '../../constants';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const ClassicalVariablesSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.cav;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number | boolean = value;
        if (type === 'checkbox') {
             processedValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
             processedValue = Number(value);
        }

        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                cav: {
                    ...prev.samplingParams.cav,
                    [name]: processedValue
                }
            }
        }));
    };

    const togglePilot = () => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                cav: { ...prev.samplingParams.cav, usePilotSample: !prev.samplingParams.cav.usePilotSample }
            }
        }));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Banner Premium: Calibración Científica */}
            <div className="relative group overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
                <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-orange-100/50 to-transparent pointer-events-none"></div>
                <div className="absolute left-0 top-0 h-full w-1.5 bg-orange-500"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-orange-200 flex items-center justify-center text-orange-600">
                            <i className="fas fa-flask text-2xl"></i>
                        </div>
                        <div>
                            <h4 className="text-orange-900 font-black text-lg tracking-tight flex items-center">
                                Calibración Científica
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-200 uppercase">Cálculo de Sigma</span>
                            </h4>
                            <p className="text-sm text-orange-700/80 font-medium">Calcule la variabilidad real (σ) mediante una muestra representativa previa.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white shadow-inner">
                        <span className={`text-xs font-black uppercase tracking-widest ${params.usePilotSample ? 'text-orange-600' : 'text-slate-400'}`}>
                            Activar Piloto (n=50)
                        </span>
                        <button 
                            onClick={togglePilot}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${params.usePilotSample ? 'bg-orange-500 ring-orange-500' : 'bg-slate-300 ring-slate-200'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${params.usePilotSample ? 'translate-x-8' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                {/* Desviación Estándar Input */}
                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <label htmlFor="sigma" className="flex items-center text-sm font-bold text-gray-700 mb-4">
                        Desviación Estándar Esperada (σ)
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.desviacionEstandar.title} content={ASSISTANT_CONTENT.desviacionEstandar.content} /></span>
                    </label>
                    
                    <div className="relative">
                        <input 
                            type="number" 
                            name="sigma" 
                            id="sigma" 
                            value={params.usePilotSample ? '' : params.sigma} 
                            onChange={handleChange} 
                            disabled={params.usePilotSample}
                            className={`block w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-orange-500 transition-all ${params.usePilotSample ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`}
                            placeholder={params.usePilotSample ? "Calculado por Piloto..." : "Ej. 1500.00"}
                        />
                    </div>
                </div>

                 {/* Técnica de Estimación */}
                 <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <label htmlFor="estimationTechnique" className="flex items-center text-sm font-bold text-gray-700 mb-4">
                        Técnica de Estimación
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.tecnicaEstimacion.title} content={ASSISTANT_CONTENT.tecnicaEstimacion.content} /></span>
                    </label>
                    <select 
                        id="estimationTechnique" 
                        name="estimationTechnique" 
                        value={params.estimationTechnique} 
                        onChange={handleChange} 
                        className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm rounded-lg"
                    >
                        <option value="Media">Media por Unidad (Mean-per-Unit)</option>
                        <option value="Diferencia">Diferencia (Difference)</option>
                        <option value="Tasa Combinada">Razón / Tasa (Ratio)</option>
                        <option value="Regresión Separada">Regresión</option>
                    </select>
                </div>

                {/* Estratificación */}
                <div className="md:col-span-2">
                    <div className={`p-4 rounded-xl border transition-all ${params.stratification ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center">
                            <input 
                                id="stratification" 
                                name="stratification" 
                                type="checkbox" 
                                checked={params.stratification} 
                                onChange={handleChange} 
                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                            />
                            <div className="ml-3">
                                <label htmlFor="stratification" className="font-bold text-gray-800 flex items-center cursor-pointer">
                                   Estratificación de Población
                                   <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.estratificacion.title} content={ASSISTANT_CONTENT.estratificacion.content} /></span>
                                </label>
                                <p className="text-xs text-gray-500">Altamente recomendado para CAV para optimizar eficiencia.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassicalVariablesSampling;
