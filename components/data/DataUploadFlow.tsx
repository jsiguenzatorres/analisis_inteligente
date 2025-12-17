
import React, { useState } from 'react';
import { read, utils } from 'xlsx';
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
    const [hasMonetaryCols, setHasMonetaryCols] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const performAdvancedAnalysis = (values: number[]): AdvancedAnalysis => {
        const zerosCount = values.filter(v => v === 0).length;
        const negativesCount = values.filter(v => v < 0).length;
        const seen = new Set();
        let duplicatesCount = 0;
        values.forEach(v => {
            if (seen.has(v)) duplicatesCount++;
            else seen.add(v);
        });
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
        const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
        const iqr = q3 - q1;
        const outliersThreshold = q3 + (1.5 * iqr);
        const outliersCount = values.filter(v => v > outliersThreshold).length;

        const benfordProbabilities = [0, 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
        const counts = Array(10).fill(0);
        let totalValid = 0;
        values.forEach(v => {
            const firstDigit = parseInt(Math.abs(v).toString().charAt(0));
            if (firstDigit > 0) { counts[firstDigit]++; totalValid++; }
        });

        const benfordData: BenfordAnalysis[] = [];
        for (let i = 1; i <= 9; i++) {
            const actualFreq = totalValid > 0 ? (counts[i] / totalValid) * 100 : 0;
            benfordData.push({
                digit: i,
                actualCount: counts[i],
                actualFreq,
                expectedFreq: benfordProbabilities[i],
                deviation: Math.abs(actualFreq - benfordProbabilities[i]),
                isSuspicious: Math.abs(actualFreq - benfordProbabilities[i]) > 5
            });
        }

        const roundNumbersCount = values.filter(v => v !== 0 && Math.abs(v) % 100 === 0).length;

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
            try {
                const buffer = await selectedFile.arrayBuffer();
                const workbook = read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json<DataRow>(worksheet, { defval: null });
                if (jsonData.length === 0) throw new Error("Archivo vacío.");
                const fileHeaders = Object.keys(jsonData[0]);
                setHeaders(fileHeaders);
                setData(jsonData);
                setStage('map_columns');
            } catch (err: any) {
                setError(err.message);
                setStage('error');
            }
        }
    };

    const handleUpload = async () => {
        if (!file || data.length === 0) return;
        setStage('uploading');
        try {
            let monetaryValues: number[] = [];
            let stats: DescriptiveStats = { sum: 0, min: 0, max: 0, avg: 0, std_dev: 0, cv: 0 };

            if (hasMonetaryCols && mapping.monetaryValue) {
                monetaryValues = data.map(row => Number(row[mapping.monetaryValue])).filter(v => !isNaN(v));
                const count = monetaryValues.length;
                const sum = monetaryValues.reduce((a, b) => a + b, 0);
                const avg = sum / count;
                const squareDiffs = monetaryValues.map(v => Math.pow(v - avg, 2));
                const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / count);
                stats = { sum, min: Math.min(...monetaryValues), max: Math.max(...monetaryValues), avg, std_dev: stdDev, cv: avg !== 0 ? stdDev / Math.abs(avg) : 0 };
            }

            const advancedAnalysis = performAdvancedAnalysis(monetaryValues);
            
            // LLAMADA A IA GEMINI
            const aiRecommendation = await analyzePopulationAndRecommend(stats, advancedAnalysis);

            const { data: pop, error: popErr } = await supabase.from('audit_populations').insert({
                file_name: file.name,
                status: 'pendiente_validacion',
                row_count: data.length,
                total_monetary_value: stats.sum,
                column_mapping: mapping,
                descriptive_stats: stats,
                advanced_analysis: advancedAnalysis,
                ai_recommendation: aiRecommendation
            }).select().single();

            if (popErr) throw popErr;

            const rowsToInsert = data.map(row => ({
                population_id: pop.id,
                unique_id_col: String(row[mapping.uniqueId]),
                monetary_value_col: hasMonetaryCols ? Number(row[mapping.monetaryValue]) : 0,
                raw_json: row,
            }));

            const batchSize = 500;
            for (let i = 0; i < rowsToInsert.length; i += batchSize) {
                const { error: rowErr } = await supabase.from('audit_data_rows').insert(rowsToInsert.slice(i, i + batchSize));
                if (rowErr) throw rowErr;
            }

            onComplete(pop.id);
        } catch (err: any) {
            setError(err.message);
            setStage('error');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-end">
                <h2 className="text-3xl font-extrabold text-slate-800">Carga de Nueva Población</h2>
                <button onClick={onCancel} className="text-sm font-bold text-slate-500 hover:text-blue-600 uppercase">Cerrar</button>
            </div>
            <Card>
                {stage === 'select_file' && (
                    <div className="text-center p-12">
                        <input type="file" id="f" className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                        <label htmlFor="f" className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg">Seleccionar Archivo</label>
                    </div>
                )}
                {stage === 'map_columns' && (
                    <div className="p-4 space-y-4">
                        <select name="uniqueId" onChange={e => setMapping(p=>({...p, uniqueId: e.target.value}))} className="w-full p-2 border rounded">
                            <option value="">ID Único</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <select name="monetaryValue" onChange={e => setMapping(p=>({...p, monetaryValue: e.target.value}))} className="w-full p-2 border rounded">
                            <option value="">Valor Monetario</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <button onClick={handleUpload} className="w-full bg-emerald-600 text-white py-3 rounded font-bold">Analizar y Cargar</button>
                    </div>
                )}
                {stage === 'uploading' && (
                    <div className="text-center p-12">
                        <i className="fas fa-brain fa-spin text-4xl text-blue-600 mb-4"></i>
                        <p className="font-bold">Gemini IA analizando riesgos y generando estrategia...</p>
                    </div>
                )}
                {stage === 'error' && <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>}
            </Card>
        </div>
    );
};

export default DataUploadFlow;
