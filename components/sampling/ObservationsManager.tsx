
import React, { useState, useEffect, useRef } from 'react';
import { SamplingMethod, AuditObservation, ObservationEvidence } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface Props {
    populationId: string;
    method: SamplingMethod;
    onObservationsUpdate: (obs: AuditObservation[]) => void;
}

const CURRENT_USER = "Auditor Principal"; 
const STORAGE_BUCKET = "evidencias_auditoria";

const ObservationsManager: React.FC<Props> = ({ populationId, method, onObservationsUpdate }) => {
    const [observations, setObservations] = useState<AuditObservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState<Partial<AuditObservation>>({
        titulo: '',
        descripcion: '',
        severidad: 'Medio',
        tipo: 'Sustantivo',
        evidencias: []
    });

    useEffect(() => {
        fetchObservations();
    }, [populationId, method]);

    const fetchObservations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('observaciones_auditoria')
                .select('*')
                .eq('id_poblacion', populationId)
                .eq('metodo', method)
                .order('fecha_creacion', { ascending: false });

            if (error) {
                console.error("Error Supabase Query:", error);
            } else if (data) {
                const formattedData = data.map(obs => ({
                    ...obs,
                    evidencias: Array.isArray(obs.evidencias) ? obs.evidencias : []
                }));
                setObservations(formattedData as AuditObservation[]);
                onObservationsUpdate(formattedData as AuditObservation[]);
            }
        } catch (err) {
            console.error("Error al cargar observaciones:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileExt = cleanFileName.split('.').pop();
            const uniqueName = `${Math.random().toString(36).substring(2, 10)}-${Date.now()}.${fileExt}`;
            const filePath = `${populationId}/${uniqueName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                const status = (uploadError as any).statusCode;
                
                if (status === "403" || (uploadError as any).message?.toLowerCase().includes("permission denied")) {
                    const errorMsg = `ERROR DE PERMISOS (RLS).\n\nPara solucionar esto rápido:\n1. Ve al "SQL Editor" de Supabase.\n2. Pega y corre este código:\n\nCREATE POLICY "Public Access" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = '${STORAGE_BUCKET}');`;
                    throw new Error(errorMsg);
                }
                
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);

            const nuevaEvidencia: ObservationEvidence = {
                nombre: file.name,
                url: urlData.publicUrl,
                tipo: file.type || 'application/octet-stream'
            };

            setFormData(prev => ({
                ...prev,
                evidencias: [...(prev.evidencias || []), nuevaEvidencia]
            }));

        } catch (err: any) {
            console.error("Error subida:", err);
            alert(err.message);
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeEvidence = (index: number) => {
        setFormData(prev => ({
            ...prev,
            evidencias: prev.evidencias?.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!formData.titulo || !formData.descripcion) {
            alert("Los campos Título y Descripción son obligatorios.");
            return;
        }

        setIsSaving(true);
        try {
            const finalEvidencias = Array.isArray(formData.evidencias) ? formData.evidencias : [];
            const payload = {
                titulo: formData.titulo,
                descripcion: formData.descripcion,
                severidad: formData.severidad,
                tipo: formData.tipo,
                evidencias: finalEvidencias
            };

            let responseError;
            if (editingId) {
                const { error } = await supabase.from('observaciones_auditoria').update(payload).eq('id', editingId);
                responseError = error;
            } else {
                const nuevaObservacion = {
                    ...payload,
                    id_poblacion: populationId,
                    metodo: method,
                    creado_por: CURRENT_USER 
                };
                const { error } = await supabase.from('observaciones_auditoria').insert(nuevaObservacion);
                responseError = error;
            }

            if (responseError) throw responseError;
            
            await fetchObservations();
            setIsAdding(false);
            setEditingId(null);
            setFormData({ titulo: '', descripcion: '', severidad: 'Medio', tipo: 'Sustantivo', evidencias: [] });
            
        } catch (err: any) {
            alert(`ERROR AL GUARDAR:\n\n${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Eliminar este hallazgo permanentemente?")) return;
        try {
            const { error } = await supabase.from('observaciones_auditoria').delete().eq('id', id);
            if (error) throw error;
            await fetchObservations();
        } catch (err: any) {
            alert("No se pudo eliminar.");
        }
    };

    const startEdit = (obs: AuditObservation) => {
        setEditingId(obs.id!);
        setFormData({
            titulo: obs.titulo,
            descripcion: obs.descripcion,
            severidad: obs.severidad,
            tipo: obs.tipo,
            evidencias: Array.isArray(obs.evidencias) ? [...obs.evidencias] : []
        });
        setIsAdding(false);
    };

    const getFileIcon = (tipo: string) => {
        if (tipo.includes('pdf')) return 'fa-file-pdf text-rose-500';
        if (tipo.includes('image')) return 'fa-file-image text-blue-500';
        if (tipo.includes('excel') || tipo.includes('spreadsheet') || tipo.includes('sheet')) return 'fa-file-excel text-emerald-600';
        return 'fa-file-alt text-slate-400';
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-cyan-400 shadow-xl ring-4 ring-slate-50">
                        <i className="fas fa-microscope text-xl"></i>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Expediente de Hallazgos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Control de Evidencia NIA 530</p>
                    </div>
                </div>
                {!isAdding && !editingId && (
                    <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all flex items-center">
                        <i className="fas fa-plus mr-2"></i> Documentar Observación
                    </button>
                )}
            </div>

            {(isAdding || editingId) && (
                <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-10 shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">
                            {editingId ? 'Modificar Registro' : 'Nueva Entrada de Papel de Trabajo'}
                        </h4>
                        <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500">
                            <i className="fas fa-times mr-1"></i> Cancelar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Título</label>
                            <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full px-6 py-4 rounded-2xl border-slate-200 bg-slate-50 text-xs font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Severidad</label>
                            <select value={formData.severidad} onChange={e => setFormData({...formData, severidad: e.target.value as any})} className="w-full px-6 py-4 rounded-2xl border-slate-200 bg-slate-50 text-xs font-black">
                                <option value="Bajo">Bajo</option>
                                <option value="Medio">Medio</option>
                                <option value="Alto">Alto</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Tipo</label>
                            <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})} className="w-full px-6 py-4 rounded-2xl border-slate-200 bg-slate-50 text-xs font-black">
                                <option value="Control">Control</option>
                                <option value="Sustantivo">Sustantivo</option>
                                <option value="Cumplimiento">Cumplimiento</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Descripción</label>
                        <textarea value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full px-6 py-6 rounded-[2rem] border-slate-200 bg-slate-50 text-xs font-medium min-h-[120px]" />
                    </div>

                    <div className="mb-10 p-8 bg-blue-50/40 border-2 border-dashed border-blue-200 rounded-[2rem]">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Evidencias</span>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="px-5 py-2.5 bg-white border border-blue-200 rounded-xl text-[9px] font-black uppercase text-blue-600">
                                {uploadingFile ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-cloud-upload-alt mr-2"></i>}
                                Adjuntar
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {formData.evidencias?.map((ev, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-blue-100 shadow-sm animate-fade-in">
                                    <div className="flex items-center overflow-hidden">
                                        <i className={`fas ${getFileIcon(ev.tipo)} mr-3 text-lg`}></i>
                                        <span className="text-[10px] font-bold truncate max-w-[150px]">{ev.nombre}</span>
                                    </div>
                                    <button onClick={() => removeEvidence(idx)} className="text-slate-300 hover:text-rose-500 transition-colors ml-4">
                                        <i className="fas fa-times-circle"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleSave} disabled={isSaving || uploadingFile} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all">
                        {isSaving ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-save mr-3 text-cyan-400"></i>}
                        Sincronizar Observación
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {loading ? (
                    <div className="text-center py-20"><i className="fas fa-circle-notch fa-spin text-4xl text-blue-200 mb-4"></i></div>
                ) : observations.length === 0 ? (
                    !isAdding && <div className="text-center py-24 border-4 border-dashed border-slate-50 rounded-[3rem] bg-slate-50/20 text-slate-300 font-black uppercase">Sin Hallazgos</div>
                ) : (
                    observations.map(obs => {
                        const severity = obs.severidad === 'Alto' ? 'rose' : obs.severidad === 'Medio' ? 'amber' : 'emerald';
                        return (
                            <div key={obs.id} className="relative bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 transition-all hover:shadow-xl group overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-2.5 bg-${severity}-500 opacity-20 group-hover:opacity-100`}></div>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-${severity}-50 text-${severity}-600 border border-${severity}-100`}>Severidad {obs.severidad}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">{obs.tipo}</span>
                                    </div>
                                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => startEdit(obs)} className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDelete(obs.id!)} className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center"><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                </div>
                                <h4 className="text-2xl font-black text-slate-800 mb-6">{obs.titulo}</h4>
                                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-8"><p className="text-[13px] text-slate-600 italic">"{obs.descripcion}"</p></div>
                                {Array.isArray(obs.evidencias) && obs.evidencias.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                        {obs.evidencias.map((ev, idx) => (
                                            <a key={idx} href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center bg-white px-5 py-4 rounded-2xl border border-slate-200 hover:bg-blue-600 hover:text-white transition-all group/file shadow-sm">
                                                <i className={`fas ${getFileIcon(ev.tipo)} text-2xl mr-4`}></i>
                                                <span className="text-[11px] font-black truncate">{ev.nombre}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                                <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase">
                                    <span>{obs.creado_por}</span>
                                    <span>{obs.fecha_creacion ? new Date(obs.fecha_creacion).toLocaleDateString() : ''}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ObservationsManager;
