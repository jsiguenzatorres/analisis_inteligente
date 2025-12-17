
import React, { useEffect, useState } from 'react';
import { AppState, SamplingMethod } from '../../types';
import Card from '../ui/Card';
import InfoHelper from '../ui/InfoHelper';
import Modal from '../ui/Modal';
import { ASSISTANT_CONTENT } from '../../constants';
import AttributeSampling from '../samplingMethods/AttributeSampling';
import MonetaryUnitSampling from '../samplingMethods/MonetaryUnitSampling';
import ClassicalVariablesSampling from '../samplingMethods/ClassicalVariablesSampling';
import NonStatisticalSampling from '../samplingMethods/NonStatisticalSampling';
import StratifiedSampling from '../samplingMethods/StratifiedSampling';
import { calculateSampleSize } from '../../services/statisticalService';
import { supabase } from '../../services/supabaseClient';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    currentMethod: SamplingMethod;
    onBack: () => void;
    onComplete: () => void;
}

const methodTitles: { [key in SamplingMethod]: string } = {
    [SamplingMethod.Attribute]: 'Muestreo de Atributos',
    [SamplingMethod.MUS]: 'Muestreo por Unidad Monetaria (MUS)',
    [SamplingMethod.CAV]: 'Muestreo de Variables Clásicas (CAV)',
    [SamplingMethod.Stratified]: 'Muestreo Estratificado',
    [SamplingMethod.NonStatistical]: 'Muestreo No Estadístico / de Juicio',
};

const methodDescriptions: { [key in SamplingMethod]: string } = {
    [SamplingMethod.Attribute]: 'Evaluación de tasas de desviación en controles internos.',
    [SamplingMethod.MUS]: 'Estimación de errores monetarios enfocada en sobrestimaciones.',
    [SamplingMethod.CAV]: 'Estimación de saldos reales mediante distribución normal.',
    [SamplingMethod.Stratified]: 'Segmentación eficiente para reducir variabilidad.',
    [SamplingMethod.NonStatistical]: 'Selección basada en experiencia y riesgo cualitativo.',
};

const methodColors: { [key in SamplingMethod]: string } = {
    [SamplingMethod.Attribute]: 'bg-blue-600',
    [SamplingMethod.MUS]: 'bg-amber-500',
    [SamplingMethod.CAV]: 'bg-orange-500',
    [SamplingMethod.Stratified]: 'bg-indigo-600',
    [SamplingMethod.NonStatistical]: 'bg-teal-500',
};

// Contenido técnico para el Modal de Metodología
const METHODOLOGY_INFO: { [key in SamplingMethod]: { logic: string, standards: string } } = {
    [SamplingMethod.Attribute]: {
        logic: "Utiliza la distribución estadística Binomial (o Hipergeométrica para poblaciones pequeñas). El tamaño (n) se determina matemáticamente para garantizar que, si la tasa de error real no excede la esperada, haya un [NC]% de probabilidad de que la muestra lo detecte.",
        standards: "Estándar de oro según NIA 530 y Guía de Auditoría AICPA para Pruebas de Cumplimiento y Control Interno."
    },
    [SamplingMethod.MUS]: {
        logic: "Basado en la teoría de Probabilidad Proporcional al Tamaño (PPS). Calcula un 'Intervalo de Muestreo' dividiendo el Valor Total entre un Factor de Confiabilidad (derivado de Poisson). Cualquier ítem mayor al intervalo se selecciona automáticamente.",
        standards: "Reconocido por NIA 530 como el método más eficiente para pruebas sustantivas de detalle cuando el objetivo es detectar sobrestimaciones (Activos/Ingresos)."
    },
    [SamplingMethod.Stratified]: {
        logic: "Emplea un enfoque de suficiencia estadística (Bottom-Up). En lugar de una fórmula de varianza global (que requiere desviación estándar conocida), asegura un tamaño mínimo representativo de 30 a 45 ítems por estrato (Teorema del Límite Central) para garantizar la validez de cada segmento.",
        standards: "Práctica estándar en Firmas Globales (Big4) y IIA cuando no se poseen datos históricos de varianza. Garantiza cobertura de riesgos específicos sin requerir muestras piloto complejas."
    },
    [SamplingMethod.CAV]: {
        logic: "Fundamentado en la teoría de la Distribución Normal (Campana de Gauss). Calcula el tamaño basándose en la variabilidad de los montos (Desviación Estándar). A mayor dispersión de datos, mayor será la muestra requerida para lograr precisión.",
        standards: "Método estadístico clásico aceptado por NIA 530. Es el único capaz de extrapolar científicamente tanto sobrestimaciones como subestimaciones y saldos negativos."
    },
    [SamplingMethod.NonStatistical]: {
        logic: "No utiliza fórmulas probabilísticas. El tamaño se determina mediante Juicio Profesional, evaluando factores cualitativos (riesgo inherente, complejidad). La selección suele ser dirigida (ej. montos altos, proveedores nuevos).",
        standards: "Permitido por NIA 530 bajo la premisa de que el auditor debe reunir evidencia suficiente. Nota: Los resultados NO pueden extrapolarse matemáticamente a toda la población."
    }
};

const SamplingWorkspace: React.FC<Props> = ({ appState, setAppState, currentMethod, onBack, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [dataStatus, setDataStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error' | 'empty', count: number }>({ status: 'idle', count: 0 });
    const [showMethodModal, setShowMethodModal] = useState(false);

    useEffect(() => {
        if (appState.selectedPopulation) {
            setAppState(prev => ({
                ...prev,
                samplingParams: {
                    ...prev.samplingParams,
                    attribute: {
                        ...prev.samplingParams.attribute,
                        N: prev.selectedPopulation?.row_count ?? 0,
                    },
                    mus: {
                        ...prev.samplingParams.mus,
                        V: prev.selectedPopulation?.total_monetary_value ?? 0,
                    },
                }
            }));
            
            // Verificar disponibilidad de datos al montar
            checkDataAvailability();
        }
    }, [appState.selectedPopulation, setAppState]);

    const checkDataAvailability = async () => {
        if (!appState.selectedPopulation) return;
        setDataStatus(prev => ({ ...prev, status: 'loading' }));
        
        try {
            const { count, error } = await supabase
                .from('audit_data_rows')
                .select('*', { count: 'exact', head: true })
                .eq('population_id', appState.selectedPopulation.id);

            if (error) {
                console.error("Error verificando datos:", error);
                setDataStatus({ status: 'error', count: 0 });
            } else {
                setDataStatus({ status: (count || 0) > 0 ? 'success' : 'empty', count: count || 0 });
            }
        } catch (e) {
            console.error(e);
            setDataStatus({ status: 'error', count: 0 });
        }
    };

    const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppState(prev => ({
            ...prev,
            generalParams: {
                ...prev.generalParams,
                [name]: name === 'seed' ? Number(value) : value,
            }
        }));
    };

    const handleRunSampling = async () => {
        if (!appState.selectedPopulation) return;
        
        setLoading(true);
        try {
            console.log("Iniciando descarga de datos para muestreo...");
            
            // 1. Descargar filas reales
            const { data: realRows, error } = await supabase
                .from('audit_data_rows')
                .select('unique_id_col, monetary_value_col, raw_json')
                .eq('population_id', appState.selectedPopulation.id)
                .limit(10000); // Límite de seguridad para el navegador

            if (error) throw error;

            if (!realRows || realRows.length === 0) {
                alert("Error: No se encontraron registros en la base de datos para esta población. Por favor vuelva a cargar el archivo.");
                setLoading(false);
                return;
            }

            console.log(`Muestra calculada sobre ${realRows.length} registros reales.`);

            // 2. Calcular muestra usando filas reales
            const results = calculateSampleSize(appState, realRows);
            setAppState(prev => ({...prev, results}));
            onComplete();

        } catch (error: any) {
            console.error("Error en muestreo:", error);
            alert(`Error obteniendo datos: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderSamplingForm = () => {
        switch (currentMethod) {
            case SamplingMethod.Attribute:
                return <AttributeSampling appState={appState} setAppState={setAppState} />;
            case SamplingMethod.MUS:
                return <MonetaryUnitSampling appState={appState} setAppState={setAppState} />;
            case SamplingMethod.CAV:
                return <ClassicalVariablesSampling appState={appState} setAppState={setAppState} />;
            case SamplingMethod.Stratified:
                return <StratifiedSampling appState={appState} setAppState={setAppState} />;
            case SamplingMethod.NonStatistical:
                return <NonStatisticalSampling appState={appState} setAppState={setAppState} />;
            default:
                return null;
        }
    };

    const renderDataStatusBadge = () => {
        if (dataStatus.status === 'loading') return <span className="text-xs text-blue-500"><i className="fas fa-spinner fa-spin mr-1"></i> Verificando...</span>;
        if (dataStatus.status === 'success') return <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-bold border border-emerald-200"><i className="fas fa-database mr-1"></i> {dataStatus.count.toLocaleString()} Registros Disponibles</span>;
        if (dataStatus.status === 'empty') return <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-bold border border-amber-200"><i className="fas fa-exclamation-triangle mr-1"></i> Sin datos en BD</span>;
        if (dataStatus.status === 'error') return <span className="text-xs text-red-600"><i className="fas fa-times-circle mr-1"></i> Error de conexión</span>;
        return null;
    };

    return (
        <div className="animate-fade-in">
             {/* Enhanced Header with Method Context */}
             <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="group cursor-pointer" onClick={() => setShowMethodModal(true)}>
                    <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm uppercase tracking-wide ${methodColors[currentMethod]}`}>
                            Método Activo
                        </span>
                        <span className="text-sm text-slate-400 font-medium flex items-center group-hover:text-blue-500 transition-colors">
                            Configuración de Parámetros
                            <i className="fas fa-info-circle ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                            {methodTitles[currentMethod]}
                        </h2>
                        <div className="mt-1">{renderDataStatusBadge()}</div>
                    </div>
                    <p className="text-slate-500 mt-1 text-lg border-l-4 border-slate-300 pl-3 italic group-hover:border-blue-400 transition-colors">
                        {methodDescriptions[currentMethod]}
                    </p>
                </div>
                <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wide flex items-center bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow">
                    <i className="fas fa-arrow-left mr-2"></i>Volver al Panel
                </button>
            </div>

            <div className="space-y-8">
                <Card title="Parámetros Generales de la Auditoría">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Objetivo Específico del Muestreo</label>
                            <textarea name="objective" value={appState.generalParams.objective} onChange={handleGeneralChange} rows={3} className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Ej. Verificar la validez de las transacciones de venta superiores a $1,000 (prueba sustantiva)." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="standard" className="block text-sm font-bold text-gray-700 mb-1">Estándar de Referencia</label>
                                <div className="relative">
                                    <select id="standard" name="standard" value={appState.generalParams.standard} onChange={handleGeneralChange} className="block w-full pl-4 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg bg-white shadow-sm appearance-none">
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
                                    <select id="template" name="template" value={appState.generalParams.template} onChange={handleGeneralChange} className="block w-full pl-4 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg bg-white shadow-sm appearance-none">
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
                                <span>Semilla (Seed)</span>
                                <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.semilla.title} content={ASSISTANT_CONTENT.semilla.content} /></span>
                            </label>
                            <input type="number" id="seed" name="seed" value={appState.generalParams.seed} onChange={handleGeneralChange} className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title={`Parámetros Específicos: ${methodTitles[currentMethod]}`}>
                    {renderSamplingForm()}
                </Card>

                <div className="pt-6 pb-6 flex justify-between items-center border-t border-gray-200">
                    <button 
                        onClick={onBack} 
                        disabled={loading}
                        className="py-2.5 px-6 border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all uppercase tracking-wide disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleRunSampling} 
                        disabled={loading || dataStatus.status === 'empty' || dataStatus.status === 'error'}
                        className="py-3 px-8 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 flex items-center transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-bolt mr-2"></i>}
                        {loading ? 'Procesando Muestra...' : 'Obtener Muestra'}
                    </button>
                </div>
            </div>

            {/* Method Info Modal */}
            <Modal isOpen={showMethodModal} onClose={() => setShowMethodModal(false)} title={`Metodología: ${methodTitles[currentMethod]}`}>
                <div className="space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <h4 className="flex items-center text-blue-800 font-bold text-sm uppercase tracking-wider mb-2">
                            <i className="fas fa-calculator mr-2"></i> Lógica de Cálculo
                        </h4>
                        <p className="text-slate-700 text-sm font-medium leading-relaxed">
                            {METHODOLOGY_INFO[currentMethod].logic}
                        </p>
                    </div>

                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                        <h4 className="flex items-center text-emerald-800 font-bold text-sm uppercase tracking-wider mb-2">
                            <i className="fas fa-globe mr-2"></i> Estándares & Reconocimiento
                        </h4>
                        <p className="text-slate-700 text-sm font-medium leading-relaxed">
                            {METHODOLOGY_INFO[currentMethod].standards}
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SamplingWorkspace;
