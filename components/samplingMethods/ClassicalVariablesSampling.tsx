
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-orange-50 to-white p-6 rounded-xl border border-orange-100 shadow-sm flex items-start mb-6">
                 <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg text-white mr-5 shadow-md">
                    <i className="fas fa-calculator text-2xl"></i>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Variables Clásicas (CAV)</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        Este método utiliza la distribución normal para estimar el valor total auditado. Ideal cuando se esperan errores de subestimación o valores negativos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                {/* Desviación Estándar con Opción Piloto */}
                <div className="relative p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <label htmlFor="sigma" className="flex items-center text-sm font-bold text-gray-700">
                            Desviación Estándar Esperada (σ)
                            <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.desviacionEstandar.title} content={ASSISTANT_CONTENT.desviacionEstandar.content} /></span>
                        </label>
                        <div className="flex items-center">
                            <input 
                                id="usePilotSample" 
                                name="usePilotSample" 
                                type="checkbox" 
                                checked={params.usePilotSample} 
                                onChange={handleChange} 
                                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500" 
                            />
                            <label htmlFor="usePilotSample" className="ml-2 text-xs font-bold text-orange-700 cursor-pointer select-none flex items-center">
                                Calcular con Piloto
                                <span className="ml-1"><InfoHelper title={ASSISTANT_CONTENT.muestraPiloto.title} content={ASSISTANT_CONTENT.muestraPiloto.content} /></span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <input 
                            type="number" 
                            name="sigma" 
                            id="sigma" 
                            value={params.usePilotSample ? '' : params.sigma} 
                            onChange={handleChange} 
                            disabled={params.usePilotSample}
                            className={`block w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all ${params.usePilotSample ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`}
                            placeholder={params.usePilotSample ? "Cálculo Automático..." : "Ej. 1500.00"}
                        />
                        {params.usePilotSample && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded">AUTO</span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {params.usePilotSample 
                            ? "El sistema tomará 50 ítems aleatorios para estimar σ." 
                            : "Ingrese un valor basado en auditorías previas."}
                    </p>
                </div>

                 {/* Técnica de Estimación */}
                 <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <label htmlFor="estimationTechnique" className="flex items-center text-sm font-bold text-gray-700 mb-4">
                        Técnica de Estimación
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.tecnicaEstimacion.title} content={ASSISTANT_CONTENT.tecnicaEstimacion.content} /></span>
                    </label>
                    <div className="relative">
                        <select 
                            id="estimationTechnique" 
                            name="estimationTechnique" 
                            value={params.estimationTechnique} 
                            onChange={handleChange} 
                            className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-lg"
                        >
                            <option value="Media">Media por Unidad (Mean-per-Unit)</option>
                            <option value="Diferencia">Diferencia (Difference)</option>
                            <option value="Tasa Combinada">Razón / Tasa (Ratio)</option>
                            <option value="Regresión Separada">Regresión</option>
                        </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 italic">
                        {params.estimationTechnique === 'Media' && "Recomendado si no se esperan errores."}
                        {params.estimationTechnique === 'Diferencia' && "Eficiente si los errores son constantes."}
                        {params.estimationTechnique === 'Tasa Combinada' && "Mejor opción si el error es proporcional al valor."}
                        {params.estimationTechnique === 'Regresión Separada' && "Para relaciones lineales complejas."}
                    </p>
                </div>

                {/* Estratificación Obligatoria */}
                <div className="md:col-span-2">
                    <div className={`p-4 rounded-lg border transition-all ${params.stratification ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-start">
                            <div className="flex items-center h-5 mt-1">
                                <input 
                                    id="stratification" 
                                    name="stratification" 
                                    type="checkbox" 
                                    checked={params.stratification} 
                                    onChange={handleChange} 
                                    className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded" 
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="stratification" className="font-bold text-gray-800 flex items-center cursor-pointer">
                                   Estratificación Obligatoria
                                   <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.estratificacion.title} content={ASSISTANT_CONTENT.estratificacion.content} /></span>
                                </label>
                                <p className={`mt-1 transition-colors ${params.stratification ? 'text-blue-800 font-medium' : 'text-gray-500'}`}>
                                    {params.stratification 
                                        ? "Activada: El sistema dividirá la población para reducir la varianza y optimizar el tamaño de muestra." 
                                        : "Desactivada: Se tratará la población como un grupo homogéneo (No recomendado para CAV salvo datos muy uniformes)."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassicalVariablesSampling;
