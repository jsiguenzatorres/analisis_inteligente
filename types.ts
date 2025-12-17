
export enum SamplingMethod {
    Attribute = 'attribute',
    MUS = 'mus',
    CAV = 'cav',
    Stratified = 'stratified',
    NonStatistical = 'non_statistical',
}

export enum Step {
    Connection = 'Connection',
    GeneralParams = 'GeneralParams',
    SamplingMethod = 'SamplingMethod',
    Results = 'Results',
}

// Data Loading Types
export interface ColumnMapping {
    uniqueId: string;
    monetaryValue: string;
    category?: string;
    subcategory?: string;
    date?: string;
    description?: string;
}

export interface DescriptiveStats {
    min: number;
    max: number;
    sum: number;
    avg: number;
    std_dev: number;
    cv: number; // Coefficient of Variation
}

export interface BenfordAnalysis {
    digit: number;
    actualCount: number;
    actualFreq: number;
    expectedFreq: number;
    deviation: number;
    isSuspicious: boolean;
}

export interface AdvancedAnalysis {
    benford: BenfordAnalysis[];
    outliersCount: number;
    outliersThreshold: number;
    duplicatesCount: number;
    zerosCount: number;
    negativesCount: number;
    roundNumbersCount: number; // NEW: Count of round numbers
}

// NEW: AI Recommendation Types
export interface AiRecommendation {
    recommendedMethod: SamplingMethod;
    confidenceScore: number; // 0 to 100
    reasoning: string[]; // List of reasons why
    riskFactors: string[]; // List of detected risks (High Volatility, Negatives, etc.)
    directedSelectionAdvice?: string; // Advice for "Directed Selection"
}

export type AuditStatus = 'cargando' | 'pendiente_validacion' | 'validado' | 'archivado';

export interface AuditPopulation {
    id: string; // uuid
    created_at: string;
    file_name: string;
    status: AuditStatus;
    row_count: number;
    total_monetary_value: number;
    column_mapping: ColumnMapping;
    descriptive_stats: DescriptiveStats;
    integrity_hash?: string; // NEW: SHA-256 del archivo
    advanced_analysis?: AdvancedAnalysis; // NEW: Insights automáticos
    ai_recommendation?: AiRecommendation; // NEW: The Algorithm Output
}


export interface GeneralParams {
    objective: string;
    standard: 'NIA 530' | 'MIPP';
    template: string;
    seed: number;
}

export interface AttributeSamplingParams {
    N: number;
    NC: number;
    ET: number;
    PE: number;
    useSequential: boolean; // NEW: Stop-or-Go
}

export interface MUSParams {
    V: number;
    TE: number;
    EE: number;
    RIA: number;
    highValueThreshold?: number;
    optimizeTopStratum: boolean; // NEW: Auto-detect Key Items
    handleNegatives: 'Separate' | 'Zero' | 'Absolute'; // NEW: Tratamiento de negativos
}

export interface CAVParams {
    sigma: number;
    stratification: boolean;
    estimationTechnique: 'Media' | 'Diferencia' | 'Tasa Combinada' | 'Regresión Separada';
    usePilotSample: boolean; // NEW: Sugerencia de muestra piloto
}

export interface StratifiedParams {
    basis: 'Monetary' | 'Category' | 'Subcategory';
    strataCount: number;
    allocationMethod: 'Proporcional' | 'Óptima (Neyman)' | 'Igualitaria';
    certaintyStratumThreshold: number;
    detectOutliers: boolean; // NEW: Auto-detect outliers
}

export interface NonStatisticalParams {
    criteria: string;
    justification: string;
    suggestedRisk?: 'Benford' | 'Outliers' | 'Duplicates' | 'RoundNumbers' | 'CombinedRisk'; // NEW: Added RoundNumbers & CombinedRisk
}

export interface SamplingParams {
    attribute: AttributeSamplingParams;
    mus: MUSParams;
    cav: CAVParams;
    stratified: StratifiedParams; 
    nonStatistical: NonStatisticalParams;
}

export interface AuditSampleItem {
    id: string | number;
    value: number;
    stratum?: number;
    stratum_label?: string; // NEW: Nombre legible del estrato (ej. "Sucursal Norte")
    risk_flag?: string; // NEW: Etiqueta breve (ej. "Alto Riesgo")
    risk_factors?: string[]; // NEW: Lista detallada de factores (ej. ['Benford', 'Outlier'])
    risk_score?: number; // NEW: Puntaje de riesgo acumulado
    risk_justification?: string; // NEW: Explicación (ej. "Supera el intervalo de muestreo")
}

export type ObservationType = 'hallazgo' | 'asunto_menor' | 'sugerencia';

export interface AuditFinding {
    type: ObservationType;
    condition: string; 
    criteria: string;
    rootCause?: string; 
    effect?: string; 
    recommendation: string;
    responsible: string;
    comments?: string;
    dueDate: string;
    status: 'Abierto' | 'Cerrado';
}

export interface AuditResults {
    sampleSize: number;
    sample: AuditSampleItem[];
    totalErrorProjection?: number;
    upperErrorLimit?: number;
    findings: AuditFinding[];
    methodologyNotes?: string[]; // NEW: Notas técnicas para el informe
}

export interface ConnectionParams {
    table: string;
    idColumn: string;
    valueColumn: string;
    validated: boolean;
    user: string;
    url: string;
    password?: string;
}

export interface AppState {
    connection: ConnectionParams;
    selectedPopulation: AuditPopulation | null;
    generalParams: GeneralParams;
    samplingMethod: SamplingMethod;
    samplingParams: SamplingParams;
    results: AuditResults | null;
}
