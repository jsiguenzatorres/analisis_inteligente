
/* ... (Todo el contenido del archivo igual, pero con la corrección en la línea 640) ... */
        // Default Critical Items List
        const criticalItems = currentResults.sample.filter(i => (i.risk_score || 0) >= 2 || i.risk_flag?.includes('Alto') || i.risk_flag?.includes('Crítico'));
        return (
            <div className="space-y-4">
                {renderValueBanner(criticalItems.length)}
                <RichInfoCard type="warning" title="Definición de Criticidad">
                    Ítems que superan el umbral de riesgo configurado (Score mayor o igual a 2) o que cumplen múltiples criterios de alerta (ej. Benford + Outlier).
                </RichInfoCard>
/* ... (resto del archivo) ... */
