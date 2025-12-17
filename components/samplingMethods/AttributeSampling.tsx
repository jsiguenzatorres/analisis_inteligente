
import React, { useState, useRef, useEffect } from 'react';
import { AppState } from '../../types';
import InfoHelper from '../ui/InfoHelper';
import { ASSISTANT_CONTENT, WarningIcon } from '../../constants';

// --- Types & Interfaces ---

interface PremiumVariableCardProps {
    title: string;
    icon: string;
    colorTheme: 'blue' | 'amber' | 'teal' | 'slate';
    infoKey: keyof typeof ASSISTANT_CONTENT;
    children: React.ReactNode;
    subtitle: string;
    currentValue?: string | number; // Added prop for passing value to modal
}

interface DropdownOption {
    value: number;
    label: string;
    annotation?: string;
}

interface CustomDropdownProps {
    value: number;
    options: DropdownOption[];
    onChange: (value: number) => void;
    colorTheme: 'blue' | 'amber' | 'teal';
}

// --- Helper Components ---

const PremiumVariableCard: React.FC<PremiumVariableCardProps> = ({ 
    title, 
    icon, 
    colorTheme, 
    infoKey, 
    children, 
    subtitle,
    currentValue
}) => {
    const themeClasses = {
        blue: 'border-l-blue-500 shadow-blue-100 hover:shadow-blue-200',
        amber: 'border-l-amber-500 shadow-amber-100 hover:shadow-amber-200',
        teal: 'border-l-teal-500 shadow-teal-100 hover:shadow-teal-200',
        slate: 'border-l-slate-500 shadow-slate-100 hover:shadow-slate-200',
    };

    const iconColors = {
        blue: 'text-blue-600 bg-blue-50',
        amber: 'text-amber-600 bg-amber-50',
        teal: 'text-teal-600 bg-teal-50',
        slate: 'text-slate-600 bg-slate-50',
    };

    return (
        <div className={`bg-white p-6 rounded-xl border border-gray-100 border-l-[6px] shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${themeClasses[colorTheme]} group h-full flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className={`p-2.5 rounded-lg mr-3 transition-colors ${iconColors[colorTheme]}`}>
                        <i className={`fas ${icon} text-lg`}></i>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-800 uppercase tracking-wide block group-hover:text-gray-900 transition-colors">
                            {title}
                        </label>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{subtitle}</p>
                    </div>
                </div>
                <div className="text-gray-400 hover:text-blue-600 transition-colors">
                    <InfoHelper 
                        title={ASSISTANT_CONTENT[infoKey].title} 
                        content={ASSISTANT_CONTENT[infoKey].content} 
                        currentValue={currentValue}
                    />
                </div>
            </div>
            <div className="relative mt-auto z-10">
                {children}
            </div>
        </div>
    );
};

const CustomGradientDropdown: React.FC<CustomDropdownProps> = ({ value, options, onChange, colorTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Theme Configurations
    const themes = {
        blue: {
            button: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-200',
            activeItem: 'bg-blue-50 text-blue-700',
            ring: 'ring-blue-200',
            icon: 'text-blue-100',
            check: 'text-blue-600'
        },
        amber: {
            button: 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white shadow-amber-200',
            activeItem: 'bg-amber-50 text-amber-700',
            ring: 'ring-amber-200',
            icon: 'text-amber-100',
            check: 'text-amber-600'
        },
        teal: {
            button: 'bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500 text-white shadow-teal-200',
            activeItem: 'bg-teal-50 text-teal-700',
            ring: 'ring-teal-200',
            icon: 'text-teal-100',
            check: 'text-teal-600'
        }
    };

    const currentTheme = themes[colorTheme];
    const selectedOption = options.find(opt => opt.value === value);

    // Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: number) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-lg shadow-md flex items-center justify-between transition-all duration-200 transform active:scale-[0.98] focus:outline-none focus:ring-4 ${currentTheme.ring} ${currentTheme.button}`}
            >
                <div className="flex flex-col items-start text-left">
                    <span className="text-lg font-bold leading-none tracking-tight">{selectedOption?.label}</span>
                    {selectedOption?.annotation && (
                         <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90 mt-1">{selectedOption.annotation}</span>
                    )}
                </div>
                <i className={`fas fa-chevron-down transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${currentTheme.icon}`}></i>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-up max-h-64 overflow-y-auto custom-scrollbar">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={`px-4 py-3 cursor-pointer flex justify-between items-center transition-colors border-b border-gray-50 last:border-0 hover:bg-gray-50 ${option.value === value ? currentTheme.activeItem : 'text-gray-700'}`}
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{option.label}</span>
                                {option.annotation && (
                                    <span className={`text-[10px] uppercase font-bold mt-0.5 ${option.value === value ? 'opacity-80' : 'text-gray-400'}`}>
                                        {option.annotation}
                                    </span>
                                )}
                            </div>
                            {option.value === value && (
                                <i className={`fas fa-check ${currentTheme.check}`}></i>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Main Component ---

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const AttributeSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.attribute;
    
    const confidenceOptions: DropdownOption[] = [
        { value: 90, label: '90%', annotation: 'Moderado (Bajo Riesgo)' },
        { value: 92, label: '92%', annotation: 'Intermedio' },
        { value: 95, label: '95%', annotation: 'Estándar (Alto Riesgo)' },
        { value: 98, label: '98%', annotation: 'Muy Alto' },
        { value: 99, label: '99%', annotation: 'Crítico / Forense' },
    ];

    const tolerableOptions: DropdownOption[] = [
        { value: 2, label: '2%', annotation: 'Muy Estricto' },
        { value: 3, label: '3%', annotation: 'Estricto' },
        { value: 4, label: '4%', annotation: 'Control Clave' },
        { value: 5, label: '5%', annotation: 'Estándar (NIA)' },
        { value: 6, label: '6%', annotation: 'Moderado' },
        { value: 7, label: '7%', annotation: 'Flexible' },
        { value: 8, label: '8%', annotation: 'Bajo Riesgo' },
        { value: 9, label: '9%', annotation: 'Bajo Riesgo' },
        { value: 10, label: '10%', annotation: 'Muy Flexible' },
    ];

    const expectedOptions: DropdownOption[] = [
        { value: 0, label: '0%', annotation: 'Sin Errores Previstos' },
        { value: 0.25, label: '0.25%', annotation: 'Mínimo' },
        { value: 0.5, label: '0.5%', annotation: 'Muy Bajo' },
        { value: 1, label: '1.0%', annotation: 'Bajo' },
        { value: 1.25, label: '1.25%', annotation: 'Moderado Bajo' },
        { value: 1.5, label: '1.5%', annotation: 'Moderado' },
        { value: 2, label: '2.0%', annotation: 'Significativo' },
        { value: 2.5, label: '2.5%', annotation: 'Alto' },
        { value: 3, label: '3.0%', annotation: 'Muy Alto' },
        { value: 3.5, label: '3.5%', annotation: 'Crítico' },
        { value: 4, label: '4.0%', annotation: 'Excesivo' },
        { value: 5, label: '5.0%', annotation: 'No Recomendado' },
    ];

    const handleCustomChange = (name: string, value: number) => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                attribute: {
                    ...prev.samplingParams.attribute,
                    [name]: value
                }
            }
        }));
    };
    
    const toggleSequential = () => {
        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                attribute: {
                    ...prev.samplingParams.attribute,
                    useSequential: !prev.samplingParams.attribute.useSequential
                }
            }
        }));
    };

    const isPeCloseToEt = params.PE >= params.ET / 2 && params.PE < params.ET;
    const isPeInvalid = params.PE >= params.ET;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Intro Banner */}
            <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start">
                 <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white mr-5 shadow-md">
                    <i className="fas fa-bullseye text-2xl"></i>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Muestreo de Atributos (Pruebas de Control)</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        Este método estadístico se utiliza para estimar la tasa de desviación de un control interno prescrito. 
                        Basado en la distribución Binomial/Hipergeométrica.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card: Población */}
                <PremiumVariableCard 
                    title="Población (N)" 
                    subtitle="Universo Total"
                    icon="fa-users" 
                    colorTheme="slate" 
                    infoKey="poblacionTotal"
                    currentValue={params.N.toLocaleString()}
                >
                    <div className="relative rounded-lg shadow-inner bg-slate-100 p-1">
                        <div className="flex items-center bg-white rounded-md border border-slate-200 px-4 py-3">
                            <span className="flex-grow font-mono text-xl font-bold text-slate-700">{params.N.toLocaleString()}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">Registros</span>
                        </div>
                    </div>
                </PremiumVariableCard>

                {/* Card: Nivel de Confianza (Custom Dropdown) */}
                <PremiumVariableCard 
                    title="Nivel de Confianza (NC)" 
                    subtitle="Seguridad Estadística"
                    icon="fa-shield-alt" 
                    colorTheme="blue" 
                    infoKey="nivelConfianza"
                    currentValue={`${params.NC}%`}
                >
                    <CustomGradientDropdown 
                        value={params.NC}
                        options={confidenceOptions}
                        onChange={(val) => handleCustomChange('NC', val)}
                        colorTheme="blue"
                    />
                </PremiumVariableCard>

                {/* Card: Desviación Tolerable (Custom Dropdown) */}
                <PremiumVariableCard 
                    title="Desviación Tolerable (ET)" 
                    subtitle="Umbral de Riesgo"
                    icon="fa-exclamation-triangle" 
                    colorTheme="amber" 
                    infoKey="desviacionTolerable"
                    currentValue={`${params.ET}%`}
                >
                    <CustomGradientDropdown 
                        value={params.ET}
                        options={tolerableOptions}
                        onChange={(val) => handleCustomChange('ET', val)}
                        colorTheme="amber"
                    />
                </PremiumVariableCard>

                {/* Card: Desviación Esperada (Custom Dropdown) */}
                <PremiumVariableCard 
                    title="Desviación Esperada (PE)" 
                    subtitle="Anticipación de Error"
                    icon="fa-history" 
                    colorTheme="teal" 
                    infoKey="desviacionEsperada"
                    currentValue={`${params.PE}%`}
                >
                    <div className={`${isPeInvalid ? 'ring-2 ring-red-500 rounded-lg' : ''}`}>
                         <CustomGradientDropdown 
                            value={params.PE}
                            options={expectedOptions}
                            onChange={(val) => handleCustomChange('PE', val)}
                            colorTheme="teal"
                        />
                    </div>
                </PremiumVariableCard>
            </div>
            
            {/* Sequential Toggle */}
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                        <i className="fas fa-step-forward"></i>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">Muestreo Secuencial (Stop-or-Go)</h4>
                        <p className="text-xs text-gray-500">Comienza con una muestra pequeña (ej. 25). Si hay 0 errores, se detiene.</p>
                    </div>
                </div>
                 <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                        type="checkbox" 
                        name="toggle" 
                        id="sequential-toggle" 
                        checked={params.useSequential}
                        onChange={toggleSequential}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-blue-600 transition-all duration-300"
                        style={{right: params.useSequential ? '0' : 'auto', left: params.useSequential ? 'auto' : '0'}}
                    />
                    <label 
                        htmlFor="sequential-toggle" 
                        className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${params.useSequential ? 'bg-blue-600' : 'bg-gray-300'}`}
                    ></label>
                </div>
            </div>

            {(isPeCloseToEt || isPeInvalid) && (
                <div className={`mt-6 p-5 rounded-xl flex items-start border shadow-md animate-fade-in-up ${isPeInvalid ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex-shrink-0 mt-1">
                        <div className={`p-2 rounded-full ${isPeInvalid ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            <WarningIcon />
                        </div>
                    </div>
                    <div className="ml-4">
                        <h3 className={`text-sm font-bold uppercase tracking-wide ${isPeInvalid ? 'text-red-800' : 'text-amber-800'}`}>
                            {isPeInvalid ? 'Configuración Crítica Inválida' : 'Advertencia de Eficiencia'}
                        </h3>
                        <div className={`mt-2 text-sm leading-relaxed ${isPeInvalid ? 'text-red-700' : 'text-amber-700'}`}>
                           <p>
                             {isPeInvalid 
                                ? 'La Desviación Esperada (PE) debe ser estricamente menor que la Desviación Tolerable (ET) para que el muestreo sea estadísticamente viable.'
                                : 'La Desviación Esperada está próxima a la Tolerable. Esto resultará en un tamaño de muestra considerablemente mayor para mantener la confianza estadística.'
                             }
                           </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttributeSampling;
