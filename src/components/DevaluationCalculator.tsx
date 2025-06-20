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
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">Peso Devaluation Calculator</h3>
            <p className="text-red-100 mb-1 text-sm">💸 How much have you lost?</p>
            <div className="flex items-center gap-2 text-xs text-red-100">
              <Info className="w-3 h-3" />
              <span>Real historical data</span>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label htmlFor="initial-amount" className="block text-xs font-medium text-gray-700 mb-1">
              💰 Amount (COP)
            </label>
            <input
              id="initial-amount"
              type="number"
              step="100000"
              min="0"
              value={initialAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                inputError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="1,000,000"
            />
            {inputError && (
              <p className="text-red-600 text-xs mt-1">{inputError}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="starting-year" className="block text-xs font-medium text-gray-700 mb-1">
              📅 From Year
            </label>
            <select
              id="starting-year"
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value), 'initial')}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {HISTORICAL_DATA.map(data => (
                <option key={data.year} value={data.year}>{data.year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="compare-year" className="block text-xs font-medium text-gray-700 mb-1">
              📊 To Year
            </label>
            <select
              id="compare-year"
              value={currentYear}
              onChange={(e) => handleYearChange(Number(e.target.value), 'current')}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500 text-center">
              <div className="text-sm font-semibold text-blue-800 mb-1">
                💵 {selectedYear}
              </div>
              <div className="text-lg font-bold text-blue-900">
                {initialData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-xs text-blue-700">
                {formatCurrency(initialUSDValue, 'USD')}
              </div>
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500 text-center">
              <div className="text-sm font-semibold text-red-800 mb-1">
                📉 {currentYear}
              </div>
              <div className="text-lg font-bold text-red-900">
                {currentData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-xs text-red-700">
                {formatCurrency(currentCOPValue)}
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-red-200 mb-3">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <h4 className="text-base font-bold text-red-800">💸 Impact on Your Money</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">💰 Real Value</div>
                <div className="text-sm font-bold text-red-600">
                  {formatCurrency(realValue)}
                </div>
                <div className="text-xs text-red-500">
                  What you can buy
                </div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">📉 Loss</div>
                <div className="text-sm font-bold text-red-700">
                  {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-red-500">
                  Money lost
                </div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">⚠️ Power Lost</div>
                <div className="text-lg font-bold text-red-800">
                  -{purchasingPowerLost.toFixed(1)}%
                </div>
                <div className="text-xs text-red-500">
                  Due to devaluation
                </div>
              </div>
            </div>
          </div>

          {/* VCOP Solution */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-emerald-800">
                🚀 How VCOP Protects You
              </h4>
              <Calculator className="w-5 h-5 text-emerald-600" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-lg border-2 border-red-200 text-center">
                <div className="text-xs text-red-600 mb-1 font-medium">💸 Traditional</div>
                <div className="text-sm font-bold text-red-600">
                  Lost {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-gray-500">
                  -{purchasingPowerLost.toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-white p-2 rounded-lg border-2 border-emerald-200 text-center">
                <div className="text-xs text-emerald-600 mb-1 font-medium">🚀 VCOP</div>
                <div className="text-sm font-bold text-emerald-600">
                  Kept {formatCurrency(initialAmount)}
                </div>
                <div className="text-xs text-emerald-500">
                  + crypto gains 📈
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200 mt-3">
          <button 
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 text-sm rounded-lg transition-all flex items-center justify-center gap-2"
            disabled={!!inputError}
          >
            <Calculator className="w-4 h-4" />
            🚀 Protect with VCOP
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => {
              setInitialAmount(1000000);
              setSelectedYear(2014);
              setCurrentYear(2024);
              setInputError(null);
            }}
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 text-sm rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};