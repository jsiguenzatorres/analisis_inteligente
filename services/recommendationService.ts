
import { AdvancedAnalysis, AiRecommendation, DescriptiveStats, SamplingMethod } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_API_KEY } from '../config';

/**
 * Algoritmo de Recomendación de Muestreo potenciado por Gemini
 */
export const analyzePopulationAndRecommend = async (
    stats: DescriptiveStats,
    analysis: AdvancedAnalysis
): Promise<AiRecommendation> => {
    
    const apiKey = GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("Gemini API_KEY no encontrada en el entorno.");
        return getLocalFallbackRecommendation(stats, analysis);
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
            Como experto senior en auditoría y estadística (NIA 530), analiza estos datos y recomienda el mejor método de muestreo:
            
            ESTADÍSTICAS:
            - Valor Total: $${stats.sum}
            - Coeficiente de Variación: ${stats.cv.toFixed(4)}
            - Mínimo: ${stats.min}, Máximo: ${stats.max}
            
            INSIGHTS DE RIESGO:
            - Outliers detectados: ${analysis.outliersCount}
            - Anomalías Benford: ${analysis.benford.filter(b => b.isSuspicious).map(b => b.digit).join(', ')}
            - Duplicados: ${analysis.duplicatesCount}
            - Negativos: ${analysis.negativesCount}, Ceros: ${analysis.zerosCount}
            - Números Redondos: ${analysis.roundNumbersCount}

            MÉTODOS DISPONIBLES: 'attribute', 'mus', 'cav', 'stratified', 'non_statistical'.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedMethod: { type: Type.STRING },
                        confidenceScore: { type: Type.NUMBER },
                        reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
                        riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                        directedSelectionAdvice: { type: Type.STRING },
                    },
                    required: ["recommendedMethod", "confidenceScore", "reasoning", "riskFactors"],
                },
            },
        });

        return JSON.parse(response.text || '{}') as AiRecommendation;

    } catch (error) {
        console.error("Gemini Error:", error);
        return getLocalFallbackRecommendation(stats, analysis);
    }
};

const getLocalFallbackRecommendation = (stats: DescriptiveStats, analysis: AdvancedAnalysis): AiRecommendation => {
    const isAttribute = stats.sum === 0;
    return {
        recommendedMethod: isAttribute ? SamplingMethod.Attribute : (stats.cv > 1.5 ? SamplingMethod.Stratified : SamplingMethod.MUS),
        confidenceScore: 70,
        reasoning: ["Recomendación basada en reglas heurísticas locales (API no disponible)."],
        riskFactors: analysis.negativesCount > 0 ? ["Valores negativos detectados"] : [],
        directedSelectionAdvice: analysis.outliersCount > 0 ? "Revisar outliers manualmente." : ""
    };
};
