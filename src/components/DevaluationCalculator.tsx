import React, { useState, useEffect } from 'react';
import { TrendingDown, DollarSign, Calculator, AlertTriangle, ArrowRight, RefreshCw, Info, HelpCircle } from 'lucide-react';

interface DevaluationCalculatorProps {
  className?: string;
}

const HISTORICAL_DATA = [
  { year: 2014, rate: 2000.69 },
  { year: 2015, rate: 2744.66 },
  { year: 2016, rate: 3051.94 },
  { year: 2017, rate: 2951.07 },
  { year: 2018, rate: 2967.41 },
  { year: 2019, rate: 3279.94 },
  { year: 2020, rate: 3692.8 },
  { year: 2021, rate: 3745.0 },
  { year: 2022, rate: 4258.0 },
  { year: 2023, rate: 4323.0 },
  { year: 2024, rate: 4072.1 },
  { year: 2025, rate: 4205.3 }
];

// Base year for purchasing power calculation
const BASE_YEAR = 2014;
const BASE_RATE = 2000.69;

export const DevaluationCalculator: React.FC<DevaluationCalculatorProps> = ({ className = "" }) => {
  const [initialAmount, setInitialAmount] = useState(1000000); // 1M COP
  const [selectedYear, setSelectedYear] = useState(2014);
  const [currentYear, setCurrentYear] = useState(2024);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const initialData = HISTORICAL_DATA.find(d => d.year === selectedYear);
  const currentData = HISTORICAL_DATA.find(d => d.year === currentYear);

  // Calculate purchasing power lost based on exchange rate devaluation
  const initialRate = initialData?.rate || BASE_RATE;
  const currentRate = currentData?.rate || 4072.1;
  const devaluationRatio = initialRate / currentRate; // How much 1 COP in initial year is worth today
  const purchasingPowerLost = ((currentRate - initialRate) / initialRate) * 100;

  const initialUSDValue = initialAmount / initialRate;
  const currentCOPValue = initialUSDValue * currentRate;
  const realValue = initialAmount * devaluationRatio; // What the money can actually buy today
  const nominalLoss = currentCOPValue - initialAmount;
  const realLoss = realValue - initialAmount;
  const realLossPercentage = ((initialAmount - realValue) / initialAmount) * 100;

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [initialAmount, selectedYear, currentYear]);

  // Input validation
  const handleAmountChange = (value: string) => {
    const numValue = Number(value);
    if (numValue < 0) {
      setInputError("Amount cannot be negative");
      return;
    }
    if (numValue > 100000000000) { // 100 billion max
      setInputError("Amount is too large");
      return;
    }
    setInputError(null);
    setInitialAmount(numValue);
  };

  const handleYearChange = (year: number, type: 'initial' | 'current') => {
    if (type === 'initial') {
      setSelectedYear(year);
      if (year > currentYear) {
        setCurrentYear(year);
      }
    } else {
      setCurrentYear(year);
    }
  };

  const formatCurrency = (amount: number, currency: 'COP' | 'USD' = 'COP') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Peso Devaluation Calculator</h3>
            <p className="text-red-100 mb-2">Discover how much purchasing power you've lost over time</p>
            <div className="flex items-center gap-2 text-sm text-red-100">
              <Info className="w-4 h-4" />
              <span>Based on real historical COP/USD exchange rates</span>
            </div>
          </div>
          <div className="bg-white/20 p-3 rounded-lg">
            <TrendingDown className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="initial-amount" className="block text-sm font-medium text-gray-700">
                Monto Inicial (COP)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip('amount')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Información sobre el monto inicial"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip === 'amount' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    Ingresa la cantidad de pesos colombianos que tenías o planeas ahorrar en el año seleccionado.
                  </div>
                )}
              </div>
            </div>
            <input
              id="initial-amount"
              type="number"
              step="100000"
              min="0"
              value={initialAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                inputError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ej: 1,000,000"
              aria-describedby={inputError ? "amount-error" : undefined}
            />
            {inputError && (
              <p id="amount-error" className="text-red-600 text-sm mt-1" role="alert">
                {inputError}
              </p>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="starting-year" className="block text-sm font-medium text-gray-700">
                Año de Inicio
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip('start')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Información sobre el año de inicio"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip === 'start' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    Selecciona el año desde el cual quieres calcular la pérdida de poder adquisitivo.
                  </div>
                )}
              </div>
            </div>
            <select
              id="starting-year"
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value), 'initial')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {HISTORICAL_DATA.map(data => (
                <option key={data.year} value={data.year}>{data.year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="compare-year" className="block text-sm font-medium text-gray-700">
                Comparar con el Año
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip('compare')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Información sobre el año de comparación"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip === 'compare' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    Año hasta el cual quieres medir el impacto de la devaluación del peso.
                  </div>
                )}
              </div>
            </div>
            <select
              id="compare-year"
              value={currentYear}
              onChange={(e) => handleYearChange(Number(e.target.value), 'current')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {HISTORICAL_DATA.filter(d => d.year >= selectedYear).map(data => (
                <option key={data.year} value={data.year}>{data.year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Display */}
        <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Exchange Rate Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500" role="region" aria-labelledby="initial-rate-title">
              <div className="flex items-center mb-3">
                <DollarSign className="w-6 h-6 text-blue-600 mr-2" aria-hidden="true" />
                <h4 id="initial-rate-title" className="text-lg font-semibold text-blue-800">
                  Tasa de Cambio en {selectedYear}
                </h4>
              </div>
              <div className="text-3xl font-bold text-blue-900" aria-label={`Tasa de cambio: ${initialData?.rate.toLocaleString()} pesos por dólar`}>
                {initialData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-sm text-blue-700 mt-2">
                Tus {formatCurrency(initialAmount)} = {formatCurrency(initialUSDValue, 'USD')}
              </div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500" role="region" aria-labelledby="current-rate-title">
              <div className="flex items-center mb-3">
                <TrendingDown className="w-6 h-6 text-red-600 mr-2" aria-hidden="true" />
                <h4 id="current-rate-title" className="text-lg font-semibold text-red-800">
                  Tasa de Cambio en {currentYear}
                </h4>
              </div>
              <div className="text-3xl font-bold text-red-900" aria-label={`Tasa de cambio: ${currentData?.rate.toLocaleString()} pesos por dólar`}>
                {currentData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-sm text-red-700 mt-2">
                Los mismos USD = {formatCurrency(currentCOPValue)}
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border border-red-200 mb-6" role="region" aria-labelledby="impact-title">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" aria-hidden="true" />
              <h4 id="impact-title" className="text-xl font-bold text-red-800">Impacto en tu Poder Adquisitivo</h4>
            </div>
            
            <div className="mb-4 p-4 bg-white/50 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>¿Qué significa esto?</strong> Si en {selectedYear} tenías {formatCurrency(initialAmount)}, 
                hoy esa misma cantidad de dinero solo puede comprar lo que costaba {formatCurrency(realValue)} en {selectedYear}. 
                Esto significa que has perdido <strong>{purchasingPowerLost.toFixed(1)}%</strong> de tu poder adquisitivo 
                debido a la devaluación del peso colombiano.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Valor Real Hoy</div>
                <div className="text-2xl font-bold text-red-600" aria-label={`Valor real actual: ${formatCurrency(realValue)}`}>
                  {formatCurrency(realValue)}
                </div>
                <div className="text-xs text-red-500">
                  Lo que realmente puedes comprar
                </div>
              </div>
              
              <div className="text-center bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Pérdida Total</div>
                <div className="text-2xl font-bold text-red-700" aria-label={`Pérdida total: ${formatCurrency(Math.abs(realLoss))}`}>
                  {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-red-500">
                  Dinero que ya no te alcanza
                </div>
              </div>
              
              <div className="text-center bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Poder Adquisitivo Perdido</div>
                <div className="text-3xl font-bold text-red-800" aria-label={`Poder adquisitivo perdido: ${purchasingPowerLost.toFixed(1)} por ciento`}>
                  -{purchasingPowerLost.toFixed(1)}%
                </div>
                <div className="text-xs text-red-500">
                  Por devaluación del peso
                </div>
              </div>
            </div>
          </div>

          {/* VCOP Solution */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-200" role="region" aria-labelledby="vcop-title">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 id="vcop-title" className="text-xl font-bold text-emerald-800 mb-2">
                  Cómo VCOP Te Habría Protegido
                </h4>
                <p className="text-emerald-700">
                  En lugar de mantener pesos, podrías haber conservado tus criptomonedas y usado VCOP cuando necesitaras pesos.
                </p>
              </div>
              <div className="bg-emerald-500 p-3 rounded-lg" aria-hidden="true">
                <Calculator className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-red-200">
                <div className="text-sm text-red-600 mb-1 font-medium">💸 Con Ahorro Tradicional</div>
                <div className="text-xl font-bold text-red-600" aria-label={`Perdiste ${formatCurrency(Math.abs(realLoss))}`}>
                  Perdiste {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-gray-500">
                  -{purchasingPowerLost.toFixed(1)}% poder adquisitivo
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-emerald-200">
                <div className="text-sm text-emerald-600 mb-1 font-medium">🚀 Con Protocolo VCOP</div>
                <div className="text-xl font-bold text-emerald-600" aria-label={`Conservaste ${formatCurrency(initialAmount)}`}>
                  Conservaste {formatCurrency(initialAmount)}
                </div>
                <div className="text-xs text-emerald-500">
                  + potencial alcista de crypto
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-emerald-100 rounded-lg">
              <p className="text-sm text-emerald-800">
                <strong>💡 Dato clave:</strong> Con VCOP puedes mantener tus activos digitales mientras accedes 
                a pesos estables cuando los necesites, protegiéndote de la devaluación.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 mt-6">
          <button 
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-200 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!!inputError}
            aria-label="Protege tu patrimonio con el protocolo VCOP"
          >
            <Calculator className="w-5 h-5" aria-hidden="true" />
            Protege tu Patrimonio con VCOP
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
          
          <button 
            onClick={() => {
              setInitialAmount(1000000);
              setSelectedYear(2014);
              setCurrentYear(2024);
              setInputError(null);
            }}
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            aria-label="Reiniciar calculadora a valores por defecto"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            Reiniciar Calculadora
          </button>
        </div>

        {/* Additional Help Section */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <h5 className="font-medium text-gray-900 mb-1">¿Necesitas ayuda para entender los resultados?</h5>
              <p className="text-sm text-gray-600 leading-relaxed">
                Este calculador muestra el impacto real de la devaluación del peso colombiano en tu dinero. 
                Los datos se basan en tipos de cambio históricos oficiales. VCOP te permite mantener el valor 
                de tus ahorros en activos digitales mientras tienes acceso a pesos cuando los necesites.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};