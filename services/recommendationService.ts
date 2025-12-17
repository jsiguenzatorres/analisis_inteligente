
import { AdvancedAnalysis, AiRecommendation, DescriptiveStats, SamplingMethod } from '../types';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG } from '../config';

/**
 * Algoritmo de Recomendación de Muestreo potenciado por Gemini
 */
export const analyzePopulationAndRecommend = async (
    stats: DescriptiveStats,
    analysis: AdvancedAnalysis
): Promise<AiRecommendation> => {
    
    // Fallback si no hay API Key para no romper la app
    if (!GEMINI_CONFIG.apiKey) {
        return getLocalFallbackRecommendation(stats, analysis);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_CONFIG.apiKey });
        
        const prompt = `
            Como experto senior en auditoría y estadística (NIA 530), analiza estos datos y recomienda el mejor método de muestreo:
            
            ESTADÍSTICAS:
            - Filas: ${stats.sum === 0 ? 'N/A' : 'Varios'}
            - Valor Total: $${stats.sum}
            - Coeficiente de Variación (Volatilidad): ${stats.cv.toFixed(4)}
            - Mínimo: ${stats.min}, Máximo: ${stats.max}
            
            INSIGHTS DE RIESGO:
            - Outliers detectados: ${analysis.outliersCount}
            - Anomalías Benford: ${analysis.benford.filter(b => b.isSuspicious).map(b => b.digit).join(', ')}
            - Duplicados: ${analysis.duplicatesCount}
            - Negativos: ${analysis.negativesCount}, Ceros: ${analysis.zerosCount}
            - Números Redondos: ${analysis.roundNumbersCount}

            MÉTODOS DISPONIBLES: 'attribute', 'mus', 'cav', 'stratified', 'non_statistical'.
            
            RESPONDE ÚNICAMENTE EN FORMATO JSON con esta estructura:
            {
              "recommendedMethod": "string",
              "confidenceScore": number,
              "reasoning": ["string"],
              "riskFactors": ["string"],
              "directedSelectionAdvice": "string"
            }
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_CONFIG.model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const result = JSON.parse(response.text || '{}');
        return result as AiRecommendation;

    } catch (error) {
        console.error("Gemini Error, usando fallback local:", error);
        return getLocalFallbackRecommendation(stats, analysis);
    }
};

const getLocalFallbackRecommendation = (stats: DescriptiveStats, analysis: AdvancedAnalysis): AiRecommendation => {
    // Lógica de respaldo heurística si falla la IA
    const isAttribute = stats.sum === 0;
    return {
        recommendedMethod: isAttribute ? SamplingMethod.Attribute : (stats.cv > 1.5 ? SamplingMethod.Stratified : SamplingMethod.MUS),
        confidenceScore: 70,
        reasoning: ["Recomendación basada en reglas heurísticas locales (IA desconectada)."],
        riskFactors: analysis.negativesCount > 0 ? ["Valores negativos detectados"] : [],
        directedSelectionAdvice: analysis.outliersCount > 0 ? "Revisar outliers manualmente." : ""
    };
};
