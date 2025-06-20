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
  const [isAnimating, setIsAnimating] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Fixed years for 2014-2024 comparison
  const selectedYear = 2014;
  const currentYear = 2024;
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
  }, [initialAmount]);

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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold mb-1">Peso Devaluation Calculator</h3>
            <p className="text-red-100 text-sm">💸 How much have you lost?</p>
            <div className="flex items-center gap-2 text-xs text-red-100 mt-1">
              <Info className="w-3 h-3" />
              <span>Real historical data</span>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
        
        {/* Additional padding to match RiskCalculator height */}
        <div className="h-10"></div>
      </div>

      <div className="p-3">
                {/* Amount Selector */}
        <div className="mb-1">
          <h4 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-red-600" />
            Loss Calculator
          </h4>
          <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                💰 Select your COP amount (2014-2024):
              </span>
              <span className="text-lg font-bold text-red-600">-{purchasingPowerLost.toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[500000, 1000000, 5000000, 10000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setInitialAmount(amount)}
                  className={`p-2 rounded-lg border-2 transition-all duration-300 text-center ${
                    initialAmount === amount
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <div className="text-base font-bold text-gray-900">
                    {(amount / 1000000).toFixed(amount < 1000000 ? 1 : 0)}M
                  </div>
                  <div className="text-xs text-gray-600">COP</div>
                </button>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-sm text-gray-600">Selected: </span>
              <span className="font-bold text-gray-900">{formatCurrency(initialAmount)}</span>
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Impact Analysis */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-red-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-red-800">💸 Impact on Your Money</h4>
              <div className="text-lg font-bold text-red-800">
                -{purchasingPowerLost.toFixed(1)}%
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">💰 Real Value</div>
                <div className="text-sm font-bold text-red-600">
                  {formatCurrency(realValue)}
                </div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">📉 Loss</div>
                <div className="text-sm font-bold text-red-700">
                  {formatCurrency(Math.abs(realLoss))}
                </div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">🚀 VCOP</div>
                <div className="text-sm font-bold text-emerald-600">
                  {formatCurrency(initialAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* VCOP Solution */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-lg border border-emerald-200 mb-4">
            <h5 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              🚀 How VCOP Protects You
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center bg-white p-2 rounded-lg border-2 border-red-200">
                <div className="text-xs text-red-600 mb-1 font-medium">💸 Traditional</div>
                <div className="text-sm font-bold text-red-600">
                  Lost {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-gray-500">
                  -{purchasingPowerLost.toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg border-2 border-emerald-200">
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

          {/* Live Impact */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
            <h5 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              📊 Live Impact
            </h5>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-white p-2 rounded-lg">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                  purchasingPowerLost > 50 
                    ? 'bg-red-100 text-red-600' 
                    : purchasingPowerLost > 20 
                    ? 'bg-yellow-100 text-yellow-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {purchasingPowerLost > 50 ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                </div>
                <div className="text-xs text-gray-600 mt-1">Risk</div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-sm font-bold text-gray-900">
                  {purchasingPowerLost > 50 ? '0.8' : purchasingPowerLost > 20 ? '1.2' : '1.8'}
                </div>
                <div className="text-xs text-gray-600">Health</div>
              </div>
              
              <div className="text-center bg-white p-2 rounded-lg">
                <div className="text-sm font-bold text-gray-900">
                  {purchasingPowerLost.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Loss</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200 mt-4">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 text-sm rounded-lg transition-all flex items-center justify-center gap-2">
            <Calculator className="w-4 h-4" />
            🚀 Protect with VCOP
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => {
              setInitialAmount(1000000);
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