
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
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                stratified: {
                    ...prev.samplingParams.stratified,
                    [name]: type === 'number' ? Number(value) : value
                }
            }
        }));
    };

    const handleBasisChange = (basis: 'Monetary' | 'Category' | 'Subcategory') => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                stratified: {
                    ...prev.samplingParams.stratified,
                    basis
                }
            }
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Intro Banner */}
             <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start">
                 <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white mr-5 shadow-md">
                    <i className="fas fa-layer-group text-2xl"></i>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Muestreo Estratificado</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        Divide la población en subgrupos homogéneos (estratos) y toma muestras de cada uno. 
                        Permite estratificar por valor monetario o por variables cualitativas (ej. Sucursal, Tipo).
                    </p>
                </div>
            </div>

            {/* Selector de Base de Estratificación */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                 <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Seleccionar Base de Estratificación</label>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {/* Opción 1: Monetario */}
                     <button 
                        onClick={() => handleBasisChange('Monetary')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all min-h-[100px] ${params.basis === 'Monetary' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-200 text-gray-600'}`}
                     >
                         <i className="fas fa-coins text-2xl mb-2"></i>
                         <span className="font-bold text-sm">Por Rangos Monetarios</span>
                     </button>

                     {/* Opción 2: Categoría */}
                     <button 
                        onClick={() => handleBasisChange('Category')}
                        disabled={!categoryColumn}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all min-h-[100px] ${params.basis === 'Category' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'} ${!categoryColumn ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-purple-200'}`}
                     >
                         <i className="fas fa-tag text-2xl mb-2"></i>
                         <div className="text-center">
                             <span className="font-bold text-sm block">Por Variable 1</span>
                             {categoryColumn 
                                ? <span className="text-[10px] text-purple-600 font-mono bg-purple-100 px-1 rounded mt-1 inline-block">{categoryColumn}</span>
                                : <span className="text-[10px] text-gray-400 italic mt-1 block">No configurada</span>
                             }
                         </div>
                     </button>

                     {/* Opción 3: Subcategoría */}
                     <button 
                        onClick={() => handleBasisChange('Subcategory')}
                        disabled={!subcategoryColumn}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all min-h-[100px] ${params.basis === 'Subcategory' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'} ${!subcategoryColumn ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-pink-200'}`}
                     >
                         <i className="fas fa-tags text-2xl mb-2"></i>
                         <div className="text-center">
                             <span className="font-bold text-sm block">Por Variable 2</span>
                             {subcategoryColumn 
                                ? <span className="text-[10px] text-pink-600 font-mono bg-pink-100 px-1 rounded mt-1 inline-block">{subcategoryColumn}</span>
                                : <span className="text-[10px] text-gray-400 italic mt-1 block">No configurada</span>
                             }
                         </div>
                     </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1: Strata Count / Config */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 border-l-[6px] border-l-indigo-500 shadow-md hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center">
                            <div className="p-2.5 rounded-lg mr-3 bg-indigo-50 text-indigo-600">
                                <i className={`fas ${params.basis === 'Monetary' ? 'fa-sort-amount-up' : 'fa-list-ul'} text-lg`}></i>
                            </div>
                            <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                {params.basis === 'Monetary' ? 'Cantidad de Rangos' : 'Grupos Detectados'}
                            </label>
                         </div>
                         <InfoHelper title={ASSISTANT_CONTENT.cantidadEstratos.title} content={ASSISTANT_CONTENT.cantidadEstratos.content} />
                    </div>
                    
                    {params.basis === 'Monetary' ? (
                        <>
                            <input 
                                type="number" 
                                name="strataCount" 
                                value={params.strataCount} 
                                onChange={handleChange} 
                                min="2" 
                                max="10" 
                                className="w-full text-2xl font-bold text-center py-2 border-b-2 border-indigo-100 focus:border-indigo-500 focus:outline-none bg-transparent"
                            />
                            <p className="text-xs text-center mt-2 text-gray-500">Recomendado: 3 a 5 rangos de valor.</p>
                        </>
                    ) : (
                         <div className="text-center py-2">
                             <div className="text-2xl font-bold text-gray-600">Auto</div>
                             <p className="text-xs text-gray-500 mt-1">
                                Se crearán estratos automáticamente por cada valor único en 
                                <span className="font-bold mx-1">{params.basis === 'Category' ? categoryColumn : subcategoryColumn}</span>.
                             </p>
                         </div>
                    )}
                </div>

                {/* Card 2: Allocation Method */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 border-l-[6px] border-l-purple-500 shadow-md hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center">
                            <div className="p-2.5 rounded-lg mr-3 bg-purple-50 text-purple-600">
                                <i className="fas fa-balance-scale-right text-lg"></i>
                            </div>
                            <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">Método de Asignación</label>
                         </div>
                         <InfoHelper title={ASSISTANT_CONTENT.metodoAsignacion.title} content={ASSISTANT_CONTENT.metodoAsignacion.content} />
                    </div>
                    <select 
                        name="allocationMethod" 
                        value={params.allocationMethod} 
                        onChange={handleChange} 
                        className="w-full mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
                        <option>Proporcional</option>
                        {params.basis === 'Monetary' && <option>Óptima (Neyman)</option>}
                        <option>Igualitaria</option>
                    </select>
                </div>

                {/* Card 3: Certainty Threshold */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 border-l-[6px] border-l-emerald-500 shadow-md hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center">
                            <div className="p-2.5 rounded-lg mr-3 bg-emerald-50 text-emerald-600">
                                <i className="fas fa-crown text-lg"></i>
                            </div>
                            <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">Umbral de Certeza ($)</label>
                         </div>
                         <InfoHelper title={ASSISTANT_CONTENT.umbralCerteza.title} content={ASSISTANT_CONTENT.umbralCerteza.content} />
                    </div>
                     <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                        <input 
                            type="number" 
                            name="certaintyStratumThreshold" 
                            value={params.certaintyStratumThreshold} 
                            onChange={handleChange} 
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <p className="text-xs mt-2 text-gray-500">Items sobre este monto se seleccionan siempre, independientemente del estrato.</p>
                </div>
            </div>
        </div>
    );
};

export default StratifiedSampling;
