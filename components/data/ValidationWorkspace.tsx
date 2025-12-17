
import React, { useState, useEffect } from 'react';
import { AuditPopulation } from '../../types';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';


interface Props {
    populationId: string;
    onValidationComplete: (population: AuditPopulation) => void;
    onCancel: () => void;
}

const ValidationWorkspace: React.FC<Props> = ({ populationId, onValidationComplete, onCancel }) => {
    const [population, setPopulation] = useState<AuditPopulation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para datos cualitativos (Atributos)
    const [categoryChartData, setCategoryChartData] = useState<any[]>([]);
    const [uniqueCatCount, setUniqueCatCount] = useState(0);
    const [uniqueSubCatCount, setUniqueSubCatCount] = useState(0);

    useEffect(() => {
        const fetchPopulationAndData = async () => {
            setLoading(true);
            setError(null);
            
            // 1. Fetch Population Metadata
            const { data: popData, error: popError } = await supabase
                .from('audit_populations')
                .select('*')
                .eq('id', populationId)
                .single();

            if (popError || !popData) {
                console.error('Error fetching population:', popError);
                setError('No se pudo cargar la población para validación.');
                setLoading(false);
                return;
            }

            const pop = popData as AuditPopulation;
            setPopulation(pop);

            // 2. Si es Muestreo de Atributos (Total Value = 0), calcular frecuencias
            if (pop.total_monetary_value === 0) {
                const { data: rows, error: rowError } = await supabase
                    .from('audit_data_rows')
                    .select('raw_json')
                    .eq('population_id', populationId);

                if (!rowError && rows) {
                    const catField = pop.column_mapping.category;
                    const subField = pop.column_mapping.subcategory;
                    
                    const catCounts: Record<string, number> = {};
                    const subCounts: Set<string> = new Set();

                    rows.forEach(row => {
                        const raw = row.raw_json as any;
                        
                        // Count Categories
                        if (catField) {
                            const val = String(raw[catField] || 'Sin Categoría');
                            catCounts[val] = (catCounts[val] || 0) + 1;
                        }

                        // Count Unique Subcategories
                        if (subField) {
                            const val = String(raw[subField] || 'N/A');
                            subCounts.add(val);
                        }
                    });

                    // Prepare Chart Data (Top 10 Categories)
                    const sortedCats = Object.entries(catCounts)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 10); // Limit to top 10 for visibility

                    setCategoryChartData(sortedCats);
                    setUniqueCatCount(Object.keys(catCounts).length);
                    setUniqueSubCatCount(subCounts.size);
                }
            }

            setLoading(false);
        };

        fetchPopulationAndData();
    }, [populationId]);

    const handleValidation = async () => {
        if (!population) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('audit_populations')
            .update({ status: 'validado' })
            .eq('id', population.id)
            .select()
            .single();
        
        if (error) {
            setError('Falló la actualización del estado de la población.');
            console.error(error);
        } else {
            onValidationComplete(data as AuditPopulation);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                 <div className="flex flex-col items-center">
                     <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                     <p className="text-slate-500 font-bold">Analizando datos y calculando cuadratura...</p>
                 </div>
            </div>
        );
    }

    if (error) return <div className="text-center p-10 text-red-500 font-bold">{error}</div>;
    if (!population) return <div className="text-center p-10 font-bold">No se encontró la población.</div>;

    const stats = population.descriptive_stats;
    const isAttributeOnly = population.total_monetary_value === 0;

    // --- Configuración de Gráfico ---
    // Si es monetario: Histograma de valores (simulado con stats min/max/avg para visualización simple)
    const monetaryChartData = [
        { name: 'Estadísticas', Mínimo: stats.min, Promedio: stats.avg, Máximo: stats.max }
    ];

    return (
        <div className="animate-fade-in pb-10">
            <div className="mb-6 flex justify-between items-end">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Validación de Cuadratura</h2>
                    <p className="text-slate-500 mt-1">Confirme que la integridad y distribución de los datos sean correctas.</p>
                 </div>
                 <button onClick={onCancel} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center uppercase tracking-wide">
                    <i className="fas fa-times mr-2"></i>Cancelar
                </button>
            </div>
            
            <Card title={`Resumen de Carga: ${population.file_name}`}>
                 
                 {/* --- KPI CARDS --- */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-10">
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-3xl font-extrabold text-slate-800">{population.row_count.toLocaleString()}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Registros Totales</div>
                    </div>

                    {isAttributeOnly ? (
                        // KPI CARDS PARA ATRIBUTOS
                        <>
                             <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 text-blue-200 opacity-20"><i className="fas fa-list-ul text-5xl"></i></div>
                                <div className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-1">Tipo de Datos</div>
                                <div className="text-xl font-extrabold text-blue-600">Solo Atributos</div>
                                <div className="text-[10px] text-blue-400 font-bold mt-1">(Sin Montos)</div>
                            </div>
                             <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm">
                                <div className="text-3xl font-extrabold text-indigo-600">{uniqueCatCount}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {population.column_mapping.category ? 'Categorías (Var 1)' : 'Var 1 No Mapeada'}
                                </div>
                            </div>
                             <div className="p-6 bg-purple-50 rounded-xl border border-purple-200 shadow-sm">
                                <div className="text-3xl font-extrabold text-purple-600">{uniqueSubCatCount}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {population.column_mapping.subcategory ? 'Subcat. (Var 2)' : 'Var 2 No Mapeada'}
                                </div>
                            </div>
                        </>
                    ) : (
                        // KPI CARDS PARA MONETARIO (Original)
                        <>
                             <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                                <div className="text-2xl font-bold text-emerald-600">${stats.sum.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Valor Total</div>
                            </div>
                             <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-2xl font-bold text-slate-600">${stats.min.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Valor Mínimo</div>
                            </div>
                             <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-2xl font-bold text-slate-600">${stats.max.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Valor Máximo</div>
                            </div>
                        </>
                    )}
                </div>

                {/* --- CHART SECTION --- */}
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center">
                    <i className={`fas ${isAttributeOnly ? 'fa-chart-bar' : 'fa-chart-line'} mr-2 text-blue-500`}></i>
                    {isAttributeOnly ? 'Conteo por Variable Categórica (Top 10)' : 'Distribución de Valores Monetarios'}
                </h3>
                
                {/* Se agrega minWidth y se asegura display block para ResponsiveContainer */}
                <div style={{width: '100%', minWidth: '300px', height: 350, display: 'block'}} className="bg-white rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        {isAttributeOnly ? (
                            // CHART DE ATRIBUTOS (Frecuencia de Categorías)
                            categoryChartData.length > 0 ? (
                                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={150} 
                                        tick={{fill: '#475569', fontSize: 11, fontWeight: 'bold'}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        cursor={{fill: '#f1f5f9'}}
                                        formatter={(value: number) => [`${value} registros`, 'Frecuencia']}
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                                    />
                                    <Bar dataKey="value" name="Registros" radius={[0, 4, 4, 0]} barSize={20}>
                                        {categoryChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                    <i className="fas fa-chart-bar text-4xl mb-3 opacity-50"></i>
                                    <p className="font-semibold">No hay variables categóricas mapeadas para visualizar.</p>
                                    <p className="text-xs mt-1">Asegúrese de mapear 'Categoría Principal' en el paso anterior.</p>
                                </div>
                            )
                        ) : (
                            // CHART MONETARIO (Valores)
                            <BarChart data={monetaryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} />
                                <YAxis tickFormatter={(value) => `$${Number(value).toLocaleString()}`} tick={{fill: '#64748b'}} axisLine={false} />
                                <Tooltip 
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Valor']}
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                                />
                                <Legend />
                                <Bar dataKey="Mínimo" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={60} />
                                <Bar dataKey="Promedio" fill="#10b981" radius={[4, 4, 0, 0]} barSize={60} />
                                <Bar dataKey="Máximo" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={60} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>

                <div className="mt-10 border-t border-slate-100 pt-6 flex justify-end">
                    <button 
                        onClick={handleValidation}
                        disabled={loading}
                        className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-check-double mr-2"></i>}
                        {loading ? 'Procesando...' : 'Confirmar Integridad y Continuar'}
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default ValidationWorkspace;
