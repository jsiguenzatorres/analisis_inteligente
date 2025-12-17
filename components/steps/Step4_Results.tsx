
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, AuditFinding, ObservationType, SamplingMethod } from '../../types';
import RiskChart from '../reporting/RiskChart';
import Modal from '../ui/Modal';
import { RichInfoCard } from '../ui/RichInfoCard';
import { ASSISTANT_CONTENT } from '../../constants';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { expandAuditSample, calculateStopOrGoExpansion } from '../../services/statisticalService';
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea, Label
} from 'recharts';

interface Props {
    appState: AppState;
    onBack: () => void;
    onRestart: () => void;
}

const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Paleta de colores para las Barras (Categorías)
const BAR_COLORS: {[key: string]: string} = {
    'Outlier': '#7c3aed', 
    'Redondeo': '#0891b2', 
    'Duplicado': '#ea580c', 
    'Benford': '#2563eb', 
    'Juicio del Auditor': '#475569',
    'Elemento Clave': '#b91c1c', 
    'Alto Valor': '#c2410c',
    'Aleatorio': '#64748b'
};

const Step4Results: React.FC<Props> = ({ appState, onBack, onRestart }) => {
    
    if (!appState.results) return null;

    const { results, generalParams, samplingMethod, samplingParams, selectedPopulation } = appState;
    const [currentResults, setCurrentResults] = useState(results);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    
    const isStratified = samplingMethod === SamplingMethod.Stratified;
    const isNonStatistical = samplingMethod === SamplingMethod.NonStatistical;

    const chartRef = useRef<HTMLDivElement>(null);

    // --- CÁLCULOS PARA DOMINIOS DE GRÁFICOS (Necesarios para colorear burbujas) ---
    const maxFreqCalc = useMemo(() => {
        if (!isNonStatistical) return 10;
        const counts: Record<string, number> = {};
        currentResults.sample.forEach(item => {
            const factors = item.risk_factors || [item.risk_flag || 'General'];
            factors.forEach(f => counts[f] = (counts[f] || 0) + 1);
        });
        return Math.max(...Object.values(counts), 5) * 1.2;
    }, [currentResults, isNonStatistical]);

    const maxSevCalc = useMemo(() => {
        if (!isNonStatistical) return 5;
        let maxS = 0;
        currentResults.sample.forEach(item => {
            if(item.risk_score && item.risk_score > maxS) maxS = item.risk_score;
        });
        return Math.max(maxS, 3) * 1.2;
    }, [currentResults, isNonStatistical]);

    const midFreq = maxFreqCalc / 2;
    const midSev = maxSevCalc / 2;

    // --- ADVANCED RISK METRICS CALCULATION ---
    const advancedRiskMetrics = useMemo(() => {
        if (!isNonStatistical) return [];

        const factorMap: Record<string, { count: number, totalScore: number, maxScore: number }> = {};

        currentResults.sample.forEach(item => {
            const factors = item.risk_factors || [item.risk_flag || 'General'];
            const itemScore = item.risk_score || 1; 
            
            factors.forEach(f => {
                if (!factorMap[f]) {
                    factorMap[f] = { count: 0, totalScore: 0, maxScore: 0 };
                }
                factorMap[f].count += 1;
                factorMap[f].totalScore += itemScore;
                factorMap[f].maxScore = Math.max(factorMap[f].maxScore, itemScore);
            });
        });

        return Object.entries(factorMap).map(([name, data]) => {
            const avgSeverity = parseFloat((data.totalScore / data.count).toFixed(2));
            const totalImpact = data.totalScore;
            
            let bubbleColor = '#94a3b8'; 

            if (avgSeverity >= midSev) {
                if (data.count >= midFreq) {
                    bubbleColor = totalImpact > 50 ? '#b91c1c' : '#ef4444'; 
                } else {
                    bubbleColor = totalImpact > 20 ? '#c2410c' : '#f97316';
                }
            } else {
                if (data.count >= midFreq) {
                    bubbleColor = '#eab308';
                } else {
                    bubbleColor = '#3b82f6';
                }
            }

            return {
                name,
                frequency: data.count,
                avgSeverity,
                totalImpact,
                color: bubbleColor 
            };
        }).sort((a, b) => b.totalImpact - a.totalImpact);

    }, [currentResults, isNonStatistical, midFreq, midSev]);

    // --- ESTADOS PARA SECUENCIAL (STOP-OR-GO) ---
    const isSequential = samplingMethod === SamplingMethod.Attribute && samplingParams.attribute.useSequential;
    const [deviationsInput, setDeviationsInput] = useState<string>('0');
    const [sequentialStage, setSequentialStage] = useState<number>(1);
    const [calculatedExpansion, setCalculatedExpansion] = useState<{amount: number, justification: string}>({ amount: 0, justification: '' });
    const [manualExpansionOverride, setManualExpansionOverride] = useState<string>('');
    // Updated state to include new modal keys
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [insightFilter, setInsightFilter] = useState<string | null>(null);

    useEffect(() => {
        if (!isSequential) return;
        const errors = parseInt(deviationsInput) || 0;
        const currentSize = currentResults.sampleSize;
        const { NC, ET } = samplingParams.attribute;
        const suggestion = calculateStopOrGoExpansion(currentSize, errors, NC, ET);
        setCalculatedExpansion({ amount: suggestion.recommendedExpansion, justification: suggestion.justification });
        setManualExpansionOverride(suggestion.recommendedExpansion.toString());
    }, [deviationsInput, currentResults.sampleSize, samplingParams.attribute, isSequential]);

    const handleRequestExpansion = () => setActiveModal('sequentialExpansion');
    const confirmExpansion = async () => {
        const incrementalSize = parseInt(manualExpansionOverride) || calculatedExpansion.amount;
        if (incrementalSize <= 0) return;
        const newResults = expandAuditSample(currentResults, incrementalSize, generalParams.seed);
        setCurrentResults(newResults);
        setSequentialStage(prev => prev + 1);
        setDeviationsInput('0'); 
        setActiveModal(null); 
    };

    // --- HELPER: GENERATE INTERPRETATION STRING FOR PDF ---
    const generateInterpretationString = () => {
        if (isNonStatistical) {
            if (advancedRiskMetrics.length === 0) return "No hay suficientes datos para generar una interpretación de riesgos.";
            const dominant = advancedRiskMetrics[0];
            const others = advancedRiskMetrics.slice(1).map(m => m.name).join(', ');
            return `El análisis de inteligencia de riesgos identifica a "${dominant.name}" como el vector predominante con un impacto ponderado de ${dominant.totalImpact.toFixed(1)} (Frecuencia: ${dominant.frequency}). Factores secundarios: ${others}.`;
        } else {
            // Statistical Interpretation
            if (samplingMethod === 'attribute') {
                return `Con un nivel de confianza del ${samplingParams.attribute.NC}%, la muestra de ${currentResults.sampleSize} ítems permite validar si la tasa de desviación excede el ${samplingParams.attribute.ET}%.`;
            } else if (samplingMethod === 'mus') {
                return `Muestreo MUS diseñado para detectar sobrestimaciones con un Riesgo de Aceptación Incorrecta del ${samplingParams.mus.RIA}%. Intervalo de selección: $${formatMoney(samplingParams.mus.V / currentResults.sampleSize)}.`;
            } else if (samplingMethod === 'cav') {
                return `Muestreo de Variables Clásicas basado en una distribución normal (Sigma estimada: ${samplingParams.cav.sigma}). Diseñado para proyectar el valor total auditado.`;
            }
        }
        return "Resultados generados conforme a los parámetros establecidos.";
    };

    // --- REPORT GENERATION (REBUILT & ENHANCED) ---
    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        await new Promise(resolve => setTimeout(resolve, 300)); 

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            
            // --- 1. HEADER (Con Hash de Seguridad) ---
            doc.setFillColor(30, 41, 59); // Slate 900
            doc.rect(0, 0, pageWidth, 45, 'F'); // Taller header
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("Papel de Trabajo: Selección de Muestra", 14, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generado por AAMA v3.0 | Auditoría Interna`, 14, 30);
            doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 14, 30, { align: 'right' });
            
            // SECURITY HASH
            const integrityHash = selectedPopulation?.integrity_hash || 'HASH-NO-DISPONIBLE';
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate 400
            doc.text(`Integrity Hash: ${integrityHash}`, 14, 40);

            // --- 2. SUMMARY INFO ---
            let currentY = 55;
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("Resumen de la Población y Muestra", 14, currentY);
            
            currentY += 8;
            autoTable(doc, {
                startY: currentY,
                head: [['Parámetro', 'Detalle']],
                body: [
                    ['Archivo Fuente', selectedPopulation?.file_name || 'N/A'],
                    ['Objetivo', generalParams.objective || 'No definido'],
                    ['Método de Muestreo', samplingMethod.toUpperCase()],
                    ['Semilla (Trazabilidad)', generalParams.seed],
                    ['Tamaño Población (N)', selectedPopulation?.row_count.toLocaleString()],
                    ['Valor Total Población', `$${formatMoney(selectedPopulation?.total_monetary_value || 0)}`],
                    ['Tamaño Muestra (n)', currentResults.sampleSize],
                ],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }, // Blue 500
                styles: { fontSize: 9 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
            });

            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 15;

            // --- 3. PARÁMETROS ESPECÍFICOS (Dynamic Section) ---
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Parámetros Específicos: ${samplingMethod === 'non_statistical' ? 'Muestreo No Estadístico / Juicio' : samplingMethod.toUpperCase()}`, 14, currentY);
            currentY += 8;

            let paramRows: any[] = [];
            if (samplingMethod === SamplingMethod.MUS) {
                paramRows = [
                    ['Error Tolerable (TE)', `$${formatMoney(samplingParams.mus.TE)}`],
                    ['Errores Esperados (EE)', `$${formatMoney(samplingParams.mus.EE)}`],
                    ['Riesgo Aceptación (RIA)', `${samplingParams.mus.RIA}%`],
                    ['Optimización Estrato Superior', samplingParams.mus.optimizeTopStratum ? 'Activado' : 'Desactivado'],
                    ['Tratamiento Negativos', samplingParams.mus.handleNegatives]
                ];
            } else if (samplingMethod === SamplingMethod.Attribute) {
                paramRows = [
                    ['Nivel de Confianza (NC)', `${samplingParams.attribute.NC}%`],
                    ['Tasa Desviación Tolerable (ET)', `${samplingParams.attribute.ET}%`],
                    ['Tasa Desviación Esperada (PE)', `${samplingParams.attribute.PE}%`],
                    ['Muestreo Secuencial', samplingParams.attribute.useSequential ? 'Activado (Stop-or-Go)' : 'Desactivado']
                ];
                if (samplingParams.attribute.useSequential) {
                    paramRows.push(['Etapa Secuencial Actual', `Etapa ${sequentialStage}`]);
                }
            } else if (samplingMethod === SamplingMethod.NonStatistical) {
                paramRows = [
                    ['Estrategia de Riesgo', samplingParams.nonStatistical.suggestedRisk || 'Manual'],
                    ['Criterio de Selección', samplingParams.nonStatistical.criteria],
                    ['Justificación Técnica', samplingParams.nonStatistical.justification],
                ];
            } else if (samplingMethod === SamplingMethod.CAV) {
                paramRows = [
                    ['Desviación Estándar (Sigma)', samplingParams.cav.usePilotSample ? `Auto (Piloto): ${samplingParams.cav.sigma}` : samplingParams.cav.sigma],
                    ['Técnica de Estimación', samplingParams.cav.estimationTechnique],
                    ['Estratificación', samplingParams.cav.stratification ? 'Obligatoria Activada' : 'Desactivada']
                ];
            } else if (samplingMethod === SamplingMethod.Stratified) {
                 paramRows = [
                    ['Base de Estratificación', samplingParams.stratified.basis],
                    ['Cantidad de Estratos', samplingParams.stratified.strataCount],
                    ['Método Asignación', samplingParams.stratified.allocationMethod],
                    ['Umbral Certeza', `$${formatMoney(samplingParams.stratified.certaintyStratumThreshold)}`]
                ];
            }

            autoTable(doc, {
                startY: currentY,
                head: [['Parámetro Técnico', 'Valor Configurado']],
                body: paramRows,
                theme: 'grid',
                headStyles: { fillColor: [71, 85, 105] }, // Slate 600
                styles: { fontSize: 9, cellWidth: 'wrap' },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } }
            });

            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 15;

            // --- 4. RESULTADOS DEL MUESTREO (Visual + Interpretación) ---
            if (currentY + 80 > doc.internal.pageSize.height) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(22, 163, 74); // Green 700 (Distinctive Section)
            doc.text("Resultados del Muestreo", 14, currentY);
            currentY += 8;

            // Interpretación Inteligente Block
            doc.setFillColor(240, 253, 244); // Green 50
            doc.setDrawColor(22, 163, 74); // Green 600
            doc.rect(14, currentY, pageWidth - 28, 25, 'FD');
            
            doc.setFontSize(10);
            doc.setTextColor(22, 69, 30); // Dark Green
            const interpretationText = generateInterpretationString();
            const splitInterp = doc.splitTextToSize(interpretationText, pageWidth - 35);
            doc.text(splitInterp, 18, currentY + 7);
            
            // Add Sequential Results Info if applicable
            if (isSequential && calculatedExpansion.amount > 0) {
                 doc.setFont('helvetica', 'bold');
                 doc.text(`Alerta Secuencial: ${calculatedExpansion.justification}`, 18, currentY + 20);
            }

            currentY += 30;

            // Gráficos (Screenshots)
            if (chartRef.current) {
                const canvas = await html2canvas(chartRef.current, { scale: 1.5 });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (currentY + imgHeight > doc.internal.pageSize.height) {
                    doc.addPage();
                    currentY = 20;
                }
                
                doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
            }

            // --- 5. METHODOLOGY NOTES ---
            if (currentResults.methodologyNotes && currentResults.methodologyNotes.length > 0) {
                 if (currentY + 30 > doc.internal.pageSize.height) {
                    doc.addPage();
                    currentY = 20;
                }
                
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139); // Slate 500
                doc.setFont('helvetica', 'italic');
                currentResults.methodologyNotes.forEach(note => {
                    doc.text(`* ${note}`, 14, currentY);
                    currentY += 5;
                });
                currentY += 5;
            }

            // --- 6. SAMPLE DETAIL TABLE ---
            doc.addPage();
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text("Detalle de la Muestra Seleccionada", 14, 20);

            const tableRows = currentResults.sample.map((item, i) => {
                let riskLabel = item.risk_factors?.join(', ') || item.risk_flag || item.stratum_label || '';
                // Add Fire Emoji for PDF text if critical
                if (item.risk_score && item.risk_score >= 3 || riskLabel.includes('Significativa')) {
                    riskLabel = `🔥 ${riskLabel}`;
                }
                return [
                    (i+1).toString(), 
                    String(item.id), 
                    `$${formatMoney(item.value)}`,
                    riskLabel,
                    item.risk_score ? item.risk_score.toString() : '-',
                    item.risk_justification || ''
                ];
            });

            autoTable(doc, {
                startY: 25,
                head: [['#', 'ID', 'Valor', 'Etiqueta / Riesgo', 'Score', 'Justificación']],
                body: tableRows,
                styles: { fontSize: 8, overflow: 'linebreak' },
                columnStyles: {
                    1: { cellWidth: 30 }, // ID
                    5: { cellWidth: 50 }  // Justification
                },
                didParseCell: function(data) {
                    // Highlight High Risk Rows (Including CAV Significant Deviation)
                    if (data.section === 'body') {
                         const riskLabel = data.row.raw[3] as string; // 'Etiqueta / Riesgo' col index
                         const score = parseFloat(data.row.raw[4] as string);
                         
                         if (score >= 3 || riskLabel.includes('Significativa') || riskLabel.includes('Crítico')) {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                            data.cell.styles.fontStyle = 'bold';
                         }
                    }
                }
            });

            doc.save(`AAMA_Informe_${samplingMethod}_${generalParams.seed}.pdf`);

        } catch (e) { 
            console.error("Error generating PDF:", e);
            alert("Error generando el informe PDF. Por favor intente nuevamente.");
        } 
        finally { setIsGeneratingReport(false); }
    };

    // --- EXPORT EXCEL ---
    const handleExportExcel = (customData?: any[], fileNamePrefix: string = 'Muestra') => {
        const dataToExport = customData || currentResults.sample;
        const detailData = dataToExport.map((item, idx) => ({
            'No.': idx + 1,
            'ID Único': item.id,
            'Valor Registrado': item.value,
            'Factores de Riesgo': item.risk_factors ? item.risk_factors.join(', ') : item.risk_flag,
            'Score Riesgo': item.risk_score || 'N/A',
            'Justificación': item.risk_justification
        }));
        const wb = utils.book_new();
        const wsDetail = utils.json_to_sheet(detailData);
        utils.book_append_sheet(wb, wsDetail, "Detalle");
        writeFile(wb, `${fileNamePrefix}_${generalParams.seed}.xlsx`);
    };

    const renderSequentialConsole = () => isSequential ? (
       <div className="mb-8 bg-white rounded-xl shadow p-4 border border-blue-200">
           <h3 className="font-bold text-blue-900">Consola Secuencial Activa</h3>
           <div className="mt-2 flex gap-2">
               <input type="number" value={deviationsInput} onChange={e=>setDeviationsInput(e.target.value)} className="border p-2 rounded w-24" />
               <button onClick={handleRequestExpansion} className="bg-blue-600 text-white px-4 py-2 rounded">Calcular</button>
           </div>
       </div>
    ) : null;

    // --- Helper for Content with Banner ---
    const renderValueBanner = (value: string | number) => (
        <div className="mb-6 flex justify-center animate-fade-in-up">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-8 py-4 rounded-xl shadow-lg border border-slate-700 text-center min-w-[200px] transform hover:scale-105 transition-transform duration-300">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">Valor Configurado</div>
                <div className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white font-mono">
                    {value}
                </div>
            </div>
        </div>
    );

    // --- RICH MODAL CONTENT (Enhanced) ---
    
    const getConfidenceModalContent = () => (
        <div className="space-y-4">
            {renderValueBanner(`${samplingParams.attribute.NC}%`)}
            {ASSISTANT_CONTENT.nivelConfianza.content}
        </div>
    );

    const getSeedModalContent = () => (
        <div className="space-y-4">
            {renderValueBanner(generalParams.seed)}
            {ASSISTANT_CONTENT.semilla.content}
        </div>
    );

    const getErrorProjectionModalContent = () => {
        if (samplingMethod === 'mus') {
            return (
                <div className="space-y-4">
                    {renderValueBanner(`$${formatMoney(currentResults.upperErrorLimit || 0)}`)}
                    <RichInfoCard type="definition" title="Límite Superior de Error (ULE)">
                        Estimación máxima del error monetario en la población con el riesgo de aceptación (RIA) seleccionado. Es la suma del Error Proyectado (Tainting) + Precisión Básica + Factor Incremental.
                    </RichInfoCard>
                    <RichInfoCard type="standard" title="Criterio de Aceptación">
                        Si el ULE es menor que el Error Tolerable ($ {formatMoney(samplingParams.mus.TE)}), se concluye que la población está razonablemente correcta.
                    </RichInfoCard>
                </div>
            );
        } else if (samplingMethod === 'cav') {
            return (
                <div className="space-y-4">
                    {renderValueBanner(`$${formatMoney(currentResults.totalErrorProjection || 0)}`)}
                    <RichInfoCard type="definition" title="Proyección de Error (Estimación Puntual)">
                        Diferencia estimada entre el valor auditado proyectado (usando la media de la muestra) y el valor en libros registrado.
                    </RichInfoCard>
                    <RichInfoCard type="impact" title="Intervalo de Precisión">
                        El valor real de la población se encuentra dentro de este rango:
                        <br/>
                        <strong>± ${formatMoney((currentResults.upperErrorLimit || 0) - (currentResults.totalErrorProjection || 0))}</strong> (con un {95}% de confianza).
                    </RichInfoCard>
                </div>
            );
        } else if (samplingMethod === 'stratified') {
             return (
                <div className="space-y-4">
                    {renderValueBanner(`$${formatMoney(currentResults.totalErrorProjection || 0)}`)}
                    <RichInfoCard type="definition" title="Proyección Estratificada">
                        Suma de los errores proyectados individualmente en cada estrato. Al estratificar, la variabilidad total disminuye, haciendo esta proyección más precisa que un muestreo aleatorio simple.
                    </RichInfoCard>
                </div>
            );
        }
        return <p>Información no disponible.</p>;
    };

    const getSampleSizeModalContent = () => {
        // ... (Existing Attribute/MUS/CAV Logic) ...
        if (samplingMethod === 'attribute') {
            return (
                <div className="space-y-4">
                    <RichInfoCard type="formula" title="Fórmula Estadística">
                        <p className="mb-2">Muestreo de Atributos (Distribución Binomial / Hipergeométrica).</p>
                        <code className="bg-slate-100 px-2 py-1 rounded block w-fit text-xs font-mono text-slate-700">n = R / (1 - NC) [Simplificada]</code>
                    </RichInfoCard>
                    <RichInfoCard type="definition" title="Parámetros Utilizados">
                        <ul className="list-disc list-inside">
                            <li><strong>Nivel de Confianza (NC):</strong> {samplingParams.attribute.NC}%</li>
                            <li><strong>Error Tolerable (ET):</strong> {samplingParams.attribute.ET}%</li>
                            <li><strong>Error Esperado (PE):</strong> {samplingParams.attribute.PE}%</li>
                        </ul>
                    </RichInfoCard>
                </div>
            );
        } else if (samplingMethod === 'mus') {
            return (
                 <div className="space-y-4">
                    <RichInfoCard type="formula" title="Fórmula MUS (PPS)">
                        <p className="mb-2">Muestreo por Unidad Monetaria.</p>
                        <code className="bg-slate-100 px-2 py-1 rounded block w-fit text-xs font-mono text-slate-700">Intervalo = TE / Factor(RIA)</code>
                    </RichInfoCard>
                    <RichInfoCard type="impact" title="Lógica de Selección">
                        Cada unidad monetaria ($1) tiene la misma probabilidad de selección.
                    </RichInfoCard>
                </div>
            );
        } else if (samplingMethod === 'cav') {
             return (
                 <div className="space-y-4">
                    <RichInfoCard type="formula" title="Fórmula Variables Clásicas">
                        <p className="mb-2">Distribución Normal (Media).</p>
                        <code className="bg-slate-100 px-2 py-1 rounded block w-fit text-xs font-mono text-slate-700">n = [ (N * Z * σ) / TE ]²</code>
                    </RichInfoCard>
                </div>
            );
        } else if (samplingMethod === 'stratified') {
             return (
                 <div className="space-y-4">
                    {renderValueBanner(currentResults.sampleSize)}
                    <RichInfoCard type="definition" title="Estrategia de Estratificación">
                        La población se dividió en <strong>{samplingParams.stratified.strataCount}</strong> grupos homogéneos según {samplingParams.stratified.basis}.
                    </RichInfoCard>
                    <RichInfoCard type="formula" title="Asignación de Muestra">
                        Método: <strong>{samplingParams.stratified.allocationMethod}</strong>.
                        <br/>Se aseguró un tamaño mínimo por estrato para validez estadística.
                    </RichInfoCard>
                </div>
            );
        } else if (samplingMethod === 'non_statistical') {
             return (
                 <div className="space-y-4">
                    {renderValueBanner(currentResults.sampleSize)}
                    <RichInfoCard type="definition" title="Juicio Profesional">
                        Selección basada en criterios cualitativos definidos por el auditor.
                    </RichInfoCard>
                    <RichInfoCard type="impact" title="Criterio Aplicado">
                        {samplingParams.nonStatistical.criteria || "Sin criterio definido"}
                    </RichInfoCard>
                    <RichInfoCard type="warning" title="Limitación">
                        Los resultados no son extrapolables estadísticamente al 100% de la población.
                    </RichInfoCard>
                </div>
            );
        }
        return <p>Cálculo basado en los parámetros definidos en el paso anterior.</p>;
    };

    // --- NEW: Non-Statistical Critical Items & Insight Details Modal ---
    const getCriticalItemsModalContent = () => {
        // If filtering by a specific insight (Benford, etc.)
        if (insightFilter) {
            const filteredItems = currentResults.sample.filter(i => 
                i.risk_factors?.includes(insightFilter) || i.risk_flag?.includes(insightFilter)
            );
            
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg flex items-center">
                                <i className="fas fa-filter mr-2 text-blue-500"></i>
                                {insightFilter}
                            </h4>
                            <p className="text-sm text-slate-500">{filteredItems.length} ítems detectados</p>
                        </div>
                        <button 
                            onClick={() => handleExportExcel(filteredItems, `Detalle_${insightFilter}`)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow flex items-center text-xs font-bold uppercase tracking-wide transition-colors"
                        >
                            <i className="fas fa-file-excel mr-2"></i> Exportar Lista
                        </button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">ID</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Valor</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-xs font-mono text-slate-700">{item.id}</td>
                                        <td className="px-4 py-2 text-xs text-right font-mono text-slate-700">${formatMoney(item.value)}</td>
                                        <td className="px-4 py-2 text-xs text-slate-500">{item.risk_justification}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="text-right">
                        <button onClick={() => setInsightFilter(null)} className="text-xs text-blue-600 underline">Ver todos los críticos</button>
                    </div>
                </div>
            );
        }

        // Default Critical Items List
        const criticalItems = currentResults.sample.filter(i => (i.risk_score || 0) >= 2 || i.risk_flag?.includes('Alto') || i.risk_flag?.includes('Crítico'));
        return (
            <div className="space-y-4">
                {renderValueBanner(criticalItems.length)}
                <RichInfoCard type="warning" title="Definición de Criticidad">
                    Ítems que superan el umbral de riesgo configurado (Score mayor o igual a 2) o que cumplen múltiples criterios de alerta (ej. Benford + Outlier).
                </RichInfoCard>
                
                <div className="flex justify-end">
                     <button 
                        onClick={() => handleExportExcel(criticalItems, 'Items_Criticos')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow flex items-center text-xs font-bold uppercase tracking-wide transition-colors"
                    >
                        <i className="fas fa-file-excel mr-2"></i> Exportar Críticos
                    </button>
                </div>

                {criticalItems.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-lg bg-red-50">
                         <table className="min-w-full divide-y divide-red-100">
                            <thead className="bg-red-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-red-800">ID</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-red-800">Valor</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-red-800">Factores</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-red-50">
                                {criticalItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-xs font-mono font-bold text-slate-700">{item.id}</td>
                                        <td className="px-4 py-2 text-xs text-right font-mono text-slate-700">${formatMoney(item.value)}</td>
                                        <td className="px-4 py-2 text-xs text-red-600 font-bold">{item.risk_factors?.join(', ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-center text-gray-500 italic py-4">No se detectaron ítems críticos en la muestra seleccionada.</p>
                )}
            </div>
        );
    };

    const getSequentialExpansionModalContent = () => (
        <div className="p-4 font-sans">
            <RichInfoCard type="definition" title="Análisis Stop-or-Go">
                {calculatedExpansion.justification}
            </RichInfoCard>
            
            <div className={`p-4 rounded-lg border flex items-center mb-4 ${calculatedExpansion.amount > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                 <i className={`fas ${calculatedExpansion.amount > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'} text-2xl mr-4`}></i>
                 <div>
                     <h4 className="font-bold text-lg">{calculatedExpansion.amount > 0 ? 'Expansión Recomendada' : 'Muestra Suficiente'}</h4>
                     <p className="text-sm">
                        {calculatedExpansion.amount > 0 
                            ? `Se requiere añadir +${calculatedExpansion.amount} ítems para mantener el Nivel de Confianza.` 
                            : 'No se detectan desviaciones suficientes para invalidar la muestra actual.'}
                     </p>
                 </div>
            </div>

            <button onClick={confirmExpansion} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all">
                {calculatedExpansion.amount > 0 ? 'Aplicar Ampliación a la Muestra' : 'Cerrar Panel'}
            </button>
        </div>
    );

    // --- CUSTOM TOOLTIPS ---
    const CustomScatterTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 text-white p-3 rounded shadow-xl border border-slate-700 text-xs z-50">
                    <p className="font-bold text-sm mb-1" style={{color: data.color}}>{data.name}</p>
                    <p>Frecuencia: <span className="font-mono text-emerald-400">{data.frequency}</span> items</p>
                    <p>Severidad Prom: <span className="font-mono text-amber-400">{data.avgSeverity}</span> pts</p>
                    <p className="mt-1 border-t border-slate-600 pt-1">Impacto Total: <strong>{data.totalImpact.toFixed(1)}</strong></p>
                </div>
            );
        }
        return null;
    };

    const CustomBarTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 rounded shadow-xl border border-slate-200 text-xs z-50">
                    <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                    <p className="text-slate-600">Weighted Risk Score: <span className="font-bold text-blue-600">{data.totalImpact.toFixed(1)}</span></p>
                    <p className="text-[10px] text-emerald-600 mt-1 font-bold">Haz clic para ver detalle</p>
                </div>
            );
        }
        return null;
    };

    // --- INTERPRETATION TEXT GENERATOR (Visual Component) ---
    const getInterpretationText = () => {
        // Reuse the logic via the text generator or custom JSX
        const text = generateInterpretationString();
        return (
            <div className="lg:col-span-2 bg-gradient-to-r from-slate-50 to-white p-5 rounded-lg border-l-4 border-indigo-500 shadow-sm text-sm text-slate-700">
                <h4 className="font-bold text-indigo-900 mb-2 flex items-center">
                    <i className="fas fa-robot mr-2"></i> Interpretación de Inteligencia de Riesgos
                </h4>
                <p className="leading-relaxed">{text}</p>
            </div>
        );
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                     <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-blue-600 mb-2 flex items-center transition-colors uppercase tracking-wide">
                        <i className="fas fa-arrow-left mr-2"></i>Volver a Configuración
                    </button>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm tracking-tight">Resultados de Auditoría</h2>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-3">
                     <button onClick={onRestart} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600">Reiniciar</button>
                     <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg shadow font-bold text-sm flex items-center disabled:opacity-70 disabled:cursor-not-allowed">
                        {isGeneratingReport ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-file-pdf mr-2"></i>}
                        {isGeneratingReport ? 'Generando PDF...' : 'Informe Oficial'}
                     </button>
                </div>
            </div>

            {renderSequentialConsole()}

            <div className="space-y-10">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => setActiveModal('sampleSize')} className="bg-violet-600 text-white p-6 rounded-2xl shadow-lg cursor-pointer transform hover:-translate-y-1 transition-transform relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <i className="fas fa-calculator text-6xl"></i>
                         </div>
                        <h3 className="text-5xl font-extrabold relative z-10">{currentResults.sampleSize}</h3>
                        <p className="font-bold mt-1 relative z-10">Items Seleccionados</p>
                        <p className="text-xs opacity-80 mt-2 underline relative z-10">Ver Cálculo Detallado <i className="fas fa-arrow-right ml-1"></i></p>
                    </div>
                    
                    {/* Conditional Middle Card */}
                    <div 
                        onClick={() => {
                            if (isNonStatistical) setActiveModal('criticalItems');
                            else if (['mus', 'cav', 'stratified'].includes(samplingMethod)) setActiveModal('errorProjection');
                            else if (samplingMethod === 'attribute') setActiveModal('confidence');
                        }}
                        className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transform hover:-translate-y-1 transition-transform cursor-pointer group`}
                    >
                        {isNonStatistical ? (
                            <div className="h-full flex flex-col justify-center relative">
                                 <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-50 transition-opacity">
                                        <i className="fas fa-list text-teal-400 text-xl"></i>
                                </div>
                                 <h3 className="text-4xl font-extrabold text-teal-600">
                                    {currentResults.sample.filter(i => (i.risk_score || 0) >= 2).length}
                                 </h3>
                                 <p className="font-bold text-slate-500 mt-1 flex items-center">
                                    <i className="fas fa-fire text-orange-500 mr-2"></i> Ítems Críticos
                                 </p>
                                 <p className="text-xs opacity-60 mt-1 underline">Ver Lista & Exportar</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col justify-center relative">
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-50 transition-opacity">
                                    <i className="fas fa-info-circle text-blue-400 text-xl"></i>
                                </div>
                                <h3 className="text-4xl font-extrabold text-blue-600">
                                    {samplingMethod === 'attribute' ? `${samplingParams.attribute.NC}%` : `$${formatMoney(currentResults.totalErrorProjection||0)}`}
                                </h3>
                                <p className="font-bold text-slate-500 mt-1">{samplingMethod === 'attribute' ? 'Nivel de Confianza' : 'Proyección de Error'}</p>
                                <p className="text-xs opacity-60 mt-1 underline">Ver Guía Técnica</p>
                            </div>
                        )}
                    </div>

                    <div 
                        onClick={() => setActiveModal('seed')}
                        className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg cursor-pointer transform hover:-translate-y-1 transition-transform relative group"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-30 transition-opacity">
                             <i className="fas fa-random text-4xl"></i>
                        </div>
                        <h3 className="text-4xl font-mono font-extrabold">{generalParams.seed}</h3>
                        <p className="font-bold mt-1">Semilla (Seed)</p>
                        <p className="text-xs opacity-60 mt-2 underline">Ver Detalles</p>
                    </div>
                </div>

                {/* --- NON-STATISTICAL DASHBOARD (REDISEÑADO) --- */}
                {isNonStatistical && advancedRiskMetrics.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden" ref={chartRef}>
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center">
                                <i className="fas fa-crosshairs mr-2 text-indigo-600"></i> Mapa de Calor y Ponderación de Riesgo
                            </h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Chart 1: Heatmap (Scatter) - Impact vs Frequency */}
                            <div className="h-96 border rounded-xl p-4 bg-white shadow-sm relative">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 text-center">Matriz de Riesgo: Impacto vs Frecuencia</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" dataKey="frequency" name="Frecuencia" unit=" items" stroke="#94a3b8" fontSize={10} domain={[0, maxFreqCalc]} />
                                        <YAxis type="number" dataKey="avgSeverity" name="Severidad Promedio" stroke="#94a3b8" fontSize={10} domain={[0, maxSevCalc]} />
                                        <ZAxis type="number" dataKey="totalImpact" range={[100, 1000]} name="Impacto Total" />
                                        <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                        
                                        {/* Quadrant Backgrounds / Reference Areas */}
                                        <ReferenceArea x1={midFreq} x2={maxFreqCalc} y1={midSev} y2={maxSevCalc} fill="#fee2e2" fillOpacity={0.3} stroke="none" />
                                        <ReferenceArea x1={0} x2={midFreq} y1={midSev} y2={maxSevCalc} fill="#ffedd5" fillOpacity={0.3} stroke="none" />
                                        <ReferenceArea x1={0} x2={maxFreqCalc} y1={0} y2={midSev} fill="#f1f5f9" fillOpacity={0.3} stroke="none" />

                                        {/* Quadrant Labels */}
                                        <ReferenceLine x={maxFreqCalc * 0.9} stroke="none" label={{ value: '🔍 Revisión Inmediata', position: 'insideTopRight', fill: '#dc2626', fontSize: 10, fontWeight: 'bold' }} />
                                        <ReferenceLine x={maxFreqCalc * 0.1} y={maxSevCalc} stroke="none" label={{ value: '⚠ Revisión Prioritaria', position: 'insideTopLeft', fill: '#d97706', fontSize: 10, fontWeight: 'bold' }} />
                                        <ReferenceLine x={maxFreqCalc * 0.5} y={midSev * 0.1} stroke="none" label={{ value: 'ℹ Monitoreo', position: 'center', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />

                                        {advancedRiskMetrics.map((entry, index) => (
                                            <Scatter 
                                                key={index} 
                                                name={entry.name} 
                                                data={[entry]} 
                                                fill={entry.color} 
                                                shape="circle"
                                            />
                                        ))}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Chart 2: Weighted Risk Bar Chart (INTERACTIVE) */}
                            <div className="h-96 border rounded-xl p-4 bg-white shadow-sm">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 text-center">Peso de Riesgo Ponderado (Click para Detalle)</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={advancedRiskMetrics} 
                                        layout="vertical" 
                                        margin={{left: 10, right: 50, top: 10, bottom: 10}}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} style={{fontSize: '11px', fontWeight: '600', fill: '#475569'}} />
                                        <RechartsTooltip content={<CustomBarTooltip />} cursor={{fill: '#f8fafc'}} />
                                        
                                        <Bar 
                                            dataKey="totalImpact" 
                                            name="Risk Score" 
                                            radius={[0, 4, 4, 0]} 
                                            barSize={24}
                                            onClick={(data) => {
                                                setInsightFilter(data.name);
                                                setActiveModal('criticalItems');
                                            }}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            label={{ position: 'right', fill: '#64748b', fontSize: 10, formatter: (val: number) => {
                                            if (val > 50) return `🔍 CRÍTICO (${val.toFixed(0)})`;
                                            if (val > 20) return `⚠ ALTO (${val.toFixed(0)})`;
                                            return `ℹ INFO (${val.toFixed(0)})`;
                                        }}}>
                                            {advancedRiskMetrics.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={BAR_COLORS[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Dynamic Text Analysis */}
                            {getInterpretationText()}
                        </div>
                    </div>
                )}

                {/* --- STATISTICAL CHARTS (MUS/ATTRIBUTE) --- */}
                {!isNonStatistical && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 h-80" ref={chartRef}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Evaluación de Resultados Estadísticos</h4>
                        <RiskChart 
                            upperErrorLimit={currentResults.upperErrorLimit || 0} 
                            tolerableError={samplingMethod === 'attribute' ? (samplingParams.attribute.ET * currentResults.sampleSize / 100) : samplingParams.mus.TE} // Simplificado para visualización
                            method={samplingMethod}
                        />
                         <div className="mt-4 p-4 bg-slate-50 rounded text-sm text-slate-700 border-l-4 border-blue-500">
                             {generateInterpretationString()}
                         </div>
                    </div>
                )}

                {/* --- LISTADO DE MUESTRA UNIFICADO CON BADGES --- */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center z-10">
                         <h3 className="text-lg font-bold text-gray-800">Detalle de Elementos ({currentResults.sample.length})</h3>
                         <button onClick={() => handleExportExcel()} className="text-emerald-600 font-bold text-sm uppercase hover:text-emerald-700 transition-colors"><i className="fas fa-file-excel mr-2"></i>Excel</button>
                    </div>
                    <div className="overflow-y-auto flex-grow custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">Valor</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Prioridad & Clasificación</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Justificación</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {currentResults.sample.map((item, index) => (
                                    <tr key={index} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-6 py-3 text-sm font-bold text-gray-700">{item.id}</td>
                                        <td className="px-6 py-3 text-sm text-right font-mono">${formatMoney(item.value)}</td>
                                        
                                        {/* UNIFIED BADGE COLUMN */}
                                        <td className="px-6 py-3">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {/* Risk Score Badge (Fire Icon) */}
                                                {( (item.risk_score !== undefined && item.risk_score >= 1) || (item.risk_flag && item.risk_flag.includes('Significativa')) ) && (
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center shadow-sm ${ (item.risk_score && item.risk_score >= 2) || (item.risk_flag && item.risk_flag.includes('Significativa')) ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                        <i className="fas fa-fire mr-1"></i> {item.risk_score ? item.risk_score.toFixed(1) : 'Alto'}
                                                    </span>
                                                )}

                                                {/* Generic Labels / Risk Factors / Stratum */}
                                                {(item.risk_factors || [item.risk_flag || item.stratum_label]).filter(Boolean).map((f, i) => {
                                                    // Determine color based on keyword
                                                    let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                                                    const txt = f!.toString();
                                                    if (txt.includes('Outlier') || txt.includes('Clave')) badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
                                                    else if (txt.includes('Duplicado')) badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
                                                    else if (txt.includes('Redondo')) badgeColor = 'bg-cyan-100 text-cyan-700 border-cyan-200';
                                                    else if (txt.includes('Estrato 1') || txt.includes('Alto')) badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';

                                                    return (
                                                        <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                                            {f}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-gray-500">{item.risk_justification}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={activeModal === 'sampleSize'} onClose={() => setActiveModal(null)} title={isNonStatistical ? "Criterio de Selección (n)" : "Desglose de Cálculo (n)"}>
                {getSampleSizeModalContent()}
            </Modal>
            <Modal isOpen={activeModal === 'sequentialExpansion'} onClose={() => setActiveModal(null)} title="Muestreo Secuencial">
                {getSequentialExpansionModalContent()}
            </Modal>
            <Modal isOpen={activeModal === 'confidence'} onClose={() => setActiveModal(null)} title="Nivel de Confianza (NC)">
                {getConfidenceModalContent()}
            </Modal>
            <Modal isOpen={activeModal === 'seed'} onClose={() => setActiveModal(null)} title="Mecanismo de Semilla (Seed)">
                {getSeedModalContent()}
            </Modal>
            <Modal isOpen={activeModal === 'errorProjection'} onClose={() => setActiveModal(null)} title="Proyección de Error">
                {getErrorProjectionModalContent()}
            </Modal>
            <Modal 
                isOpen={activeModal === 'criticalItems'} 
                onClose={() => { setActiveModal(null); setInsightFilter(null); }} 
                title={insightFilter ? `Detalle: ${insightFilter}` : "Ítems Críticos Detectados"}
            >
                {getCriticalItemsModalContent()}
            </Modal>
        </div>
    );
};

export default Step4Results;
