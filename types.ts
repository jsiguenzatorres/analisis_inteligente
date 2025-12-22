
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

export interface ObservationEvidence {
    nombre: string;
    url: string;
    tipo: string;
}

export interface AuditObservation {
    id?: string;
    id_poblacion: string;
    metodo: SamplingMethod;
    fecha_creacion?: string;
    titulo: string;
    descripcion: string;
    severidad: 'Bajo' | 'Medio' | 'Alto';
    tipo: 'Control' | 'Sustantivo' | 'Cumplimiento';
    creado_por?: string;
    evidencias?: ObservationEvidence[];
}

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
    cv: number;
}

export interface BenfordAnalysis {
    digit: number;
    expectedFreq: number;
    actualFreq: number;
    actualCount: number;
    isSuspicious: boolean;
}

export interface AdvancedAnalysis {
    benford: BenfordAnalysis[];
    outliersCount: number;
    outliersThreshold: number;
    duplicatesCount: number;
    zerosCount: number;
    negativesCount: number;
    roundNumbersCount: number;
}

export interface AiRecommendation {
    recommendedMethod: SamplingMethod;
    confidenceScore: number;
    reasoning: string[];
    riskFactors: string[];
    directedSelectionAdvice: string;
}

export interface AuditPopulation {
    id: string; 
    created_at: string;
    file_name: string;
    status: AuditStatus;
    row_count: number;
    total_monetary_value: number;
    column_mapping: ColumnMapping;
    descriptive_stats: DescriptiveStats;
    advanced_analysis?: AdvancedAnalysis;
    ai_recommendation?: AiRecommendation;
}

export interface AuditSampleItem {
    id: string;
    value: number;
    risk_flag?: string;
    risk_justification?: string;
    is_pilot_item?: boolean;
    stratum_label?: string;
}

export interface AuditResults {
    sampleSize: number;
    sample: AuditSampleItem[];
    totalErrorProjection: number;
    upperErrorLimit: number;
    findings: any[];
    methodologyNotes: string[];
    pilotMetrics?: any;
    observations?: AuditObservation[];
}

export interface HistoricalSample {
    id: string;
    population_id: string;
    method: SamplingMethod;
    created_at: string;
    objective: string;
    seed: number;
    sample_size: number;
    params_snapshot: any;
    results_snapshot: AuditResults;
    is_final: boolean;
    is_current: boolean; 
}

export type AuditStatus = 'cargando' | 'pendiente_validacion' | 'validado' | 'archivado';

export interface AppState {
    connection: any;
    selectedPopulation: AuditPopulation | null;
    generalParams: any;
    samplingMethod: SamplingMethod;
    samplingParams: any;
    results: AuditResults | null;
    isLocked: boolean;
    isCurrentVersion: boolean; 
    historyId?: string;
    observations?: AuditObservation[];
}
