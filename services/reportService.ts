
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppState, SamplingMethod, AuditResults, AuditObservation } from '../types';

const COLORS = {
    primary: [15, 23, 42],     // Oxford Black
    secondary: [30, 58, 138],  // Deep Navy
    accent: [5, 150, 105],     // Emerald
    danger: [185, 28, 28],     // Red 700
    text: [30, 41, 59],
    border: [203, 213, 225],
    highlight: [248, 250, 252] // Slate 50
};

const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return "$0.00";
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateAuditReport = async (appState: AppState, chartImages?: { forensic?: string, results?: string, kpis?: string, insights?: string, strategy?: string }) => {
    const { selectedPopulation: pop, results, generalParams, samplingMethod, samplingParams, observations } = appState;
    if (!pop || !results) throw new Error("Datos incompletos para generar el reporte.");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    const addHeader = (sectionTitle: string) => {
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("AAMA v4.1 - REPORTE DE SELECCIÓN DE MUESTRA", margin, 18);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`AUDITORÍA INTERNA | NIA 530 | FECHA: ${new Date().toLocaleDateString()}`, margin, 26);
        doc.setFont('helvetica', 'bold');
        doc.text(sectionTitle.toUpperCase(), margin, 34);
    };

    const drawSectionBox = (title: string, content: string[], currentY: number) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        const boxHeight = (content.length * 6) + 15;
        doc.roundedRect(margin, currentY, pageWidth - 40, boxHeight, 3, 3, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.text(title, margin + 5, currentY + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        content.forEach((line, i) => {
            doc.text(line, margin + 5, currentY + 16 + (i * 5));
        });
        return currentY + boxHeight + 10;
    };

    // --- PÁGINA 1: ESCENARIO PRELIMINAR ---
    addHeader("Sección I: Diagnóstico y Estrategia Preliminar");
    let y = 55;

    doc.setTextColor(COLORS.primary[0]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("1.1 OBJETIVO ESPECÍFICO DEL MUESTREO", margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitObj = doc.splitTextToSize(generalParams.objective || "Validación de integridad y cumplimiento de saldos.", pageWidth - 40);
    doc.text(splitObj, margin, y);
    y += (splitObj.length * 5) + 10;

    if (chartImages?.insights) {
        doc.setFont('helvetica', 'bold');
        doc.text("1.2 DATA DRIVEN INSIGHTS (HALLAZGOS FORENSES)", margin, y);
        y += 8;
        doc.addImage(chartImages.insights, 'PNG', margin, y, 170, 35);
        y += 45;
    }

    if (chartImages?.strategy) {
        doc.setFont('helvetica', 'bold');
        doc.text("1.3 ESTRATEGIA Y CRITERIOS SELECCIONADOS", margin, y);
        y += 8;
        doc.addImage(chartImages.strategy, 'PNG', margin, y, 170, 75);
        y += 85;
    }

    // --- PÁGINA 2: ANÁLISIS DE RESULTADOS ---
    doc.addPage();
    addHeader("Sección II: Visualización de Hallazgos y Priorización");
    y = 55;

    if (chartImages?.forensic) {
        doc.setFont('helvetica', 'bold');
        doc.text("2.1 ANÁLISIS VISUAL DE ANOMALÍAS:", margin, y);
        y += 8;
        doc.addImage(chartImages.forensic, 'PNG', margin, y, 170, 80);
        y += 90;
    }

    // --- PÁGINA 3: RESULTADOS FINALES Y KPIs ---
    doc.addPage();
    addHeader("Sección III: Resultados Finales y Papel de Trabajo");
    y = 55;

    if (chartImages?.kpis) {
        doc.setFont('helvetica', 'bold');
        doc.text("3.1 KPIs DE LA MUESTRA ALCANZADA:", margin, y);
        y += 8;
        doc.addImage(chartImages.kpis, 'PNG', margin, y, 170, 35);
        y += 45;
    }

    y = drawSectionBox("GLOSARIO DE FUNDAMENTOS TÉCNICOS", [
        "Interpretación (n): Representa el número de unidades de muestreo seleccionadas.",
        "Juicio Profesional: Aplicación de experiencia para priorizar áreas con alertas detectadas.",
        "Semilla (Seed): Garantiza que la selección sea reproducible y técnica."
    ], y);

    // --- PÁGINA 4: LISTADO DETALLADO ---
    doc.addPage();
    addHeader("Sección IV: Listado de Selección (Papel de Trabajo)");
    
    autoTable(doc, {
        startY: 50,
        head: [['ID Registro', 'Valor Monetario', 'Fase', 'Motivo de Riesgo']],
        body: results.sample.slice(0, 100).map(i => [
            i.id, 
            formatCurrency(i.value), 
            i.is_pilot_item ? "Fase 1" : "Fase 2", 
            i.risk_flag || "Normal"
        ]),
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary },
        styles: { fontSize: 7, cellPadding: 2 }
    });

    // --- PÁGINA 5: OBSERVACIONES (SECCIÓN ACTUALIZADA A ESPAÑOL) ---
    if (observations && observations.length > 0) {
        doc.addPage();
        addHeader("Sección V: Hallazgos y Observaciones Cualitativas");
        
        autoTable(doc, {
            startY: 50,
            head: [['Título', 'Descripción', 'Severidad', 'Tipo']],
            body: observations.map(o => [
                o.titulo,
                o.descripcion,
                o.severidad,
                o.tipo
            ]),
            theme: 'grid',
            headStyles: { fillColor: COLORS.secondary },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                1: { cellWidth: 100 } 
            }
        });
    }

    doc.save(`PT_Auditoria_${pop.file_name.split('.')[0]}.pdf`);
};
