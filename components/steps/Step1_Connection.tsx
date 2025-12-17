
import React, { useState } from 'react';
import { AppState } from '../../types';
import Card from '../ui/Card';
import { SUPABASE_CONFIG } from '../../config';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT } from '../../constants';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    onSave: () => void;
}

const Step1Connection: React.FC<Props> = ({ appState, setAppState, onSave }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAppState(prev => ({
            ...prev,
            connection: {
                ...prev.connection,
                [e.target.name]: e.target.value
            }
        }));
    };
    
    const handleValidateAndSave = async () => {
        setIsLoading(true);
        setError('');

        const { table, idColumn, valueColumn } = appState.connection;
        if (!table || !idColumn || !valueColumn) {
            setError('Todos los campos de configuración de la tabla son obligatorios.');
            setIsLoading(false);
            return;
        }

        const { url, apiKey } = SUPABASE_CONFIG;
        const supabaseUrl = `${url}/rest/v1/${table}?select=*&limit=1`;

        try {
            const response = await fetch(supabaseUrl, {
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Error de autenticación. Verifique credenciales del sistema.');
                }
                if (response.status === 404) {
                    throw new Error(`La tabla '${table}' no fue encontrada en el origen de datos.`);
                }
                throw new Error(`Error de conexión (Status: ${response.status}). Contacte a soporte.`);
            }

            const data = await response.json();
            
            if (data.length === 0) {
                setError('La tabla existe pero no contiene registros para validar la estructura.');
                setIsLoading(false);
                return;
            }

            const firstRow = data[0];
            if (!firstRow.hasOwnProperty(idColumn)) {
                throw new Error(`Columna ID '${idColumn}' no encontrada en la estructura de la tabla.`);
            }
            if (!firstRow.hasOwnProperty(valueColumn)) {
                 throw new Error(`Columna Valor '${valueColumn}' no encontrada en la estructura de la tabla.`);
            }

            setAppState(prev => ({
                ...prev,
                connection: { 
                    ...prev.connection, 
                    validated: true, 
                    user: SUPABASE_CONFIG.user, 
                    url: SUPABASE_CONFIG.url,
                    password: '•••' 
                }
            }));
            onSave();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Conexión de Datos</h2>
                    <p className="text-slate-500 mt-2 text-lg">Configuración y mapeo del origen de datos para la auditoría.</p>
                </div>
                <button 
                    onClick={onSave} 
                    className="mt-4 md:mt-0 text-sm font-semibold text-slate-500 hover:text-blue-700 transition-colors uppercase tracking-wider flex items-center group"
                >
                    <i className="fas fa-arrow-left mr-2 transform group-hover:-translate-x-1 transition-transform"></i>
                    Volver al Panel
                </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Server Status Panel */}
                <div className="bg-slate-900 p-8 relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-cyan-500 rounded-full blur-3xl opacity-10"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="flex items-center mb-4 md:mb-0">
                            <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shadow-lg mr-4">
                                <i className="fas fa-server text-xl"></i>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Servidor de Auditoría</h4>
                                <div className="flex items-center space-x-3 mt-1">
                                    <span className="flex items-center text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                        <i className="fas fa-circle text-[8px] text-green-400 mr-2 animate-pulse"></i>
                                        Conectado
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
                                        {SUPABASE_CONFIG.url.replace('https://', '')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Usuario Activo</p>
                            <p className="text-white font-mono bg-slate-800 px-3 py-1 rounded border border-slate-700">
                                <i className="fas fa-user-shield mr-2 text-blue-400"></i>
                                {SUPABASE_CONFIG.user}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="p-8 md:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        {/* Left Column: Instructions */}
                        <div className="md:col-span-2 mb-2">
                             <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                                Mapeo de Entidad
                             </h3>
                        </div>

                        {/* Table Input */}
                        <div className="group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                Nombre de Tabla / Vista
                                <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.tablaVista.title} content={ASSISTANT_CONTENT.tablaVista.content} /></span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-table text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                                </div>
                                <input 
                                    type="text" 
                                    name="table" 
                                    value={appState.connection.table} 
                                    onChange={handleChange} 
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm bg-slate-50 focus:bg-white text-slate-700 font-medium placeholder-slate-400" 
                                    placeholder="Ej. libro_mayor_2024" 
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-400">Nombre exacto de la tabla en la base de datos.</p>
                        </div>

                        {/* Spacer for layout balance if needed, or spans full width */}
                        <div className="hidden md:block"></div>

                        {/* ID Column Input */}
                        <div className="group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                Columna Identificador (PK)
                                <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.columnaId.title} content={ASSISTANT_CONTENT.columnaId.content} /></span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-fingerprint text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                                </div>
                                <input 
                                    type="text" 
                                    name="idColumn" 
                                    value={appState.connection.idColumn} 
                                    onChange={handleChange} 
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm bg-slate-50 focus:bg-white text-slate-700 font-medium placeholder-slate-400" 
                                    placeholder="Ej. id_transaccion" 
                                />
                            </div>
                        </div>

                        {/* Value Column Input */}
                        <div className="group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                Columna Valor Monetario
                                <span className="ml-2"><InfoHelper title={ASSISTANT_CONTENT.columnaValor.title} content={ASSISTANT_CONTENT.columnaValor.content} /></span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-coins text-slate-400 group-focus-within:text-amber-500 transition-colors"></i>
                                </div>
                                <input 
                                    type="text" 
                                    name="valueColumn" 
                                    value={appState.connection.valueColumn} 
                                    onChange={handleChange} 
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm bg-slate-50 focus:bg-white text-slate-700 font-medium placeholder-slate-400" 
                                    placeholder="Ej. monto_total" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md animate-pulse">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <i className="fas fa-exclamation-circle text-red-500"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Actions */}
                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end items-center space-x-4">
                         <button 
                            onClick={onSave} 
                            className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleValidateAndSave} 
                            disabled={isLoading} 
                            className="relative overflow-hidden group px-8 py-3 rounded-lg bg-gradient-to-r from-blue-700 to-slate-800 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10 flex items-center">
                                {isLoading ? (
                                   <>
                                   <i className="fas fa-circle-notch fa-spin mr-2"></i>
                                   Verificando...
                                   </>
                                ) : (
                                   <>
                                   <i className="fas fa-check-circle mr-2 text-cyan-400 group-hover:text-white transition-colors"></i>
                                   Validar y Guardar
                                   </>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Step1Connection;
