
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
    const [hasMonetaryCols, setHasMonetaryCols] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const calculateHash = async (fileBuffer: ArrayBuffer): Promise<string> => {
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
                const fileHeaders = Object.keys(jsonData[0]);
                setHeaders(fileHeaders);
                setData(jsonData);
                setStage('map_columns');
            } catch (err: any) {
                setError(`Error: ${err.message}`);
                setStage('error');
            }
        }
    };
    
    return (
        <div className="animate-fade-in">
             <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Carga de Población</h2>
                    <p className="text-slate-500 mt-1">Siga el asistente para importar sus datos.</p>
                </div>
                <button 
                    onClick={onCancel} 
                    className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:text-blue-800 hover:border-blue-500 hover:shadow-xl transition-all transform hover:-translate-y-1 group flex items-center shadow-md"
                >
                    <div className="bg-slate-100 group-hover:bg-blue-50 p-2 rounded-lg mr-3 transition-colors">
                        <i className="fas fa-arrow-left text-blue-600 transform group-hover:-translate-x-1 transition-transform"></i>
                    </div>
                    Volver al Gestor
                </button>
            </div>

            <Card className="border-t-4 border-t-slate-900">
                {stage === 'select_file' && (
                    <div className="text-center p-12">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                            <i className="fas fa-file-excel text-5xl text-slate-300"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Seleccione su Origen de Datos</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Soporta Excel (.xlsx) y CSV. Asegúrese de incluir encabezados en la primera fila.</p>
                        
                        <input type="file" id="file-upload" className="hidden" accept=".xlsx, .csv" onChange={handleFileChange} />
                        <label 
                            htmlFor="file-upload" 
                            className="cursor-pointer inline-flex items-center px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:bg-slate-800 transition-all transform hover:-translate-y-1"
                        >
                           <i className="fas fa-search mr-2 text-cyan-400"></i> Buscar Archivo
                        </label>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DataUploadFlow;
