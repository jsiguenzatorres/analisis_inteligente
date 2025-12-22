
import React from 'react';
import { AppState } from '../../types';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT } from '../../constants';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const StratifiedSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.stratified;
    const categoryColumn = appState.selectedPopulation?.column_mapping.category;
    const subcategoryColumn = appState.selectedPopulation?.column_mapping.subcategory;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? Number(value) : (type === 'checkbox' ? (e.target as HTMLInputElement).checked : value);
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                stratified: { ...prev.samplingParams.stratified, [name]: val }
            }
        }));
    };

    const togglePilot = () => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                stratified: { ...prev.samplingParams.stratified, usePilotSample: !prev.samplingParams.stratified.usePilotSample }
            }
        }));
    };

    const handleBasisChange = (basis: 'Monetary' | 'Category' | 'Subcategory') => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                stratified: { ...prev.samplingParams.stratified, basis }
            }
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Banner Premium: Calibración Científica */}
            <div className="relative group overflow-hidden bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
                <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-indigo-100/50 to-transparent pointer-events-none"></div>
                <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-500"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-indigo-200 flex items-center justify-center text-indigo-600">
                            <i className="fas fa-layer-group text-2xl"></i>
                        </div>
                        <div>
                            <h4 className="text-indigo-900 font-black text-lg tracking-tight flex items-center">
                                Análisis de Dispersión
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200 uppercase">Fase Previa</span>
                            </h4>
                            <p className="text-sm text-indigo-700/80 font-medium">Realiza un pre-muestreo para determinar los límites óptimos por estrato.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white shadow-inner">
                        <span className={`text-xs font-black uppercase tracking-widest ${params.usePilotSample ? 'text-indigo-600' : 'text-slate-400'}`}>
                            Activar Diagnóstico
                        </span>
                        <button 
                            onClick={togglePilot}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${params.usePilotSample ? 'bg-indigo-500 ring-indigo-500' : 'bg-slate-300 ring-slate-200'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${params.usePilotSample ? 'translate-x-8' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                 <label className="block text-sm font-bold text-slate-800 mb-6 uppercase tracking-[0.15em] text-center">Base de Estratificación Seleccionada</label>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <button onClick={() => handleBasisChange('Monetary')} className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center transition-all transform hover:scale-[1.02] ${params.basis === 'Monetary' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-4 ring-indigo-50' : 'border-gray-100 bg-slate-50 text-gray-400 opacity-60'}`}>
                         <i className="fas fa-coins text-3xl mb-3"></i>
                         <span className="font-black text-sm uppercase">Monetario</span>
                     </button>
                     <button onClick={() => handleBasisChange('Category')} disabled={!categoryColumn} className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center transition-all transform hover:scale-[1.02] ${params.basis === 'Category' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md ring-4 ring-purple-50' : 'border-gray-100 bg-slate-50 text-gray-400 opacity-60'} disabled:cursor-not-allowed`}>
                         <i className="fas fa-tag text-3xl mb-3"></i>
                         <span className="font-black text-sm uppercase">Variable 1</span>
                     </button>
                     <button onClick={() => handleBasisChange('Subcategory')} disabled={!subcategoryColumn} className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center transition-all transform hover:scale-[1.02] ${params.basis === 'Subcategory' ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md ring-4 ring-pink-50' : 'border-gray-100 bg-slate-50 text-gray-400 opacity-60'} disabled:cursor-not-allowed`}>
                         <i className="fas fa-tags text-3xl mb-3"></i>
                         <span className="font-black text-sm uppercase">Variable 2</span>
                     </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg border-t-4 border-t-indigo-500">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Cantidad de Estratos</label>
                    <input type="number" name="strataCount" value={params.strataCount} onChange={handleChange} min="2" max="10" className="w-full text-3xl font-black text-slate-800 border-none p-0 focus:ring-0" />
                    <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${(params.strataCount / 10) * 100}%` }}></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg border-t-4 border-t-purple-500">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Método Asignación</label>
                    <select name="allocationMethod" value={params.allocationMethod} onChange={handleChange} className="w-full text-sm font-bold border-gray-200 rounded-xl focus:ring-purple-500">
                        <option>Proporcional</option>
                        <option>Óptima (Neyman)</option>
                        <option>Igualitaria</option>
                    </select>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg border-t-4 border-t-emerald-500">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Umbral Certeza ($)</label>
                    <input type="number" name="certaintyStratumThreshold" value={params.certaintyStratumThreshold} onChange={handleChange} className="w-full text-sm font-bold border-gray-200 rounded-xl focus:ring-emerald-500" />
                </div>
            </div>
        </div>
    );
};

export default StratifiedSampling;
