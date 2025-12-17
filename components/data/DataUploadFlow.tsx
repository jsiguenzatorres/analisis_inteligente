
import React, { useState, useCallback } from 'react';
import { read, utils, WorkSheet } from 'xlsx';
import { supabase } from '../../services/supabaseClient';
import { ColumnMapping, DescriptiveStats, AdvancedAnalysis, BenfordAnalysis } from '../../types';
import Card from '../ui/Card';
import { analyzePopulationAndRecommend } from '../../services/recommendationService';

interface Props {
    onComplete: (populationId: string) => void;
    onCancel: () => void;
}

type Stage = 'select_file' | 'map_columns' | 'preview' | 'uploading' | 'error';
type DataRow = { [key: string]: string | number };

const DataUploadFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
    const [stage, setStage] = useState<Stage>('select_file');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<DataRow[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping>({ uniqueId: '', monetaryValue: '', category: '', subcategory: '' });
    const [hasMonetaryCols, setHasMonetaryCols] = useState(true); // NEW: Toggle state
    const [error, setError] = useState<string | null>(null);

    // --- Helper Logic for Advanced Analysis ---

    const calculateHash = async (fileBuffer: ArrayBuffer): Promise<string> => {
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const performAdvancedAnalysis = (values: number[]): AdvancedAnalysis => {
        if (values.length === 0) {
            return {
                benford: [],
                outliersCount: 0,
                outliersThreshold: 0,
                duplicatesCount: 0,
                zerosCount: 0,
                negativesCount: 0,
                roundNumbersCount: 0
            };
        }

        // 1. Negatives & Zeros
        const zerosCount = values.filter(v => v === 0).length;
        const negativesCount = values.filter(v => v < 0).length;
        
        // 2. Duplicates
        const seen = new Set();
        let duplicatesCount = 0;
        values.forEach(v => {
            if (seen.has(v)) duplicatesCount++;
            else seen.add(v);
        });

        // 3. Outliers (IQR Method)
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const outliersThreshold = q3 + (1.5 * iqr);
        const outliersCount = values.filter(v => v > outliersThreshold).length;

        // 4. Benford's Law (First Digit)
        const benfordProbabilities = [0, 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
        const counts = Array(10).fill(0);
        let totalValid = 0;

        values.forEach(v => {
            const firstDigit = parseInt(Math.abs(v).toString().charAt(0));
            if (firstDigit > 0) {
                counts[firstDigit]++;
                totalValid++;
            }
        });

        const benfordData: BenfordAnalysis[] = [];
        for (let i = 1; i <= 9; i++) {
            const actualFreq = (counts[i] / totalValid) * 100;
            const expectedFreq = benfordProbabilities[i];
            const deviation = Math.abs(actualFreq - expectedFreq);
            benfordData.push({
                digit: i,
                actualCount: counts[i],
                actualFreq,
                expectedFreq,
                deviation,
                isSuspicious: deviation > 5 // Umbral simple de 5% de desviación
            });
        }

        // 5. Round Numbers (New)
        // Detects numbers ending in 000, 00, or 0 relative to magnitude, excluding zeros.
        const roundNumbersCount = values.filter(v => {
            if (v === 0) return false;
            const absV = Math.abs(v);
            // Example logic: Multiples of 1000 or 100 depending on size
            return (absV >= 1000 && absV % 1000 === 0) || (absV >= 100 && absV < 1000 && absV % 100 === 0);
        }).length;

        return {
            benford: benfordData,
            outliersCount,
            outliersThreshold,
            duplicatesCount,
            zerosCount,
            negativesCount,
            roundNumbersCount
        };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            try {
                const buffer = await selectedFile.arrayBuffer();
                const workbook = read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json<DataRow>(worksheet, { defval: null });
                
                if (jsonData.length === 0) {
                    throw new Error("El archivo está vacío o no tiene datos en la primera hoja.");
                }

                const fileHeaders = Object.keys(jsonData[0]);
                setHeaders(fileHeaders);
                setData(jsonData);
                
                // Auto-detect monetary columns
                const potentialMonetary = fileHeaders.find(h => 
                    ['amount', 'monto', 'valor', 'saldo', 'total', 'precio', 'price', 'value'].some(k => h.toLowerCase().includes(k))
                );
                
                setHasMonetaryCols(!!potentialMonetary);

                setMapping({
                    uniqueId: fileHeaders.includes('id') ? 'id' : fileHeaders[0],
                    monetaryValue: potentialMonetary || '',
                    category: '',
                    subcategory: ''
                });
                setStage('map_columns');
            } catch (err: any) {
                setError(`Error al procesar el archivo: ${err.message}`);
                setStage('error');
            }
        }
    };
    
    const handleMappingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setMapping(prev => ({...prev, [name]: value}));
    };

    const validateAndPreview = () => {
        if (!mapping.uniqueId) {
            setError("Debe mapear la columna de ID Único.");
            return;
        }
        if (hasMonetaryCols && !mapping.monetaryValue) {
             setError("Si indica que hay valores monetarios, debe mapear la columna correspondiente.");
             return;
        }
        setError(null);
        setStage('preview');
    };
    
    const handleUpload = async () => {
        if (!file || data.length === 0) return;
        setStage('uploading');
        setError(null);

        try {
            // 1. Stats and Basic Data logic
            let monetaryValues: number[] = [];
            let stats: DescriptiveStats;

            if (hasMonetaryCols && mapping.monetaryValue) {
                monetaryValues = data.map(row => Number(row[mapping.monetaryValue])).filter(v => !isNaN(v));
                const count = monetaryValues.length;
                const sum = monetaryValues.reduce((a, b) => a + b, 0);
                const avg = sum / count;
                const min = Math.min(...monetaryValues);
                const max = Math.max(...monetaryValues);
                
                // Variance & StdDev Calculation
                const squareDiffs = monetaryValues.map(value => Math.pow(value - avg, 2));
                const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / count;
                const stdDev = Math.sqrt(avgSquareDiff);
                const cv = avg !== 0 ? stdDev / Math.abs(avg) : 0;

                stats = { sum, min, max, avg, std_dev: stdDev, cv };
            } else {
                // Dummy stats for Attribute-Only populations
                stats = { sum: 0, min: 0, max: 0, avg: 0, std_dev: 0, cv: 0 };
            }

            // 2. Integrity Hash
            const buffer = await file.arrayBuffer();
            const integrityHash = await calculateHash(buffer);

            // 3. Advanced Analysis (Skip if no money)
            const advancedAnalysis = hasMonetaryCols 
                ? performAdvancedAnalysis(monetaryValues) 
                : { benford: [], outliersCount: 0, outliersThreshold: 0, duplicatesCount: 0, zerosCount: 0, negativesCount: 0, roundNumbersCount: 0 };
            
            // 4. AI Recommendation Algorithm
            const aiRecommendation = analyzePopulationAndRecommend(stats, advancedAnalysis);

            // 5. Insert into Supabase with Graceful Degradation
            
            const dbPayload: any = {
                file_name: file.name,
                status: 'pendiente_validacion',
                row_count: data.length,
                total_monetary_value: stats.sum,
                column_mapping: mapping,
                descriptive_stats: stats,
                integrity_hash: integrityHash,
                advanced_analysis: advancedAnalysis,
                ai_recommendation: aiRecommendation
            };

            let result = await supabase.from('audit_populations').insert(dbPayload).select().single();

            if (result.error && (result.error.message.includes('ai_recommendation') || result.error.message.includes('column'))) {
                console.warn("Advertencia de Schema: La columna 'ai_recommendation' no existe en la BD. Guardando sin recomendación de IA.");
                delete dbPayload.ai_recommendation;
                result = await supabase.from('audit_populations').insert(dbPayload).select().single();
            }

            if (result.error) {
                throw new Error(`Base de datos: ${result.error.message}`);
            }
            
            const populationId = result.data.id;

            // 6. Insert Rows (Batched)
            const rowsToInsert = data.map(row => ({
                population_id: populationId,
                unique_id_col: String(row[mapping.uniqueId]),
                monetary_value_col: (hasMonetaryCols && mapping.monetaryValue) ? Number(row[mapping.monetaryValue]) : 0,
                raw_json: row,
            }));
            
            // Simple batching to avoid payload limit
            const batchSize = 1000;
            for (let i = 0; i < rowsToInsert.length; i += batchSize) {
                const batch = rowsToInsert.slice(i, i + batchSize);
                const { error: rowsError } = await supabase.from('audit_data_rows').insert(batch);
                if (rowsError) throw new Error(`Error insertando filas: ${rowsError.message}`);
            }

            onComplete(populationId);

        } catch (err: any) {
            setError(`Error crítico en la carga: ${err.message}`);
            setStage('error');
        }
    };

    return (
        <div className="animate-fade-in">
             {/* ... (Existing render code unchanged) ... */}
             <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Carga de Nueva Población</h2>
                    <p className="text-slate-500 mt-1">Siga el asistente para importar sus datos de auditoría.</p>
                </div>
                <button onClick={onCancel} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center uppercase tracking-wide">
                    <i className="fas fa-arrow-left mr-2"></i>Volver al Gestor
                </button>
            </div>

            <Card className="border-t-4 border-t-indigo-500">
                {stage === 'select_file' && (
                    <div className="text-center p-12">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-file-excel text-5xl text-indigo-500"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Seleccione un archivo de origen</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Soporta archivos Excel (.xlsx) y CSV. Asegúrese de que la primera fila contenga los encabezados.</p>
                        
                        <input type="file" id="file-upload" className="hidden" accept=".xlsx, .csv" onChange={handleFileChange} />
                        <label 
                            htmlFor="file-upload" 
                            className="cursor-pointer inline-flex items-center px-8 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide"
                        >
                           <i className="fas fa-search mr-2"></i> Buscar en mi equipo
                        </label>
                    </div>
                )}
                
                {stage === 'map_columns' && (
                     <div className="max-w-3xl mx-auto py-4">
                        <div className="flex items-center mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-4">1</div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Mapeo de Columnas</h3>
                                <p className="text-sm text-slate-500">Asigne las columnas de su archivo a los campos requeridos.</p>
                            </div>
                        </div>

                        {/* --- NEW: Data Type Toggle --- */}
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                             <div className="flex items-center">
                                <div className="p-2 bg-blue-200 text-blue-700 rounded-lg mr-3">
                                    <i className={`fas ${hasMonetaryCols ? 'fa-coins' : 'fa-list-ul'}`}></i>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900">Tipo de Datos</h4>
                                    <p className="text-xs text-blue-700">
                                        {hasMonetaryCols 
                                            ? "El archivo contiene importes financieros (Muestreo Estadístico Completo)." 
                                            : "El archivo solo contiene atributos (Solo Muestreo de Atributos)."}
                                    </p>
                                </div>
                             </div>
                             <div className="flex items-center bg-white rounded-full p-1 border border-blue-200 shadow-sm">
                                <button 
                                    onClick={() => setHasMonetaryCols(true)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${hasMonetaryCols ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Con Montos
                                </button>
                                <button 
                                    onClick={() => setHasMonetaryCols(false)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!hasMonetaryCols ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Solo Atributos
                                </button>
                             </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Columna de ID Único <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select name="uniqueId" value={mapping.uniqueId || ''} onChange={handleMappingChange} className="block w-full pl-4 pr-10 py-3 text-base border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg shadow-sm">
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Identificador único (ej. Factura, Asiento).</p>
                            </div>
                             
                             {/* Conditional Monetary Column */}
                             <div className={`transition-all duration-300 ${!hasMonetaryCols ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Columna de Valor Monetario 
                                    {hasMonetaryCols && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <div className="relative">
                                    <select 
                                        name="monetaryValue" 
                                        value={mapping.monetaryValue || ''} 
                                        onChange={handleMappingChange} 
                                        disabled={!hasMonetaryCols}
                                        className="block w-full pl-4 pr-10 py-3 text-base border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg shadow-sm disabled:bg-slate-200"
                                    >
                                        <option value="">-- No aplica --</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Campo numérico para el muestreo (MUS/Variables).</p>
                            </div>
                            
                            {/* Sección: Variables Cualitativas */}
                            <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                        Categoría Principal (Opcional)
                                        <span className="ml-2 bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Var 1</span>
                                    </label>
                                    <div className="relative">
                                        <select name="category" value={mapping.category || ''} onChange={handleMappingChange} className="block w-full pl-4 pr-10 py-3 text-base border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm rounded-lg shadow-sm">
                                            <option value="">-- Sin estratificación cualitativa --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Ej. Sucursal, Departamento.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                        Subcategoría (Opcional)
                                        <span className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Var 2</span>
                                    </label>
                                    <div className="relative">
                                        <select name="subcategory" value={mapping.subcategory || ''} onChange={handleMappingChange} className="block w-full pl-4 pr-10 py-3 text-base border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm rounded-lg shadow-sm">
                                            <option value="">-- Sin subcategoría --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Ej. Tipo de Gasto, Usuario.</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={validateAndPreview} 
                                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide"
                            >
                                Validar y Previsualizar <i className="fas fa-arrow-right ml-2"></i>
                            </button>
                        </div>
                    </div>
                )}

                {stage === 'preview' && (
                     <div className="py-4">
                        {/* ... Existing Preview Code ... */}
                        <div className="flex items-center mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-4">2</div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Previsualización y Confirmación</h3>
                                <p className="text-sm text-slate-500">Revise que los datos sean correctos antes de importar.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 text-center">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-xl font-extrabold text-slate-800">{data.length.toLocaleString()}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Filas</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-sm font-bold text-blue-600 truncate px-1">{mapping.uniqueId}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className={`text-sm font-bold truncate px-1 ${hasMonetaryCols ? 'text-emerald-600' : 'text-gray-400 italic'}`}>
                                    {hasMonetaryCols ? mapping.monetaryValue : 'N/A (Atributos)'}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valor</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className={`text-sm font-bold truncate px-1 ${mapping.category ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {mapping.category || 'N/A'}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Categoría</div>
                            </div>
                             <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className={`text-sm font-bold truncate px-1 ${mapping.subcategory ? 'text-purple-600' : 'text-gray-400'}`}>
                                    {mapping.subcategory || 'N/A'}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Subcat.</div>
                            </div>
                        </div>

                         <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
                             <button 
                                onClick={() => setStage('map_columns')} 
                                className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-colors uppercase tracking-wide"
                            >
                                Atrás
                            </button>
                             <button 
                                onClick={handleUpload} 
                                className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide"
                            >
                                <i className="fas fa-magic mr-2"></i> Analizar y Cargar
                            </button>
                        </div>
                    </div>
                )}
                
                {(stage === 'uploading' || stage === 'error') && (
                    <div className="text-center p-12">
                        {stage === 'uploading' && (
                            <>
                                <div className="inline-block relative">
                                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <i className="fas fa-brain text-blue-500 animate-pulse"></i>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mt-6 text-slate-800">Motor de IA en Ejecución...</h3>
                                <p className="text-slate-500 mt-2">Calculando volatilidad, outliers y generando recomendación de muestreo...</p>
                            </>
                        )}
                        {stage === 'error' && (
                             <>
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Error en la carga</h3>
                                <p className="text-slate-600 bg-red-50 p-4 rounded-lg border border-red-100 max-w-lg mx-auto mb-8 font-mono text-sm">{error}</p>
                                <button 
                                    onClick={() => setStage('select_file')} 
                                    className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-colors uppercase tracking-wide"
                                >
                                    Intentar de Nuevo
                                </button>
                            </>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DataUploadFlow;
