
import React from 'react';
import { RichInfoCard } from './components/ui/RichInfoCard';

export const InfoIcon = () => (
    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors duration-200 cursor-pointer shadow-sm border border-blue-200">
        <i className="fas fa-info text-xs font-bold"></i>
    </div>
);

export const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

export const ASSISTANT_CONTENT = {
    poblacionTotal: {
        title: 'Población Total (N)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Es el número total de unidades de muestreo (registros, facturas, líneas) que componen el universo sujeto a auditoría.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Justificación Técnica">
                    Necesario para determinar si aplica el "factor de corrección para poblaciones finitas" y para extrapolar los resultados de la muestra al total.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Para poblaciones grandes (>5,000), el tamaño tiene un impacto despreciable. En poblaciones pequeñas, reduce el tamaño de muestra requerido.
                </RichInfoCard>
            </div>
        ),
    },
    nivelConfianza: {
        title: 'Nivel de Confianza (NC)',
        content: (
             <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Probabilidad estadística de que los resultados de la muestra representen fielmente a la población real (Complemento del Riesgo de Muestreo).
                </RichInfoCard>
                <RichInfoCard type="justification" title="Relación con el Riesgo">
                    A mayor Nivel de Confianza, menor es el Riesgo de Aceptación Incorrecta (Beta) que el auditor está dispuesto a asumir.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Directa: Un mayor nivel de confianza (ej. 95% vs 90%) incrementa drásticamente el tamaño de la muestra.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar">
                    <ul className="list-disc list-inside">
                        <li><strong>90% - 95%:</strong> Pruebas Sustantivas y de Cumplimiento estándar.</li>
                        <li><strong>98% - 99%:</strong> Áreas críticas o forenses.</li>
                    </ul>
                </RichInfoCard>
            </div>
        ),
    },
    desviacionTolerable: {
        title: 'Desviación Tolerable (ET)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Tasa máxima de error o desviación que el auditor está dispuesto a aceptar en la población sin cambiar su evaluación de control.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Inversa: Un ET más bajo (más estricto) requiere un tamaño de muestra significativamente mayor.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar (NIA 530)">
                    <ul className="list-disc list-inside">
                        <li><strong>2% - 5%:</strong> Controles Críticos / Alto Riesgo.</li>
                        <li><strong>6% - 10%:</strong> Controles Moderados / Bajo Riesgo.</li>
                    </ul>
                </RichInfoCard>
            </div>
        ),
    },
    desviacionEsperada: {
        title: 'Desviación Esperada (PE)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    La tasa de error que el auditor anticipa encontrar antes de comenzar la prueba, basada en experiencia previa o pruebas piloto.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Directa: Cuantos más errores se esperan, mayor debe ser la muestra para confirmar que no exceden lo tolerable.
                </RichInfoCard>
                <RichInfoCard type="warning" title="Regla Crítica">
                    El PE debe ser siempre menor que el ET. Si PE ≥ ET, el muestreo estadístico no es viable.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar">
                    Generalmente 0% (cero errores) o valores muy bajos (0.5% - 1.5%) para controles efectivos.
                </RichInfoCard>
            </div>
        ),
    },
    valorTotalPoblacion: {
        title: 'Valor Total de la Población (V)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Suma absoluta de los importes monetarios de todos los ítems en la población.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Uso Técnico (MUS)">
                    En MUS, este valor define el "tamaño" del universo sobre el cual se calcula el Intervalo de Muestreo. Cada unidad monetaria ($1) tiene la misma probabilidad de selección.
                </RichInfoCard>
            </div>
        ),
    },
    errorTolerable: {
        title: 'Error Tolerable Monetario (TE)',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Monto máximo de error monetario que puede existir en la cuenta sin que los estados financieros estén materialmente incorrectos (Materialidad de Ejecución).
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto">
                    Un TE menor (más estricto) reduce el intervalo de muestreo y aumenta el tamaño de la muestra.
                </RichInfoCard>
                 <RichInfoCard type="standard" title="Rango Estándar">
                    Generalmente 50% - 75% de la Materialidad Global.
                </RichInfoCard>
            </div>
        ),
    },
    erroresPrevistos: {
        title: 'Total de Errores Previstos (EE)',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Estimación del monto total de error que ya existe en la población (Anticipación).
                </RichInfoCard>
                <RichInfoCard type="warning" title="Advertencia de Eficiencia">
                    Si EE es alto (>50% de TE), el método MUS se vuelve ineficiente y produce muestras excesivamente grandes. Considere CAV.
                </RichInfoCard>
            </div>
        ),
    },
    riesgoAceptacionIncorrecta: {
        title: 'Riesgo de Aceptación Incorrecta (RIA)',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Riesgo Beta: La probabilidad de concluir que el saldo es correcto cuando en realidad contiene un error material.
                </RichInfoCard>
                 <RichInfoCard type="standard" title="Valores Estándar">
                    <ul className="list-disc list-inside">
                        <li><strong>5%:</strong> Alto nivel de seguridad (Confianza 95%).</li>
                        <li><strong>10%:</strong> Nivel moderado (Confianza 90%).</li>
                        <li><strong>37% - 50%:</strong> Cuando se confía plenamente en otros controles sustantivos.</li>
                    </ul>
                </RichInfoCard>
            </div>
        ),
    },
    desviacionEstandar: {
        title: 'Desviación Estándar Esperada (σ)',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Es la medida de cuánto se alejan los importes individuales del promedio de la población. A mayor dispersión (heterogeneidad), mayor será la muestra necesaria.
                </RichInfoCard>
                <RichInfoCard type="tip" title="Cálculo Automático">
                    Al activar la opción "Muestra Piloto", el sistema selecciona aleatoriamente 50 ítems y calcula la desviación estándar real de este subconjunto para usarla en la fórmula.
                </RichInfoCard>
            </div>
        ),
    },
    muestraPiloto: {
        title: 'Muestra Piloto (Pre-Muestreo)',
        content: (
             <div className="space-y-4">
                 <RichInfoCard type="formula" title="Propósito">
                    Permite estimar la desviación estándar (σ) cuando no se tienen datos históricos confiables.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Funcionamiento">
                    El sistema toma una "foto" rápida de 50 registros para calibrar la variabilidad antes de calcular el tamaño final de la muestra (n). Esto evita muestras excesivamente grandes o insuficientes.
                </RichInfoCard>
            </div>
        )
    },
    tecnicaEstimacion: {
        title: 'Técnica de Estimación Post-Prueba',
        content: (
             <div className="space-y-4">
                 <RichInfoCard type="justification" title="Guía de Selección">
                    <ul className="list-none space-y-3">
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Media por Unidad (Mean-per-Unit):</strong> Úsela si NO espera encontrar errores. Calcula el promedio de la muestra y lo multiplica por N.</li>
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Diferencia (Difference):</strong> Ideal cuando hay errores y estos tienden a ser constantes (ej. siempre fallan por $100). Requiere encontrar errores en la muestra.</li>
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Razón / Tasa Combinada (Ratio):</strong> Ideal cuando los errores son proporcionales al valor del ítem (ej. error del 5% del valor). Suele ser la más eficiente.</li>
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Regresión:</strong> Método avanzado para relaciones lineales complejas entre valor en libros y auditado.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    estratificacion: {
        title: 'Estratificación Obligatoria',
        content: (
             <div className="space-y-4">
                 <RichInfoCard type="definition" title="Recomendación">
                    En CAV, la estratificación es casi obligatoria. Sin ella, la variabilidad (σ) de la población completa suele ser tan alta que la fórmula resultará en un tamaño de muestra impráctico (ej. >500).
                </RichInfoCard>
                <RichInfoCard type="tip" title="¿Cuándo NO usarla?">
                    Solo si la población es extremadamente homogénea (ej. todas las transacciones son de $50.00 ± $1.00).
                </RichInfoCard>
            </div>
        ),
    },
    cantidadEstratos: {
        title: 'Cantidad de Estratos',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Número de subgrupos en los que se dividirá la población. Cada grupo debe ser mutuamente excluyente.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Práctica Común">
                    Generalmente entre 3 y 5 estratos son suficientes para reducir significativamente la varianza.
                </RichInfoCard>
            </div>
        )
    },
    metodoAsignacion: {
        title: 'Método de Asignación',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="justification" title="Opciones">
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Proporcional:</strong> El tamaño de muestra de cada estrato es proporcional a su tamaño en la población.</li>
                        <li><strong>Óptima (Neyman):</strong> Asigna más muestra a estratos con mayor variabilidad o valor monetario (más eficiente).</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    umbralCerteza: {
        title: 'Umbral de Certeza (Top Stratum)',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Valor monetario a partir del cual todos los ítems serán seleccionados al 100% (Estrato de Certeza).
                </RichInfoCard>
                <RichInfoCard type="justification" title="Uso">
                    Garantiza que las partidas más significativas no queden fuera de la muestra por azar.
                </RichInfoCard>
            </div>
        )
    },
    semilla: {
        title: 'Mecanismo de Semilla (Seed)',
        content: (
             <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Valor inicial para el algoritmo generador de números pseudoaleatorios (PRNG).
                </RichInfoCard>
                <RichInfoCard type="standard" title="Propósito: Replicabilidad">
                    Permite que cualquier tercero (ej. regulador o revisor de calidad) genere <strong>exactamente la misma muestra</strong> utilizando los mismos parámetros, garantizando transparencia.
                </RichInfoCard>
            </div>
        ),
    },
    criterioJuicio: {
        title: 'Criterio de Juicio Profesional',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Selección intencional basada en la experiencia del auditor para cubrir riesgos específicos (ej. partidas sospechosas, montos redondos, proveedores nuevos).
                </RichInfoCard>
                <RichInfoCard type="warning" title="Limitación Importante">
                    No permite extrapolación estadística. Los resultados solo aplican a los elementos seleccionados, no a toda la población.
                </RichInfoCard>
            </div>
        ),
    },
    tablaVista: {
        title: 'Tabla o Vista de Base de Datos',
        content: (
             <div className="space-y-4">
                 <RichInfoCard type="definition" title="Fuente de Datos">
                    Objeto de la base de datos que contiene el universo completo.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Integridad">
                    Se recomienda usar Vistas (Views) inmutables para garantizar que la población no cambie durante la auditoría.
                </RichInfoCard>
            </div>
        ),
    },
    columnaId: {
        title: 'Columna de ID Única',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Campo clave (PK) que permite identificar inequívocamente cada registro (ej. Numero_Factura, ID_Asiento).
                </RichInfoCard>
                <RichInfoCard type="impact" title="Propósito">
                    Esencial para localizar la evidencia física o digital de los ítems seleccionados en la muestra.
                </RichInfoCard>
            </div>
        ),
    },
    columnaValor: {
        title: 'Columna de Valor Monetario',
        content: (
            <div className="space-y-4">
                 <RichInfoCard type="definition" title="Definición">
                    Campo numérico que contiene el importe financiero a auditar.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Tratamiento">
                    Para MUS, se utilizan valores absolutos. Asegúrese de que no haya campos nulos o formatos de texto.
                </RichInfoCard>
            </div>
        ),
    },
};
