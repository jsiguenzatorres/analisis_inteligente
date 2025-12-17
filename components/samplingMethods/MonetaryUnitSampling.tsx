
import React, { useState, useEffect } from 'react';
import { AppState } from '../../types';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT, WarningIcon } from '../../constants';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const MonetaryUnitSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.mus;
    const [errors, setErrors] = useState<string[]>([]);
    const analysis = appState.selectedPopulation?.advanced_analysis;

    useEffect(() => {
        const currentErrors: string[] = [];
        if (params.TE <= 0) {
            currentErrors.push('El Error Tolerable (TE) debe ser un valor positivo mayor que cero.');
        }
        if (params.EE < 0) {
            currentErrors.push('El Total de Errores Previstos (EE) no puede ser un valor negativo.');
        }
        setErrors(currentErrors);
    }, [params.TE, params.EE]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let finalValue: any = value;
        if (type === 'number') finalValue = Number(value);
        if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;

        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                mus: {
                    ...prev.samplingParams.mus,
                    [name]: finalValue
                }
            }
        }));
    };
    
    const isEeHigh = params.TE > 0 && params.EE > params.TE / 2;

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600">Objetivo: Estimar el valor monetario del error (PPS/Poisson).</p>
            
            {/* Advanced Configuration Banner */}
            {analysis && (analysis.negativesCount > 0 || analysis.zerosCount > 0) && (
                 <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg mb-4">
                    <h4 className="text-orange-800 font-bold text-sm"><i className="fas fa-exclamation-triangle mr-2"></i>Atención: Datos Complejos Detectados</h4>
                    <p className="text-xs text-orange-700 mt-1">
                        La población contiene {analysis.negativesCount} negativos y {analysis.zerosCount} ceros. MUS estándar ignora estos valores. Configure el tratamiento abajo.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                    <label htmlFor="V" className="flex items-center text-sm font-medium text-gray-700">
                        <span>Valor Total de la Población (V)</span>
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.valorTotalPoblacion.title} content={ASSISTANT_CONTENT.valorTotalPoblacion.content} /></span>
                    </label>
                    {/* Read-only field formatted as currency */}
                    <input 
                        type="text" 
                        name="V" 
                        id="V" 
                        value={formatCurrency(params.V)} 
                        readOnly 
                        className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed text-gray-600 font-mono font-bold" 
                    />
                </div>
                <div>
                    <label htmlFor="TE" className="flex items-center text-sm font-medium text-gray-700">
                        <span>Error Tolerable (TE) Monetario</span>
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.errorTolerable.title} content={ASSISTANT_CONTENT.errorTolerable.content} /></span>
                    </label>
                    <input type="number" name="TE" id="TE" value={params.TE} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="EE" className="flex items-center text-sm font-medium text-gray-700">
                        <span>Total de Errores Previstos (EE)</span>
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.erroresPrevistos.title} content={ASSISTANT_CONTENT.erroresPrevistos.content} /></span>
                    </label>
                    <input type="number" name="EE" id="EE" value={params.EE} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="RIA" className="flex items-center text-sm font-medium text-gray-700">
                        <span>Riesgo de Aceptación Incorrecta (%)</span>
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.riesgoAceptacionIncorrecta.title} content={ASSISTANT_CONTENT.riesgoAceptacionIncorrecta.content} /></span>
                    </label>
                    <input type="number" name="RIA" id="RIA" value={params.RIA} onChange={handleChange} min="1" max="99" step="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
            </div>

            {/* Advanced Options Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Opciones Avanzadas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Stratum Optimization */}
                    <div className="flex items-start">
                        <div className="flex items-center h-5">
                            <input
                                id="optimizeTopStratum"
                                name="optimizeTopStratum"
                                type="checkbox"
                                checked={params.optimizeTopStratum}
                                onChange={handleChange}
                                className="focus:ring-amber-500 h-4 w-4 text-amber-600 border-gray-300 rounded"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="optimizeTopStratum" className="font-medium text-gray-700">Optimizar Estrato Superior</label>
                            <p className="text-gray-500">Detecta y segrega automáticamente los ítems de alto valor (> Intervalo) para auditar al 100%, reduciendo el tamaño de muestra del remanente.</p>
                        </div>
                    </div>

                    {/* Handle Negatives */}
                    <div>
                         <label htmlFor="handleNegatives" className="block text-sm font-medium text-gray-700 mb-1">Tratamiento de Negativos/Ceros</label>
                         <select 
                            id="handleNegatives" 
                            name="handleNegatives" 
                            value={params.handleNegatives} 
                            onChange={handleChange} 
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        >
                            <option value="Separate">Segregar (Reporte Aparte)</option>
                            <option value="Zero">Tratar como Cero (Ignorar)</option>
                            <option value="Absolute">Usar Valor Absoluto</option>
                        </select>
                    </div>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="mt-4 p-4 rounded-md flex items-start bg-red-100 border-red-300 border">
                    <WarningIcon />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error de Validación</h3>
                        <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc list-inside space-y-1">
                                {errors.map((err, index) => <li key={index}>{err}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            
            {isEeHigh && errors.length === 0 && (
                 <div className="mt-4 p-4 rounded-md flex items-start bg-yellow-100 border-yellow-300 border">
                    <WarningIcon />
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Advertencia de Eficiencia</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                           <p>El Total de Errores Previstos (EE) es mayor que la mitad del Error Tolerable (TE). El método MUS puede ser ineficiente. Considere utilizar Muestreo de Variables Clásicas (CAV).</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonetaryUnitSampling;
