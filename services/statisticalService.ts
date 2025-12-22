
import { AppState, AuditResults, SamplingMethod, AuditSampleItem } from '../types';

// Helper local para generar ítems
const selectItems = (
    count: number, 
    seed: number, 
    realRows: any[], 
    logicCallback: (i: number, row?: any) => Partial<AuditSampleItem>
): AuditSampleItem[] => {
    
    const hasRealData = realRows && realRows.length > 0;
    const selectedItems: AuditSampleItem[] = [];
    
    let currentSeed = seed;
    const nextRandom = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return currentSeed / 233280;
    };

    let availableIndices = hasRealData ? Array.from({ length: realRows.length }, (_, k) => k) : [];

    for (let i = 0; i < count; i++) {
        let item: AuditSampleItem;

        if (hasRealData) {
            if (availableIndices.length === 0) {
                availableIndices = Array.from({ length: realRows.length }, (_, k) => k);
            }
            
            const randIndex = Math.floor(nextRandom() * availableIndices.length);
            const selectedDataIndex = availableIndices[randIndex];
            availableIndices.splice(randIndex, 1);

            const row = realRows[selectedDataIndex];
            
            item = {
                id: row.unique_id_col || `ROW-${selectedDataIndex}`,
                value: row.monetary_value_col || 0,
                ...logicCallback(i, row)
            };

        } else {
            const currentIdx = i + 1;
            item = {
                id: `TRANS-${seed + currentIdx}`,
                value: Math.floor(Math.random() * 15000) + 100,
                ...logicCallback(i)
            };
        }
        selectedItems.push(item);
    }

    return selectedItems;
};

const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const calculateStopOrGoExpansion = (
    currentSize: number,
    errorsFound: number,
    NC: number,
    ET: number
): { recommendedExpansion: number; justification: string; newTotal: number; formula: string } => {
    const formula = "n = (Factor_Confianza × 100) / (Error_Tolerable - Error_Previsto)";
    
    if (errorsFound === 0) {
        return { 
            recommendedExpansion: 0, 
            justification: "No se detectaron desviaciones. El procedimiento Stop-or-Go permite concluir sin ampliar la muestra.", 
            newTotal: currentSize,
            formula
        };
    }

    const rFactor = NC >= 95 ? 3.0 : 2.31;
    const fullSampleSize = Math.ceil((rFactor * 100) / ET);
    const expansion = Math.max(0, fullSampleSize - currentSize);

    return {
        recommendedExpansion: expansion,
        justification: `Se detectaron ${errorsFound} desviaciones. Se requiere ampliar la muestra a ${fullSampleSize} registros para validar el control con un NC del ${NC}%.`,
        newTotal: fullSampleSize,
        formula
    };
};

export const calculateVariableExpansion = (
    appState: AppState,
    currentResults: AuditResults,
    errorsFound: number,
    totalPilotValue: number
): { recommendedExpansion: number; justification: string; newTotal: number; formula: string } => {
    
    const { samplingMethod, samplingParams } = appState;
    let newTotal = currentResults.sampleSize;
    let justification = "";
    let formula = "n = (N × Z² × σ²) / E²";

    if (samplingMethod === SamplingMethod.MUS) {
        formula = "n = (V × Factor_Confianza) / (Error_Tolerable - (Error_Esperado × Factor_Ajuste))";
        const mus = samplingParams.mus;
        const confidenceFactor = mus.RIA <= 5 ? 3.0 : 2.31;
        
        const samplingInterval = mus.TE / (confidenceFactor + (errorsFound * 0.5)); 
        newTotal = Math.ceil(mus.V / samplingInterval);
        
        if (errorsFound === 0) {
            justification = `Fase Piloto Exitosa (0 errores). Para cubrir estadísticamente el universo de $${formatMoney(mus.V)} con la materialidad definida, se debe completar la muestra hasta un total de ${newTotal} registros.`;
        } else {
            justification = `Se detectaron ${errorsFound} hallazgos. Por principio de prudencia NIA 530, el tamaño de muestra se incrementa a ${newTotal} para compensar el riesgo de error proyectado.`;
        }
    } 
    else if (samplingMethod === SamplingMethod.CAV) {
        const cav = samplingParams.cav;
        const pilotSigma = currentResults.pilotMetrics?.calibratedSigma || cav.sigma;
        const N = appState.selectedPopulation?.row_count || 1000;
        const Z = 1.96;
        const TE = (appState.samplingParams.mus?.TE) || (pilotSigma * 5);
        
        const adjustmentFactor = 1 + (errorsFound * 0.2); 
        newTotal = Math.ceil(Math.pow((N * Z * pilotSigma * adjustmentFactor) / TE, 2));
        
        justification = errorsFound === 0 
            ? `Calibración Sigma completada. El tamaño de muestra definitivo para este universo es de ${newTotal} registros.`
            : `Debido a la variabilidad y hallazgos en el piloto, se requiere un total de ${newTotal} registros para cumplir con la precisión deseada.`;
    }

    const expansion = Math.max(0, newTotal - currentResults.sampleSize);
    return { recommendedExpansion: expansion, justification, newTotal, formula };
};

export const expandAuditSample = (
    currentResults: AuditResults, 
    additionalSize: number, 
    seed: number, 
    realRows: any[] = []
): AuditResults => {
    const newItems = selectItems(additionalSize, seed + 888, realRows, () => ({
        risk_flag: "Ampliación Técnica",
        risk_justification: "Registro seleccionado para completar el tamaño representativo de la población."
    }));

    return {
        ...currentResults,
        sampleSize: currentResults.sampleSize + additionalSize,
        sample: [...currentResults.sample, ...newItems],
        methodologyNotes: [...(currentResults.methodologyNotes || []), `Muestra completada con ${additionalSize} ítems adicionales para alcanzar representatividad estadística.`]
    };
};

export const calculateSampleSize = (appState: AppState, realRows: any[] = []): AuditResults => {
    const { samplingMethod, samplingParams } = appState;
    let sampleSize = 0;
    const methodologyNotes: string[] = [];
    const seed = appState.generalParams.seed;
    let sample: AuditSampleItem[] = [];
    let pilotMetrics: any = null;

    switch (samplingMethod) {
        case SamplingMethod.Attribute:
            const attr = samplingParams.attribute;
            if (attr.useSequential) {
                sampleSize = 25; 
                methodologyNotes.push("Iniciado procedimiento Stop-or-Go (n=25).");
                sample = selectItems(sampleSize, seed, realRows, () => ({ is_pilot_item: true, risk_flag: "Fase Piloto" }));
                pilotMetrics = { type: 'ATTR_PILOT', phase: 'PILOT_ONLY', initialSize: 25 };
            } else {
                const rFactorAttr = attr.NC >= 95 ? 3.00 : 2.31;
                sampleSize = Math.ceil((rFactorAttr * 100) / (attr.ET - attr.PE));
                sample = selectItems(sampleSize, seed, realRows, () => ({}));
            }
            break;

        case SamplingMethod.MUS:
            const mus = samplingParams.mus;
            if (mus.usePilotSample) {
                sampleSize = 30; 
                methodologyNotes.push("Fase 1: Muestra Piloto iniciada para calibración de parámetros monetarios.");
                sample = selectItems(sampleSize, seed, realRows, () => ({ 
                    is_pilot_item: true, 
                    risk_flag: "Fase Piloto",
                    risk_justification: "Registro de calibración inicial." 
                }));
                pilotMetrics = { type: 'MUS_PILOT', initialEE: mus.EE, phase: 'PILOT_ONLY', initialSize: 30 };
            } else {
                const confidenceFactorMUS = mus.RIA <= 5 ? 3.0 : 2.31; 
                const samplingInterval = mus.TE / confidenceFactorMUS;
                sampleSize = Math.ceil(mus.V / samplingInterval);
                sample = selectItems(sampleSize, seed, realRows, () => ({}));
            }
            break;

        case SamplingMethod.CAV:
            const cav = samplingParams.cav;
            if (cav.usePilotSample) {
                sampleSize = 50; 
                methodologyNotes.push("Fase 1: Muestra Piloto para determinación científica de la desviación estándar (Sigma).");
                sample = selectItems(sampleSize, seed, realRows, () => ({ 
                    is_pilot_item: true, 
                    risk_flag: "Fase Piloto",
                    risk_justification: "Registro para cálculo de varianza real."
                }));
                
                const vals = sample.map(i => i.value);
                const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length - 1);
                const sigma = Math.sqrt(variance);
                pilotMetrics = { type: 'CAV_PILOT', initialSigma: cav.sigma, calibratedSigma: sigma, phase: 'PILOT_ONLY', initialSize: 50 };
            } else {
                const N_CAV = realRows.length > 0 ? realRows.length : 1000;
                sampleSize = Math.ceil(Math.pow((N_CAV * 1.96 * cav.sigma) / (samplingParams.mus.TE || 10000), 2));
                sample = selectItems(sampleSize, seed, realRows, () => ({}));
            }
            break;

        default:
            sampleSize = 30;
            sample = selectItems(sampleSize, seed, realRows, () => ({}));
    }
    
    return {
        sampleSize,
        sample,
        totalErrorProjection: 0,
        upperErrorLimit: 0,
        findings: [],
        methodologyNotes,
        pilotMetrics
    };
};
