
import React from 'react';
import { AppState, AdvancedAnalysis } from '../../types';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT, WarningIcon } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const NonStatisticalSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.nonStatistical;
    const analysis = appState.selectedPopulation?.advanced_analysis;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                nonStatistical: {
                    ...prev.samplingParams.nonStatistical,
                    [name]: value
                }
            }
        }));
    };
    
    const handleInsightClick = (type: 'Benford' | 'Outliers' | 'Duplicates' | 'RoundNumbers' | 'CombinedRisk') => {
        let text = "";
        let just = "";

        if (type === 'Benford') {
            text = "Selección dirigida a transacciones con primeros dígitos anómalos según la Ley de Benford (posible manipulación humana).";
            just = "El análisis de datos identificó una desviación estadística en la frecuencia de los dígitos.";
        }
        if (type === 'Outliers') {
            text = `Selección enfocada en ${analysis?.outliersCount} valores atípicos que exceden el rango intercuartílico (riesgo de errores significativos).`;
            just = "Transacciones fuera de la distribución normal (IQR) representan mayor riesgo inherente.";
        }
        if (type === 'Duplicates') {
            text = "Investigación de posibles pagos o registros duplicados.";
            just = "Riesgo de pago doble o error operativo en el registro.";
        }
        if (type === 'RoundNumbers') {
            text = `Revisión de ${analysis?.roundNumbersCount} importes con terminación exacta en '000' o '00'.`;
            just = "Importes excesivamente redondos pueden indicar estimaciones no autorizadas o transacciones ficticias.";
        }
        if (type === 'CombinedRisk') {
            text = "Muestreo Inteligente Multivariable: Selección de ítems que presentan simultáneamente múltiples factores de riesgo (Score Combinado > 2).";
            just = "Enfoque basado en riesgo acumulado: Se priorizan partidas que son a la vez atípicas, redondas y/o duplicadas, maximizando la efectividad de la muestra.";
        }

        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                nonStatistical: {
                    criteria: text,
                    justification: just,
                    suggestedRisk: type
                }
            }
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg">
                <h3 className="text-teal-800 font-bold flex items-center">
                    <i className="fas fa-brain mr-2"></i> Data Driven Insights
                </h3>
                <p className="text-sm text-teal-700 mt-1">
                    El sistema ha analizado la población. Seleccione un enfoque para cargar automáticamente los criterios basados en riesgos detectados.
                </p>
            </div>

            {analysis && (
                <div className="space-y-6">
                    {/* Primary Grid: Individual Risks */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Benford Card */}
                        <div 
                            onClick={() => handleInsightClick('Benford')}
                            className={`cursor-pointer border rounded-xl p-4 transition-all hover:shadow-lg ${params.suggestedRisk === 'Benford' ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-gray-200 bg-white hover:border-teal-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">Ley de Benford</h4>
                                <i className="fas fa-chart-bar text-teal-500"></i>
                            </div>
                            <div className="h-16 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.benford}>
                                        <XAxis dataKey="digit" hide />
                                        <Tooltip />
                                        <Bar dataKey="actualFreq">
                                            {analysis.benford.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.isSuspicious ? '#ef4444' : '#cbd5e1'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-center uppercase font-bold">
                                {analysis.benford.some(b => b.isSuspicious) ? <span className="text-red-500">Anomalías</span> : "Normal"}
                            </p>
                        </div>

                        {/* Outliers Card */}
                        <div 
                            onClick={() => handleInsightClick('Outliers')}
                            className={`cursor-pointer border rounded-xl p-4 transition-all hover:shadow-lg ${params.suggestedRisk === 'Outliers' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200 bg-white hover:border-purple-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">Valores Atípicos</h4>
                                <i className="fas fa-expand-arrows-alt text-purple-500"></i>
                            </div>
                            <div className="text-center py-2">
                                <span className="text-3xl font-extrabold text-purple-600">{analysis.outliersCount}</span>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Registros > IQR</p>
                            </div>
                        </div>

                        {/* Duplicates Card */}
                        <div 
                            onClick={() => handleInsightClick('Duplicates')}
                            className={`cursor-pointer border rounded-xl p-4 transition-all hover:shadow-lg ${params.suggestedRisk === 'Duplicates' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-white hover:border-orange-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">Duplicados</h4>
                                <i className="fas fa-copy text-orange-500"></i>
                            </div>
                            <div className="text-center py-2">
                                <span className="text-3xl font-extrabold text-orange-600">{analysis.duplicatesCount}</span>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Valores Repetidos</p>
                            </div>
                        </div>

                        {/* Round Numbers Card (NEW) */}
                        <div 
                            onClick={() => handleInsightClick('RoundNumbers')}
                            className={`cursor-pointer border rounded-xl p-4 transition-all hover:shadow-lg ${params.suggestedRisk === 'RoundNumbers' ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200' : 'border-gray-200 bg-white hover:border-cyan-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">Números Redondos</h4>
                                <i className="fas fa-coins text-cyan-500"></i>
                            </div>
                            <div className="text-center py-2">
                                <span className="text-3xl font-extrabold text-cyan-600">{analysis.roundNumbersCount}</span>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Terminan en '00'</p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary: Combined Risk Strategy */}
                    <div 
                        onClick={() => handleInsightClick('CombinedRisk')}
                        className={`cursor-pointer relative overflow-hidden border-2 rounded-xl p-6 transition-all hover:shadow-xl transform hover:-translate-y-1 ${params.suggestedRisk === 'CombinedRisk' ? 'border-rose-500 bg-gradient-to-r from-rose-50 to-white ring-2 ring-rose-200' : 'border-slate-300 bg-white hover:border-rose-400'}`}
                    >
                        {params.suggestedRisk === 'CombinedRisk' && (
                            <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                                Estrategia Activa
                            </div>
                        )}
                        <div className="flex items-center">
                            <div className="p-4 bg-rose-100 text-rose-600 rounded-full mr-5 shadow-sm border border-rose-200">
                                <i className="fas fa-biohazard text-3xl"></i>
                            </div>
                            <div>
                                <h4 className="text-lg font-extrabold text-slate-800">
                                    Risk Scoring (Muestreo Inteligente)
                                </h4>
                                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                                    Combina todos los factores anteriores para calcular un <strong>Puntaje de Riesgo</strong> por transacción. Selecciona automáticamente los ítems con mayor coincidencia de alertas (ej. Outlier + Redondo + Duplicado).
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">Recomendado por Firmas Globales</span>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">Enfoque Basado en Riesgo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                    <label htmlFor="criteria" className="flex items-center text-sm font-medium text-gray-700">
                        <span>Criterio de Selección</span>
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.criterioJuicio.title} content={ASSISTANT_CONTENT.criterioJuicio.content} /></span>
                    </label>
                    <textarea
                        id="criteria"
                        name="criteria"
                        rows={3}
                        value={params.criteria}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describa qué elementos específicos seleccionará..."
                    />
                </div>
                <div>
                    <label htmlFor="justification" className="flex items-center text-sm font-medium text-gray-700">
                        <span>Justificación del Muestreo (Requerido)</span>
                    </label>
                    <textarea
                        id="justification"
                        name="justification"
                        rows={3}
                        value={params.justification}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Explique por qué este criterio es relevante para el objetivo de auditoría..."
                    />
                </div>
            </div>
        </div>
    );
};

export default NonStatisticalSampling;
