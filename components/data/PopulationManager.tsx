
import React, { useState, useEffect } from 'react';
import { AuditPopulation } from '../../types';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';

interface Props {
    onPopulationSelected: (population: AuditPopulation) => void;
    onAddNew: () => void;
}

const PopulationManager: React.FC<Props> = ({ onPopulationSelected, onAddNew }) => {
    const [populations, setPopulations] = useState<AuditPopulation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPopulations();
    }, []);

    const fetchPopulations = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: sbError } = await supabase
                .from('audit_populations')
                .select('*')
                .order('created_at', { ascending: false });

            if (sbError) {
                console.error('Error fetching populations:', sbError);
                
                // Extraer mensaje de error de forma segura para evitar [object Object]
                const errorMessage = sbError.message || 
                                    (typeof sbError === 'object' ? JSON.stringify(sbError) : String(sbError));
                
                // Manejo específico de tablas no creadas (error común post-despliegue)
                if (sbError.code === '42P01') {
                    setError('Estructura faltante: La tabla "audit_populations" no existe en su base de datos. Por favor, cree las tablas usando el SQL Editor en el panel de Supabase.');
                } else if (sbError.code === 'PGRST301' || sbError.code === '401') {
                    setError('Error de Autenticación: La API Key de Supabase es inválida o ha expirado. Revise sus variables de entorno en Vercel.');
                } else {
                    setError(`Error de Supabase: ${errorMessage} (Código: ${sbError.code || 'N/A'}). ${sbError.hint || ''}`);
                }
            } else {
                setPopulations((data as AuditPopulation[]) || []);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            // Manejo defensivo de excepciones inesperadas
            const msg = err instanceof Error ? err.message : 
                        (typeof err === 'object' ? JSON.stringify(err) : String(err));
            setError(`Error inesperado del sistema: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, fileName: string) => {
        if (!window.confirm(`¿Está seguro que desea eliminar la población "${fileName}"?\n\nEsta acción eliminará permanentemente los datos y el historial asociado. Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const { error: deleteError } = await supabase
                .from('audit_populations')
                .delete()
                .eq('id', id);

            if (deleteError) {
                const errorMsg = deleteError.message || JSON.stringify(deleteError);
                throw new Error(errorMsg);
            }
            
            setPopulations(prev => prev.filter(p => p.id !== id));
            
        } catch (err: any) {
            console.error("Error deleting:", err);
            alert("Error al eliminar el registro: " + (err.message || "Error desconocido"));
        }
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'validado':
                return <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">Validado</span>;
            case 'pendiente_validacion':
                return <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">Pendiente</span>;
            default:
                return <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wide">{status}</span>;
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gestor de Poblaciones</h2>
                    <p className="text-slate-500 mt-1 text-lg">Seleccione un universo de datos o cargue un nuevo archivo para auditar.</p>
                </div>
                <button 
                    onClick={onAddNew} 
                    className="group relative inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 uppercase tracking-wide"
                >
                    <i className="fas fa-cloud-upload-alt mr-2 text-lg group-hover:animate-bounce"></i>
                    Cargar Nueva Población
                </button>
            </div>

            <Card className="border-t-4 border-t-blue-500">
                {loading && (
                     <div className="flex justify-center items-center h-48">
                         <div className="flex flex-col items-center">
                             <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                             <p className="text-slate-500 font-medium">Sincronizando datos...</p>
                         </div>
                     </div>
                )}
                {error && (
                    <div className="p-6 bg-red-50 rounded-lg border border-red-200 flex items-start text-red-700 mb-4 animate-fade-in">
                        <i className="fas fa-exclamation-triangle text-2xl mr-4 mt-1"></i>
                        <div className="flex-1">
                            <p className="font-bold text-red-800">Error de Conexión Detectado</p>
                            <div className="text-sm mt-1 bg-white/50 p-2 rounded border border-red-100 font-mono">
                                {error}
                            </div>
                            <div className="mt-4 flex space-x-4">
                                <button 
                                    onClick={fetchPopulations} 
                                    className="text-xs font-bold uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
                                >
                                    Reintentar conexión
                                </button>
                                <a 
                                    href="https://supabase.com/dashboard" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-xs font-bold uppercase tracking-widest text-red-600 hover:underline flex items-center"
                                >
                                    Ir a Supabase <i className="fas fa-external-link-alt ml-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && !error && populations.length === 0 && (
                     <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                            <i className="fas fa-folder-open text-3xl text-slate-300"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">No hay poblaciones disponibles</h3>
                        <p className="text-slate-500 mt-2 mb-6 max-w-sm mx-auto">Comience cargando un archivo Excel o CSV para realizar su primer muestreo.</p>
                        <button onClick={onAddNew} className="text-blue-600 font-bold hover:text-blue-800 hover:underline">
                            Cargar mi primer archivo
                        </button>
                     </div>
                )}
                {!loading && !error && populations.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nombre del Archivo</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Registros (N)</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Valor Total</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha Carga</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Estado</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {populations.map(pop => (
                                    <tr key={pop.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                                                    <i className="fas fa-file-excel"></i>
                                                </div>
                                                <div className="text-sm font-bold text-slate-700">{pop.file_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">{pop.row_count.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 font-bold">${pop.total_monetary_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(pop.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(pop.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button 
                                                    onClick={() => handleDelete(pop.id, pop.file_name)}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs font-bold text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all uppercase tracking-wider"
                                                    title="Eliminar Población"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => onPopulationSelected(pop)} 
                                                    disabled={pop.status !== 'validado' && pop.status !== 'pendiente_validacion'}
                                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                                                >
                                                    Seleccionar
                                                    <i className="fas fa-chevron-right ml-2"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PopulationManager;
