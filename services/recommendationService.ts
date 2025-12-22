
import { AdvancedAnalysis, AiRecommendation, DescriptiveStats, SamplingMethod } from '../types';

/**
 * Algoritmo de Recomendación de Método de Muestreo (AAMA AI Engine)
 * Basado en NIA 530 y mejores prácticas estadísticas.
 */
export const analyzePopulationAndRecommend = (
    stats: DescriptiveStats,
    analysis: AdvancedAnalysis
): AiRecommendation => {
    
    const reasoning: string[] = [];
    const riskFactors: string[] = [];
    let directedAdvice = "";

    // 0. Validación Fundamental: Datos Sin Valor Monetario
    if (stats.sum === 0 && stats.max === 0) {
        reasoning.push("La población cargada no contiene valores monetarios significativos (Suma = 0).");
        reasoning.push("Los métodos sustantivos (MUS, CAV, Estratificado Monetario) requieren importes para calcular proyecciones.");
        return {
            recommendedMethod: SamplingMethod.Attribute,
            confidenceScore: 100,
            reasoning: ["Población definida exclusivamente por atributos cualitativos.", ...reasoning],
            riskFactors,
            directedSelectionAdvice: ""
        };
    }

    // 1. Análisis de Volatilidad (Coeficiente de Variación)
    // CV > 1 indica alta variabilidad, lo cual hace ineficientes a métodos de promedio simple.
    const isHighVolatility = stats.cv > 1.5;
    const isExtremeVolatility = stats.cv > 3.0;

    if (isHighVolatility) riskFactors.push("Alta Volatilidad de Datos (CV > 1.5)");
    if (analysis.negativesCount > 0) riskFactors.push("Presencia de Valores Negativos");
    if (analysis.zerosCount > (stats.sum > 0 ? 0 : -1)) { // Logic check
         if(analysis.zerosCount > 0) riskFactors.push("Presencia de Registros en Cero");
    }

    // 2. Lógica de Selección Dirigida (Directed Selection)
    // Si hay muchos outliers o anomalías Benford, sugerir un enfoque híbrido.
    const hasSignificantOutliers = analysis.outliersCount > 0;
    const hasBenfordIssues = analysis.benford.some(b => b.isSuspicious);

    if (hasSignificantOutliers) {
        directedAdvice += `Se detectaron ${analysis.outliersCount} valores atípicos. Se recomienda extraer estos ítems mediante Selección Dirigida antes de aplicar el muestreo estadístico al remanente. `;
    }
    if (hasBenfordIssues) {
        riskFactors.push("Anomalía en Ley de Benford");
        directedAdvice += "La distribución de dígitos iniciales es sospechosa. Considere revisar dirigidamente los montos justo debajo de los umbrales de autorización. ";
    }

    // 3. Árbol de Decisión del Método

    // Caso A: MUS (Monetary Unit Sampling)
    // Ideal para sobrestimación, pero malo con negativos o ceros.
    if (analysis.negativesCount === 0 && analysis.zerosCount === 0 && !isExtremeVolatility) {
        reasoning.push("La población no contiene negativos ni ceros, ideal para MUS.");
        reasoning.push("El objetivo principal suele ser detectar sobrestimaciones en activos/ingresos.");
        return {
            recommendedMethod: SamplingMethod.MUS,
            confidenceScore: 95,
            reasoning,
            riskFactors,
            directedSelectionAdvice: directedAdvice
        };
    }

    // Caso B: Estratificado
    // Ideal si hay mucha variabilidad (CV alto).
    if (isHighVolatility || isExtremeVolatility) {
        reasoning.push("La alta variabilidad (CV) indica que la media no es representativa.");
        reasoning.push("La estratificación reducirá la varianza dividiendo la población en grupos homogéneos, haciendo la muestra más eficiente.");
        return {
            recommendedMethod: SamplingMethod.Stratified,
            confidenceScore: 90,
            reasoning,
            riskFactors,
            directedSelectionAdvice: directedAdvice
        };
    }

    // Caso C: CAV (Classical Variables)
    // Maneja bien negativos y subestimaciones, pero requiere normalidad (o muestras grandes).
    if (analysis.negativesCount > 0) {
        reasoning.push("Se detectaron valores negativos. MUS no puede manejar esto sin segregación previa.");
        reasoning.push("El Muestreo de Variables Clásicas (CAV) maneja naturalmente signos mixtos y permite estimar el valor total.");
        return {
            recommendedMethod: SamplingMethod.CAV,
            confidenceScore: 85,
            reasoning,
            riskFactors,
            directedSelectionAdvice: directedAdvice
        };
    }

    // Caso D: No Estadístico (Juicio) / Dirigido
    // Si los datos están muy sucios o el riesgo es muy específico (Benford).
    if (hasBenfordIssues && !isHighVolatility) {
        reasoning.push("Las anomalías de Benford sugieren un riesgo de fraude o manipulación específica.");
        reasoning.push("Un enfoque estadístico puro podría diluir estos hallazgos. Se sugiere un enfoque dirigido o no estadístico basado en riesgo.");
        return {
            recommendedMethod: SamplingMethod.NonStatistical,
            confidenceScore: 80,
            reasoning,
            riskFactors,
            directedSelectionAdvice: directedAdvice || "Enfoque en patrones anómalos."
        };
    }

    // Default Fallback: Attribute (si es solo cumplimiento) o Stratified
    reasoning.push("Ante la duda en la estructura de datos, la estratificación ofrece el mejor balance de reducción de riesgo.");
    return {
        recommendedMethod: SamplingMethod.Stratified,
        confidenceScore: 70,
        reasoning,
        riskFactors,
        directedSelectionAdvice: directedAdvice
    };
};
