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
                Initial Amount (COP)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip('amount')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Information about initial amount"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip === 'amount' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    Enter the amount of Colombian pesos you had or plan to save in the selected year.
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
              placeholder="e.g., 1,000,000"
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
                Starting Year
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip('start')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Information about starting year"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip === 'start' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    Select the year from which you want to calculate the loss of purchasing power.
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
                Compare to Year
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip('compare')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Information about comparison year"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip === 'compare' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    Year up to which you want to measure the impact of peso devaluation.
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
                  Exchange Rate in {selectedYear}
                </h4>
              </div>
              <div className="text-3xl font-bold text-blue-900" aria-label={`Exchange rate: ${initialData?.rate.toLocaleString()} pesos per dollar`}>
                {initialData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-sm text-blue-700 mt-2">
                Your {formatCurrency(initialAmount)} = {formatCurrency(initialUSDValue, 'USD')}
              </div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500" role="region" aria-labelledby="current-rate-title">
              <div className="flex items-center mb-3">
                <TrendingDown className="w-6 h-6 text-red-600 mr-2" aria-hidden="true" />
                <h4 id="current-rate-title" className="text-lg font-semibold text-red-800">
                  Exchange Rate in {currentYear}
                </h4>
              </div>
              <div className="text-3xl font-bold text-red-900" aria-label={`Exchange rate: ${currentData?.rate.toLocaleString()} pesos per dollar`}>
                {currentData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-sm text-red-700 mt-2">
                Same USD = {formatCurrency(currentCOPValue)}
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border border-red-200 mb-6" role="region" aria-labelledby="impact-title">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" aria-hidden="true" />
              <h4 id="impact-title" className="text-xl font-bold text-red-800">Impact on Your Purchasing Power</h4>
            </div>
            
            <div className="mb-4 p-4 bg-white/50 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>What does this mean?</strong> If in {selectedYear} you had {formatCurrency(initialAmount)}, 
                today that same amount of money can only buy what {formatCurrency(realValue)} could buy in {selectedYear}. 
                This means you have lost <strong>{purchasingPowerLost.toFixed(1)}%</strong> of your purchasing power 
                due to Colombian peso devaluation.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Real Value Today</div>
                <div className="text-2xl font-bold text-red-600" aria-label={`Real value today: ${formatCurrency(realValue)}`}>
                  {formatCurrency(realValue)}
                </div>
                <div className="text-xs text-red-500">
                  What you can actually buy
                </div>
              </div>
              
              <div className="text-center bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Loss</div>
                <div className="text-2xl font-bold text-red-700" aria-label={`Total loss: ${formatCurrency(Math.abs(realLoss))}`}>
                  {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-red-500">
                  Money you can no longer afford
                </div>
              </div>
              
              <div className="text-center bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Purchasing Power Lost</div>
                <div className="text-3xl font-bold text-red-800" aria-label={`Purchasing power lost: ${purchasingPowerLost.toFixed(1)} percent`}>
                  -{purchasingPowerLost.toFixed(1)}%
                </div>
                <div className="text-xs text-red-500">
                  Due to peso devaluation
                </div>
              </div>
            </div>
          </div>

          {/* VCOP Solution */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-200" role="region" aria-labelledby="vcop-title">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 id="vcop-title" className="text-xl font-bold text-emerald-800 mb-2">
                  How VCOP Would Have Protected You
                </h4>
                <p className="text-emerald-700">
                  Instead of holding pesos, you could have kept your cryptocurrencies and used VCOP when you needed pesos.
                </p>
              </div>
              <div className="bg-emerald-500 p-3 rounded-lg" aria-hidden="true">
                <Calculator className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-red-200">
                <div className="text-sm text-red-600 mb-1 font-medium">💸 With Traditional Savings</div>
                <div className="text-xl font-bold text-red-600" aria-label={`You lost ${formatCurrency(Math.abs(realLoss))}`}>
                  You lost {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-gray-500">
                  -{purchasingPowerLost.toFixed(1)}% purchasing power
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-emerald-200">
                <div className="text-sm text-emerald-600 mb-1 font-medium">🚀 With VCOP Protocol</div>
                <div className="text-xl font-bold text-emerald-600" aria-label={`You kept ${formatCurrency(initialAmount)}`}>
                  You kept {formatCurrency(initialAmount)}
                </div>
                <div className="text-xs text-emerald-500">
                  + crypto upside potential
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-emerald-100 rounded-lg">
              <p className="text-sm text-emerald-800">
                <strong>💡 Key insight:</strong> With VCOP you can keep your digital assets while accessing 
                stable pesos when you need them, protecting yourself from devaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 mt-6">
          <button 
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-200 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!!inputError}
            aria-label="Protect your wealth with VCOP protocol"
          >
            <Calculator className="w-5 h-5" aria-hidden="true" />
            Protect Your Wealth with VCOP
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
            aria-label="Reset calculator to default values"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            Reset Calculator
          </button>
        </div>

        {/* Additional Help Section */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <h5 className="font-medium text-gray-900 mb-1">Need help understanding the results?</h5>
              <p className="text-sm text-gray-600 leading-relaxed">
                This calculator shows the real impact of Colombian peso devaluation on your money. 
                The data is based on official historical exchange rates. VCOP allows you to maintain the value 
                of your savings in digital assets while having access to pesos when you need them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};