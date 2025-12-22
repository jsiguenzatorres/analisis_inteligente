
import React, { useState, useMemo } from 'react';
import { AppState, AdvancedAnalysis } from '../../types';
import Modal from '../ui/Modal';
import { 
    BarChart, Bar, ResponsiveContainer, Cell 
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { utils, writeFile } from 'xlsx';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

type InsightType = 'Benford' | 'Outliers' | 'Duplicates' | 'RoundNumbers' | 'RiskScoring';

const NonStatisticalSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.nonStatistical;
    const analysis = appState.selectedPopulation?.advanced_analysis;
    
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailType, setDetailType] = useState<string | null>(null);
    const [detailItems, setDetailItems] = useState<any[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [selectedInsight, setSelectedInsight] = useState<InsightType | null>(null);

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getBenfordAnomalyCount = () => {
        if (!analysis?.benford) return 0;
        return analysis.benford
            .filter(b => b.isSuspicious)
            .reduce((acc, curr) => acc + curr.actualCount, 0);
    };

    const handleInsightSelection = (type: InsightType) => {
        setSelectedInsight(type);
        let criteria = "";
        let justification = "";

        switch (type) {
            case 'RiskScoring':
                criteria = "Muestreo Inteligente Multivariable: Selección de ítems que presentan simultáneamente múltiples factores de riesgo (Score Combinado > 2).";
                justification = "Enfoque basado en riesgo acumulado: Se priorizan partidas que son a la vez atípicas, redondas y/o duplicadas, maximizando la efectividad de la muestra.";
                break;
            case 'Benford':
                criteria = "Selección intencional de registros con primer dígito anómalo según la distribución de la Ley de Benford.";
                justification = "Se identificaron desviaciones significativas en la frecuencia de dígitos iniciales, lo que sugiere una posible manipulación de montos o falta de aleatoriedad natural en el registro de transacciones.";
                break;
            case 'Outliers':
                criteria = "Muestreo dirigido a los elementos que exceden los límites del Rango Intercuartílico (IQR) calculados sobre la población.";
                justification = "Los valores atípicos representan transacciones con un impacto material desproporcionado o posibles errores de registro, siendo críticos para la formación de la opinión de auditoría.";
                break;
            case 'Duplicates':
                criteria = "Investigación detallada de transacciones con montos y características idénticas (Posibles Duplicados).";
                justification = "La presencia de duplicados en la base de datos es un indicador de debilidades en los controles de ingreso o procesos de pago duplicados que podrían derivar en egresos indebidos.";
                break;
            case 'RoundNumbers':
                criteria = "Selección de partidas con importes redondos (múltiplos de 100 o 1000) para validación de soporte documental.";
                justification = "Los números redondos suelen asociarse a estimaciones contables sin soporte técnico suficiente o transacciones manuales que requieren un escrutinio sustantivo superior.";
                break;
        }

        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                nonStatistical: {
                    ...prev.samplingParams.nonStatistical,
                    criteria: criteria,
                    justification: justification
                }
            }
        }));
    };

    const handleShowDetails = async (e: React.MouseEvent, type: string) => {
        e.stopPropagation(); // Evitar que el clic en el icono cambie el texto de los textareas
        if (!appState.selectedPopulation) return;

        setDetailType(type);
        setDetailModalOpen(true);
        setIsLoadingDetails(true);
        setDetailItems([]);

        try {
            const { data: rows, error } = await supabase
                .from('audit_data_rows')
                .select('unique_id_col, monetary_value_col')
                .eq('population_id', appState.selectedPopulation.id)
                .limit(100); 

            if (error) throw error;
            setDetailItems((rows || []).map(r => ({ id: r.unique_id_col, value: r.monetary_value_col })));
        } catch (err) {
            console.error("Error fetching details:", err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ENCABEZADO DE SECCIÓN */}
            <div className="border-b border-slate-100 pb-2">
                <h3 className="text-slate-700 font-bold text-sm tracking-tight">Parámetros Específicos: Muestreo No Estadístico / de Juicio</h3>
            </div>

            {/* DATA DRIVEN INSIGHTS ALERT */}
            <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg flex items-center shadow-sm">
                <i className="fas fa-microscope text-teal-600 mr-4 text-xl"></i>
                <div>
                    <h4 className="text-teal-900 font-black text-[11px] uppercase tracking-wider">Data Driven Insights</h4>
                    <p className="text-[11px] text-teal-700 font-medium">
                        El sistema ha analizado la población. Seleccione un enfoque para cargar automáticamente los criterios basados en riesgos detectados.
                    </p>
                </div>
            </div>

            {/* CARDS DE RIESGO (Dashboard Forense) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Ley de Benford */}
                <div 
                    onClick={() => handleInsightSelection('Benford')}
                    className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group ${selectedInsight === 'Benford' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}
                >
                    <div className="flex justify-between items-center mb-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ley de Benford</h5>
                        <button onClick={(e) => handleShowDetails(e, 'Benford')} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                            <i className="fas fa-list-ul"></i>
                        </button>
                    </div>
                    <div className="flex justify-between items-end h-16">
                        <div className="flex-1 h-12 flex items-end gap-1 px-1">
                            {[40, 60, 20, 15, 10, 8, 7, 5, 4].map((h, i) => (
                                <div key={i} className="flex-1 bg-rose-500 rounded-t-sm" style={{height: `${h}%`}}></div>
                            ))}
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-black text-slate-800 leading-none">{getBenfordAnomalyCount()}</div>
                            <div className="text-[8px] font-black text-rose-500 uppercase mt-1">Anomalías</div>
                        </div>
                    </div>
                </div>

                {/* Valores Atípicos */}
                <div 
                    onClick={() => handleInsightSelection('Outliers')}
                    className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedInsight === 'Outliers' ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/10' : 'border-slate-200'}`}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valores Atípicos</h5>
                        <button onClick={(e) => handleShowDetails(e, 'Outliers')} className="text-purple-500 hover:text-purple-600">
                            <i className="fas fa-expand-arrows-alt"></i>
                        </button>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-purple-600 leading-none">{analysis?.outliersCount || 0}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Registros > IQR</div>
                    </div>
                </div>

                {/* Duplicados */}
                <div 
                    onClick={() => handleInsightSelection('Duplicates')}
                    className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedInsight === 'Duplicates' ? 'border-orange-500 ring-2 ring-orange-100 bg-orange-50/10' : 'border-slate-200'}`}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplicados</h5>
                        <button onClick={(e) => handleShowDetails(e, 'Duplicates')} className="text-orange-500 hover:text-orange-600">
                            <i className="fas fa-copy"></i>
                        </button>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-orange-500 leading-none">{analysis?.duplicatesCount || 0}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Valores Repetidos</div>
                    </div>
                </div>

                {/* Números Redondos */}
                <div 
                    onClick={() => handleInsightSelection('RoundNumbers')}
                    className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedInsight === 'RoundNumbers' ? 'border-cyan-500 ring-2 ring-cyan-100 bg-cyan-50/10' : 'border-slate-200'}`}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Números Redondos</h5>
                        <button onClick={(e) => handleShowDetails(e, 'RoundNumbers')} className="text-cyan-500 hover:text-cyan-600">
                            <i className="fas fa-coins"></i>
                        </button>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-slate-800 leading-none">{analysis?.roundNumbersCount || 0}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">Hallazgos Redondos</div>
                    </div>
                </div>
            </div>

            {/* RISK SCORING (Muestreo Inteligente) */}
            <div 
                onClick={() => handleInsightSelection('RiskScoring')}
                className={`cursor-pointer bg-white border rounded-3xl p-6 shadow-sm relative overflow-hidden group transition-all hover:shadow-lg ${selectedInsight === 'RiskScoring' ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/10' : 'border-slate-200'}`}
            >
                <div className="absolute top-0 right-0 p-1 bg-rose-500 text-white text-[8px] font-black px-3 py-1 uppercase tracking-widest rounded-bl-xl shadow-lg">ESTRATEGIA ACTIVA</div>
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-100 shadow-sm text-rose-500 flex-shrink-0">
                        <i className="fas fa-biohazard text-3xl"></i>
                    </div>
                    <div>
                        <h4 className="text-slate-800 font-black text-base">Risk Scoring (Muestreo Inteligente)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1 max-w-3xl">
                            Combina todos los factores anteriores para calcular un <span className="font-bold text-slate-700">Puntaje de Riesgo</span> por transacción. Selecciona automáticamente los ítems con mayor coincidencia de alertas (ej. Outlier + Redondo + Duplicado).
                        </p>
                        <div className="flex gap-2 mt-3">
                            <span className="px-2 py-0.5 bg-white border border-rose-200 rounded text-[9px] font-bold text-rose-700 uppercase tracking-tight">Recomendado por Firmas Globales</span>
                            <span className="px-2 py-0.5 bg-white border border-rose-200 rounded text-[9px] font-bold text-rose-700 uppercase tracking-tight">Enfoque Basado en Riesgo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TEXTAREAS DE CRITERIO Y JUSTIFICACIÓN */}
            <div className="space-y-6 pt-4">
                <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 block flex items-center">
                        Criterio de Selección <i className="fas fa-info-circle text-blue-400 ml-2"></i>
                    </label>
                    <textarea 
                        name="criteria" 
                        value={params.criteria} 
                        onChange={(e) => setAppState(prev => ({...prev, samplingParams: {...prev.samplingParams, nonStatistical: {...prev.samplingParams.nonStatistical, criteria: e.target.value}}}))}
                        rows={2} 
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        placeholder="Describa qué elementos específicos seleccionará..."
                    />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 block">Justificación del Muestreo (Requerido)</label>
                    <textarea 
                        name="justification" 
                        value={params.justification} 
                        onChange={(e) => setAppState(prev => ({...prev, samplingParams: {...prev.samplingParams, nonStatistical: {...prev.samplingParams.nonStatistical, justification: e.target.value}}}))}
                        rows={3} 
                        className="w-full px-5 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        placeholder="Explique por qué este criterio es relevante para el objetivo de auditoría..."
                    />
                </div>
            </div>

            {/* MODAL DE DETALLE DE RIESGO */}
            <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Análisis Forense: ${detailType}`}>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hallazgos Detectados</p>
                            <p className="text-2xl font-black text-slate-900">{detailItems.length}</p>
                        </div>
                        <button 
                            onClick={() => {
                                const ws = utils.json_to_sheet(detailItems);
                                const wb = utils.book_new();
                                utils.book_append_sheet(wb, ws, "Hallazgos");
                                writeFile(wb, `AAMA_Forense_${detailType}.xlsx`);
                            }}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-colors"
                        >
                            <i className="fas fa-file-excel mr-2"></i> Exportar a Excel
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-2xl">
                        {isLoadingDetails ? (
                            <div className="p-10 text-center text-slate-400"><i className="fas fa-spinner fa-spin mr-2"></i> Cargando registros de la población...</div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Registro</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto Monetario</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {detailItems.slice(0, 50).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2 text-xs font-mono font-bold text-slate-600">{item.id}</td>
                                            <td className="px-4 py-2 text-xs text-right font-black text-slate-900">${formatMoney(item.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default NonStatisticalSampling;
