
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

    useEffect(() => {
        const currentErrors: string[] = [];
        if (params.TE <= 0) currentErrors.push('El Error Tolerable (TE) debe ser positivo.');
        setErrors(currentErrors);
    }, [params.TE]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;
        if (type === 'number') finalValue = Number(value);
        if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;

        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                mus: { ...prev.samplingParams.mus, [name]: finalValue }
            }
        }));
    };

    const togglePilot = () => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                mus: { ...prev.samplingParams.mus, usePilotSample: !prev.samplingParams.mus.usePilotSample }
            }
        }));
    };
    
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Banner Premium: Calibración Científica */}
            <div className="relative group overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
                <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-amber-100/50 to-transparent pointer-events-none"></div>
                <div className="absolute left-0 top-0 h-full w-1.5 bg-amber-500"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-amber-200 flex items-center justify-center text-amber-600">
                            <i className="fas fa-microscope text-2xl"></i>
                        </div>
                        <div>
                            <h4 className="text-amber-900 font-black text-lg tracking-tight flex items-center">
                                Calibración Científica
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 border border-amber-200 uppercase">Beta Testing</span>
                            </h4>
                            <p className="text-sm text-amber-700/80 font-medium">Utilice una muestra piloto para validar sus estimaciones de error antes del cálculo final.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white shadow-inner">
                        <span className={`text-xs font-black uppercase tracking-widest ${params.usePilotSample ? 'text-amber-600' : 'text-slate-400'}`}>
                            Activar Piloto (n=30)
                        </span>
                        <button 
                            onClick={togglePilot}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${params.usePilotSample ? 'bg-amber-500 ring-amber-500' : 'bg-slate-300 ring-slate-200'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${params.usePilotSample ? 'translate-x-8' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                    <label className="flex items-center text-sm font-bold text-gray-700">
                        Valor Total Población (V)
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.valorTotalPoblacion.title} content={ASSISTANT_CONTENT.valorTotalPoblacion.content} /></span>
                    </label>
                    <input type="text" value={formatCurrency(params.V)} readOnly className="mt-1 block w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono font-bold" />
                </div>
                <div>
                    <label className="flex items-center text-sm font-bold text-gray-700">
                        Error Tolerable (TE)
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.errorTolerable.title} content={ASSISTANT_CONTENT.errorTolerable.content} /></span>
                    </label>
                    <input type="number" name="TE" value={params.TE} onChange={handleChange} className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                    <label className="flex items-center text-sm font-bold text-gray-700">
                        Errores Previstos (EE)
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.erroresPrevistos.title} content={ASSISTANT_CONTENT.erroresPrevistos.content} /></span>
                    </label>
                    <input type="number" name="EE" value={params.EE} onChange={handleChange} className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                    <label className="flex items-center text-sm font-bold text-gray-700">
                        Riesgo Aceptación (RIA %)
                        <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.riesgoAceptacionIncorrecta.title} content={ASSISTANT_CONTENT.riesgoAceptacionIncorrecta.content} /></span>
                    </label>
                    <input type="number" name="RIA" value={params.RIA} onChange={handleChange} className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                    <input type="checkbox" name="optimizeTopStratum" checked={params.optimizeTopStratum} onChange={handleChange} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                    <div className="ml-3">
                        <label className="text-sm font-bold text-slate-800">Optimización Estrato Superior</label>
                        <p className="text-xs text-slate-500 mt-1">Extrae automáticamente ítems críticos para auditoría al 100%.</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1">Tratamiento Negativos</label>
                    <select name="handleNegatives" value={params.handleNegatives} onChange={handleChange} className="w-full text-sm border-gray-300 rounded-lg">
                        <option value="Separate">Segregar (Reporte Aparte)</option>
                        <option value="Zero">Tratar como Cero</option>
                        <option value="Absolute">Usar Valor Absoluto</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default MonetaryUnitSampling;
