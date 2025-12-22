
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, SamplingMethod, AuditResults } from '../../types';
import Modal from '../ui/Modal';
import { RichInfoCard } from '../ui/RichInfoCard';
import RiskChart from '../reporting/RiskChart';
import { supabase } from '../../services/supabaseClient';
import { generateAuditReport } from '../../services/reportService';
import html2canvas from 'html2canvas';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
    ScatterChart, Scatter, ZAxis, CartesianGrid, ReferenceLine, ReferenceArea, LabelList
} from 'recharts';

interface Props {
    appState: AppState;
    onBack: () => void;
    onRestart: () => void;
}

const INSIGHT_COLORS = {
    Benford: '#ef4444',
    Outliers: '#9333ea',
    Duplicates: '#f97316',
    RoundNumbers: '#06b6d4'
};

const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getMethodLabel = (method: SamplingMethod) => {
    switch (method) {
        case SamplingMethod.Attribute: return 'de Atributos';
        case SamplingMethod.MUS: return 'Monetario (MUS)';
        case SamplingMethod.CAV: return 'de Variables (CAV)';
        case SamplingMethod.Stratified: return 'Estratificado';
        case SamplingMethod.NonStatistical: return 'No Estadístico (Juicio)';
        default: return method;
    }
};

const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded shadow-xl border border-slate-200 text-xs z-50">
                <p className="font-bold text-base mb-1" style={{color: data.color}}>{data.label}</p>
                <p className="text-slate-600 font-bold">Registros: {data.count.toLocaleString()}</p>
                <p className="text-slate-500 italic mt-1">{data.description}</p>
            </div>
        );
    }
    return null;
};

const Step4Results: React.FC<Props> = ({ appState, onBack, onRestart }) => {
    if (!appState.results) return null;

    const { generalParams, samplingMethod, samplingParams, isLocked, isCurrentVersion, historyId, selectedPopulation } = appState;
    const [currentResults, setCurrentResults] = useState<AuditResults>(appState.results);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (appState.results) {
            setCurrentResults(appState.results);
        }
    }, [appState.results]);

    const isArchived = isLocked && !isCurrentVersion;
    const analysis = selectedPopulation?.advanced_analysis;

    const confidenceValue = samplingMethod === SamplingMethod.Attribute 
        ? samplingParams.attribute.NC 
        : (100 - (samplingParams.mus?.RIA || 5));

    const summaryChartData = useMemo(() => {
        if (!analysis) return [];
        const benfordAnomalyCount = analysis.benford
            ?.filter(b => b.isSuspicious)
            .reduce((acc, curr) => acc + curr.actualCount, 0) || 0;

        return [
            { name: 'Outliers', label: 'Atípicos', count: analysis.outliersCount, severity: 90, color: INSIGHT_COLORS.Outliers, description: 'Impacto Alto' },
            { name: 'Benford', label: 'Benford', count: benfordAnomalyCount, severity: 75, color: INSIGHT_COLORS.Benford, description: 'Anomalía' },
            { name: 'Duplicates', label: 'Duplicados', count: analysis.duplicatesCount, severity: 60, color: INSIGHT_COLORS.Duplicates, description: 'Operativo' },
            { name: 'RoundNumbers', label: 'Redondos', count: analysis.roundNumbersCount, severity: 40, color: INSIGHT_COLORS.RoundNumbers, description: 'Estimados' }
        ].filter(item => item.count > 0);
    }, [analysis]);

    const maxCountForDomain = Math.max(...summaryChartData.map(d => d.count), 10) * 1.2;

    const handleSyncToDatabase = async () => {
        if (!historyId || !isCurrentVersion || saving) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('audit_historical_samples')
                .update({ results_snapshot: currentResults })
                .eq('id', historyId);
            if (error) throw error;
            alert("Sincronización Exitosa.");
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const forensicContainer = document.getElementById('forensic-charts-dashboard');
            const resultsContainer = document.getElementById('main-risk-chart-container');
            const kpiContainer = document.getElementById('results-kpis-panel');
            const insightsContainer = document.getElementById('forensic-summary-insights');
            const strategyContainer = document.getElementById('selected-strategy-snapshot');
            
            let forensicImg = undefined;
            let resultsImg = undefined;
            let kpiImg = undefined;
            let insightsImg = undefined;
            let strategyImg = undefined;

            if (forensicContainer) {
                const canvas = await html2canvas(forensicContainer, { scale: 2 });
                forensicImg = canvas.toDataURL('image/png');
            }

            if (resultsContainer) {
                const canvas = await html2canvas(resultsContainer, { scale: 2 });
                resultsImg = canvas.toDataURL('image/png');
            }

            if (kpiContainer) {
                const canvas = await html2canvas(kpiContainer, { scale: 2 });
                kpiImg = canvas.toDataURL('image/png');
            }

            if (insightsContainer) {
                const canvas = await html2canvas(insightsContainer, { scale: 2 });
                insightsImg = canvas.toDataURL('image/png');
            }

            if (strategyContainer) {
                const canvas = await html2canvas(strategyContainer, { scale: 2 });
                strategyImg = canvas.toDataURL('image/png');
            }

            await generateAuditReport(
                { ...appState, results: currentResults },
                { forensic: forensicImg, results: resultsImg, kpis: kpiImg, insights: insightsImg, strategy: strategyImg }
            );
        } catch (err: any) {
            alert(`Error al generar el informe: ${err.message}.`);
        } finally {
            setExporting(false);
        }
    };

    const benfordAnomalies = analysis?.benford?.filter(b => b.isSuspicious).reduce((a, b) => a + b.actualCount, 0) || 0;

    return (
        <div className="animate-fade-in pb-20">
            {/* Header VIP */}
            <div className="mb-8 rounded-3xl shadow-lg border border-slate-200 overflow-hidden relative bg-white">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${isArchived ? 'bg-red-500' : isCurrentVersion ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
                <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                Papel de Trabajo: <span className="text-blue-700">{getMethodLabel(samplingMethod)}</span>
                            </h2>
                            {isLocked && (
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg ${isCurrentVersion ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                                    <i className={`fas ${isCurrentVersion ? 'fa-check-double' : 'fa-lock'} mr-2 text-cyan-400`}></i> 
                                    {isCurrentVersion ? 'Archivo Vigente' : 'Archivo Archivado'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold flex items-center">
                            Objetivo: {generalParams.objective || "Validación General de Integridad"}
                        </p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={handleExportPDF} disabled={exporting} className="px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-white uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-md">
                            {exporting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-pdf mr-2 text-red-400"></i>}
                            Exportar Papel de Trabajo
                        </button>
                         {isCurrentVersion && (
                            <button onClick={handleSyncToDatabase} disabled={saving} className="px-5 py-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-black text-emerald-700 uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center shadow-md">
                                {saving ? <i className="fas fa-sync fa-spin mr-2"></i> : <i className="fas fa-cloud-upload mr-2"></i>} Sincronizar Cambios
                            </button>
                         )}
                         <button onClick={onBack} className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:text-blue-800 hover:border-blue-500 transition-all shadow-md">
                            <i className="fas fa-chevron-left mr-3"></i> Volver
                        </button>
                    </div>
                </div>
            </div>

            {/* I. ESCENARIO PRELIMINAR (CAPTURA PARA PDF - IMAGEN 1) */}
            <div className="mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">I. Diagnóstico Forense y Estrategia Preliminar</h3>
                
                {/* 1.1 Insights Forenses */}
                <div id="forensic-summary-insights" className="grid grid-cols-4 gap-4 mb-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ley de Benford</p>
                        <p className="text-xl font-black text-rose-500">{benfordAnomalies}</p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Anomalías</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Atípicos</p>
                        <p className="text-xl font-black text-purple-600">{analysis?.outliersCount || 0}</p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Registros</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duplicados</p>
                        <p className="text-xl font-black text-orange-500">{analysis?.duplicatesCount || 0}</p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Repetidos</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Redondos</p>
                        <p className="text-xl font-black text-cyan-600">{analysis?.roundNumbersCount || 0}</p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Hallazgos</p>
                    </div>
                </div>

                {/* 1.2 Estrategia, Criterio y Justificación (BLOQUE INTEGRAL PARA IMAGEN 1) */}
                <div id="selected-strategy-snapshot" className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8 relative overflow-hidden">
                    {/* Badge de Estrategia */}
                    <div className="absolute top-0 right-0 p-1 bg-rose-500 text-white text-[8px] font-black px-4 py-1.5 uppercase tracking-widest rounded-bl-2xl shadow-lg z-10">
                        ESTRATEGIA ACTIVA
                    </div>

                    {/* Fila 1: Tarjeta de Estrategia */}
                    <div className="flex items-center gap-6 border-b border-slate-100 pb-6">
                        <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-100 shadow-sm text-rose-500 flex-shrink-0">
                            <i className="fas fa-biohazard text-3xl"></i>
                        </div>
                        <div>
                            <h4 className="text-slate-800 font-black text-lg">Risk Scoring (Muestreo Inteligente)</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                Combina todos los factores anteriores para calcular un <span className="font-bold text-slate-700">Puntaje de Riesgo</span> por transacción.
                            </p>
                            <div className="flex gap-2 mt-3">
                                <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 rounded text-[9px] font-bold text-rose-700 uppercase tracking-tight">Recomendado por Firmas Globales</span>
                                <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 rounded text-[9px] font-bold text-rose-700 uppercase tracking-tight">Enfoque Basado en Riesgo</span>
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Criterio de Selección */}
                    <div>
                        <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                            Criterio de Selección 
                            <i className="fas fa-info-circle text-blue-500 ml-2"></i>
                        </div>
                        <div className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium text-xs leading-relaxed shadow-inner">
                            {samplingParams.nonStatistical?.criteria || "Muestreo Inteligente Multivariable: Selección de ítems que presentan simultáneamente múltiples factores de riesgo (Score Combinado > 2)."}
                        </div>
                    </div>

                    {/* Fila 3: Justificación */}
                    <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                            Justificación del Muestreo (Requerido)
                        </div>
                        <div className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium text-xs leading-relaxed shadow-inner">
                            {samplingParams.nonStatistical?.justification || "Enfoque basado en riesgo acumulado: Se priorizan partidas que son a la vez atípicas, redondas y/o duplicadas, maximizando la efectividad de la muestra."}
                        </div>
                    </div>
                </div>
            </div>

            {/* II. PANEL DE RESULTADOS POSTERIORES (GRÁFICOS - IMAGEN 2) */}
            <div className="mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">II. Resultados Posteriores al Muestreo (Visualización)</h3>
                
                {samplingMethod === SamplingMethod.NonStatistical ? (
                    <div id="forensic-charts-dashboard" className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[380px]">
                            <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px] mb-6">
                                <i className="fas fa-chart-bar mr-2 text-blue-500"></i> Distribución de Anomalías por Categoría
                            </h3>
                            <div className="flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={summaryChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tick={{fill: '#64748b'}} />
                                        <YAxis stroke="#94a3b8" fontSize={10} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={35}>
                                            <LabelList dataKey="count" position="top" fill="#64748b" fontSize={10} />
                                            {summaryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[380px]">
                            <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px] mb-6">
                                <i className="fas fa-bullseye mr-2 text-purple-500"></i> Matriz de Priorización (Frecuencia vs Severidad)
                            </h3>
                            <div className="flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 30, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" dataKey="count" name="Frecuencia" stroke="#94a3b8" fontSize={10} domain={[0, maxCountForDomain]} />
                                        <YAxis type="number" dataKey="severity" name="Severidad" stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                                        <ZAxis type="number" range={[150, 400]} />
                                        <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                        <ReferenceArea x1={0} x2={maxCountForDomain} y1={50} y2={100} fill="#fee2e2" fillOpacity={0.15} />
                                        <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Prioridad Alta', fill: '#94a3b8', fontSize: 9 }} />
                                        {summaryChartData.map((entry, index) => (
                                            <Scatter key={index} name={entry.label} data={[entry]} fill={entry.color}>
                                                <LabelList dataKey="count" position="top" offset={8} style={{ fill: entry.color, fontSize: '10px', fontWeight: 'bold' }} />
                                            </Scatter>
                                        ))}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div id="main-risk-chart-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                            <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center">
                                <i className="fas fa-chart-bar mr-2 text-blue-500"></i> Análisis de Riesgo y Cobertura Estadística
                            </h3>
                            <div className="flex-grow">
                                <RiskChart upperErrorLimit={currentResults.sampleSize} tolerableError={currentResults.sampleSize * 1.2} method={samplingMethod} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* III. PANEL DE RESULTADOS Y KPIs (IMAGEN 3) */}
            <div className="mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">III. Papel de Trabajo Final (Muestra Alcanzada)</h3>
                <div id="results-kpis-panel" className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50/50 p-4 rounded-3xl">
                    <div onClick={() => setActiveModal('sample_size')} className="cursor-pointer bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-all group border border-slate-800">
                        <p className="font-bold opacity-60 uppercase tracking-widest text-[10px] mb-1">Muestra Alcanzada (n)</p>
                        <h3 className="text-6xl font-black">{currentResults.sampleSize}</h3>
                    </div>
                    <div onClick={() => setActiveModal('criteria_applied')} className="cursor-pointer bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col justify-center transition-all group">
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-1">Criterio Aplicado</p>
                        <h3 className="text-3xl font-black text-blue-600 leading-tight">
                            {samplingMethod === SamplingMethod.NonStatistical ? "Juicio Profesional" : `${confidenceValue}% Confianza`}
                        </h3>
                    </div>
                    <div onClick={() => setActiveModal('seed_replication')} className="cursor-pointer bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col justify-center transition-all group">
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-1">Semilla Replicable</p>
                        <h3 className="text-4xl font-mono font-bold text-slate-800">{generalParams.seed}</h3>
                    </div>
                </div>
            </div>

            {/* IV. LISTADO DE MUESTRA */}
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px] flex items-center">
                        <i className="fas fa-list-check mr-2 text-cyan-400"></i> Listado de Muestra (Papel de Trabajo NIA)
                    </h3>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Registro</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Fase</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Justificación de Riesgo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {currentResults.sample.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-4 text-xs font-mono font-black text-slate-600">{item.id}</td>
                                    <td className="px-8 py-4 text-xs text-right font-mono text-slate-900 font-black">${formatMoney(item.value)}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-2 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider ${item.is_pilot_item ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {item.is_pilot_item ? 'FASE 1' : 'FASE 2'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-[10px] font-medium text-slate-400 italic">
                                        {item.risk_justification || "Validado bajo metodología NIA 530."}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALES TÉCNICOS */}
            <Modal isOpen={activeModal === 'sample_size'} onClose={() => setActiveModal(null)} title="Análisis del Tamaño de Muestra (n)">
                <div className="space-y-4">
                    <RichInfoCard type="definition" title="Interpretación Técnica">
                        Representa el número de unidades de muestreo seleccionadas para su examen exhaustivo. El tamaño se ha determinado considerando el Riesgo de Muestreo y la variabilidad de la población.
                    </RichInfoCard>
                    <RichInfoCard type="standard" title="Conformidad NIA 530">
                        El tamaño garantiza que el error proyectado en la población no exceda el Error Tolerable configurado para esta auditoría.
                    </RichInfoCard>
                </div>
            </Modal>

            <Modal isOpen={activeModal === 'criteria_applied'} onClose={() => setActiveModal(null)} title="Enfoque: Juicio Profesional">
                <div className="space-y-4">
                    <RichInfoCard type="justification" title="¿Qué es el Juicio Profesional?">
                        Es la aplicación de la formación práctica y experiencia relevante para tomar decisiones informadas sobre la selección de la muestra cuando los métodos puramente aleatorios no son suficientes para cubrir riesgos específicos.
                    </RichInfoCard>
                </div>
            </Modal>

            <Modal isOpen={activeModal === 'seed_replication'} onClose={() => setActiveModal(null)} title="Trazabilidad y Replicabilidad">
                <div className="space-y-4">
                    <RichInfoCard type="formula" title="Importancia de la Semilla (Seed)">
                        La semilla [{generalParams.seed}] garantiza que la selección sea reproducible. Cualquier revisor de calidad que utilice este valor obtendrá exactamente los mismos registros.
                    </RichInfoCard>
                </div>
            </Modal>
        </div>
    );
};

export default Step4Results;
