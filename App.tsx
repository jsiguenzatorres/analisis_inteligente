
import React, { useState } from 'react';
import { AppState, SamplingMethod, AuditPopulation } from './types';
import Header from './components/layout/Header';
import Step4Results from './components/steps/Step4_Results';
import Dashboard from './components/dashboard/Dashboard';
import SamplingWorkspace from './components/sampling/SamplingWorkspace';
import PopulationManager from './components/data/PopulationManager';
import DataUploadFlow from './components/data/DataUploadFlow';
import ValidationWorkspace from './components/data/ValidationWorkspace';
import Stepper from './components/layout/Stepper';

export type AppView = 'population_manager' | 'data_upload' | 'validation_workspace' | 'dashboard' | 'sampling_config' | 'results';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('population_manager');
    const [currentMethod, setCurrentMethod] = useState<SamplingMethod | null>(null);
    const [activePopulation, setActivePopulation] = useState<AuditPopulation | null>(null);
    const [validationPopulationId, setValidationPopulationId] = useState<string | null>(null);

    const [appState, setAppState] = useState<AppState>({
        connection: { table: '', idColumn: '', valueColumn: '', validated: false, user: '', url: '' },
        selectedPopulation: null,
        generalParams: { objective: '', standard: 'NIA 530', template: 'NIA 530 Detalle', seed: Math.floor(Math.random() * 100000) },
        samplingMethod: SamplingMethod.Attribute,
        samplingParams: {
            attribute: { N: 0, NC: 95, ET: 5, PE: 1, useSequential: false },
            mus: { V: 0, TE: 50000, EE: 500, RIA: 5, optimizeTopStratum: true, handleNegatives: 'Separate', usePilotSample: false },
            cav: { sigma: 0, stratification: true, estimationTechnique: 'Media', usePilotSample: false },
            stratified: { basis: 'Monetary', strataCount: 3, allocationMethod: 'Óptima (Neyman)', certaintyStratumThreshold: 10000, detectOutliers: false, usePilotSample: false },
            nonStatistical: { criteria: '', justification: '' },
        },
        results: null,
        isLocked: false,
        isCurrentVersion: false
    });

    const handlePopulationSelected = (population: AuditPopulation) => {
        setAppState(prev => ({
            ...prev,
            selectedPopulation: population,
            isLocked: false,
            isCurrentVersion: false,
            results: null,
            samplingParams: {
                ...prev.samplingParams,
                attribute: { ...prev.samplingParams.attribute, N: population.row_count },
                mus: { ...prev.samplingParams.mus, V: population.total_monetary_value }
            }
        }));
        setActivePopulation(population);
        setView('dashboard');
    };
    
    const handleUploadComplete = (populationId: string) => {
        setValidationPopulationId(populationId);
        setView('validation_workspace');
    };

    const handleValidationComplete = (population: AuditPopulation) => {
        setValidationPopulationId(null);
        handlePopulationSelected(population);
    };

    const handleMethodSelect = (method: SamplingMethod) => {
        setAppState(prev => ({ ...prev, samplingMethod: method, results: null, isLocked: false, isCurrentVersion: false }));
        setCurrentMethod(method);
        setView('sampling_config');
    };
    
    const navigateTo = (targetView: AppView) => {
        if (targetView === 'population_manager') {
            setAppState(prev => ({...prev, selectedPopulation: null, results: null, isLocked: false, isCurrentVersion: false}));
            setActivePopulation(null);
            setCurrentMethod(null);
        }
        setView(targetView);
    };

    const renderView = () => {
        switch (view) {
            case 'population_manager':
                return <PopulationManager onPopulationSelected={handlePopulationSelected} onAddNew={() => setView('data_upload')} />;
            case 'data_upload':
                return <DataUploadFlow onComplete={handleUploadComplete} onCancel={() => setView('population_manager')} />;
            case 'validation_workspace':
                 if (!validationPopulationId) return <p>ID de población no válido.</p>;
                 return <ValidationWorkspace 
                            populationId={validationPopulationId} 
                            onValidationComplete={handleValidationComplete}
                            onCancel={() => setView('population_manager')}
                        />;
            case 'dashboard':
                if (!activePopulation) return <p>No hay una población activa.</p>;
                return <Dashboard onMethodSelect={handleMethodSelect} population={activePopulation} onNavigate={navigateTo} />;
            case 'sampling_config':
                if (!currentMethod || !activePopulation) return null;
                return <SamplingWorkspace 
                            appState={appState} 
                            setAppState={setAppState} 
                            currentMethod={currentMethod} 
                            onBack={() => setView('dashboard')} 
                            onComplete={() => setView('results')} 
                        />;
            case 'results':
                return <Step4Results 
                            appState={appState} 
                            onBack={() => setView('sampling_config')} 
                            onRestart={() => navigateTo('population_manager')}
                        />;
            default:
                return <PopulationManager onPopulationSelected={handlePopulationSelected} onAddNew={() => setView('data_upload')} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-800">
            <Header onNavigate={navigateTo} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
                {['dashboard', 'sampling_config', 'results'].includes(view) && (
                    <div className="mb-12">
                        <Stepper currentView={view} />
                    </div>
                )}
                {renderView()}
            </main>
        </div>
    );
};

export default App;
