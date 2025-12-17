
import { AdvancedAnalysis, AiRecommendation, DescriptiveStats, SamplingMethod } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Algoritmo de Recomendación de Muestreo potenciado por Gemini
 */
export const analyzePopulationAndRecommend = async (
    stats: DescriptiveStats,
    analysis: AdvancedAnalysis
): Promise<AiRecommendation> => {
    
    // Check for API key directly from environment variable as required by guidelines
    if (!process.env.API_KEY) {
        return getLocalFallbackRecommendation(stats, analysis);
    }

    try {
        // Initialize Gemini client using the mandatory direct environment variable access
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
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
        `;

        // Using ai.models.generateContent with a recommended model and responseSchema for JSON output
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedMethod: {
                            type: Type.STRING,
                            description: "The sampling method recommended (attribute, mus, cav, stratified, non_statistical).",
                        },
                        confidenceScore: {
                            type: Type.NUMBER,
                            description: "Confidence score for this recommendation (0-100).",
                        },
                        reasoning: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Specific technical reasons for the recommendation.",
                        },
                        riskFactors: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Key risk factors identified in the population.",
                        },
                        directedSelectionAdvice: {
                            type: Type.STRING,
                            description: "Advice on items requiring manual judgment or directed selection.",
                        },
                    },
                    required: ["recommendedMethod", "confidenceScore", "reasoning", "riskFactors"],
                },
            },
        });

        // The response.text property directly returns the string output (not a function).
        const jsonStr = response.text || '{}';
        const result = JSON.parse(jsonStr);
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
