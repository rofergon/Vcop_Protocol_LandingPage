import React, { useState, useEffect } from 'react';
import { TrendingDown, DollarSign, Calculator, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

interface DevaluationCalculatorProps {
  className?: string;
}

const HISTORICAL_DATA = [
  { year: 2014, rate: 2600, purchasing_power: 100 },
  { year: 2015, rate: 3050, purchasing_power: 85.2 },
  { year: 2016, rate: 3000, purchasing_power: 86.7 },
  { year: 2017, rate: 2951, purchasing_power: 88.1 },
  { year: 2018, rate: 3249, purchasing_power: 80.0 },
  { year: 2019, rate: 3277, purchasing_power: 79.4 },
  { year: 2020, rate: 3693, purchasing_power: 70.4 },
  { year: 2021, rate: 3743, purchasing_power: 69.5 },
  { year: 2022, rate: 4256, purchasing_power: 61.1 },
  { year: 2023, rate: 4326, purchasing_power: 60.1 },
  { year: 2024, rate: 4247, purchasing_power: 61.2 }
];

export const DevaluationCalculator: React.FC<DevaluationCalculatorProps> = ({ className = "" }) => {
  const [initialAmount, setInitialAmount] = useState(1000000); // 1M COP
  const [selectedYear, setSelectedYear] = useState(2014);
  const [currentYear, setCurrentYear] = useState(2024);
  const [isAnimating, setIsAnimating] = useState(false);

  const initialData = HISTORICAL_DATA.find(d => d.year === selectedYear);
  const currentData = HISTORICAL_DATA.find(d => d.year === currentYear);

  const initialUSDValue = initialAmount / (initialData?.rate || 2600);
  const currentCOPValue = initialUSDValue * (currentData?.rate || 4247);
  const realValue = (initialAmount * (currentData?.purchasing_power || 61.2)) / 100;
  const nominalLoss = currentCOPValue - initialAmount;
  const realLoss = realValue - initialAmount;
  const realLossPercentage = ((initialAmount - realValue) / initialAmount) * 100;

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [initialAmount, selectedYear, currentYear]);

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
            <p className="text-red-100">See how much purchasing power you've lost</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Amount (COP)</label>
            <input
              type="number"
              step="100000"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="1,000,000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Starting Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {HISTORICAL_DATA.map(data => (
                <option key={data.year} value={data.year}>{data.year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compare to Year</label>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
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
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center mb-3">
                <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
                <h4 className="text-lg font-semibold text-blue-800">{selectedYear} Exchange Rate</h4>
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {initialData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-sm text-blue-700 mt-2">
                Your {formatCurrency(initialAmount)} = {formatCurrency(initialUSDValue, 'USD')}
              </div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center mb-3">
                <TrendingDown className="w-6 h-6 text-red-600 mr-2" />
                <h4 className="text-lg font-semibold text-red-800">{currentYear} Exchange Rate</h4>
              </div>
              <div className="text-3xl font-bold text-red-900">
                {currentData?.rate.toLocaleString()} COP/USD
              </div>
              <div className="text-sm text-red-700 mt-2">
                Same USD = {formatCurrency(currentCOPValue)}
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border border-red-200 mb-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
              <h4 className="text-xl font-bold text-red-800">Purchasing Power Impact</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Real Value Today</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(realValue)}
                </div>
                <div className="text-xs text-red-500">
                  Adjusted for purchasing power
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Total Loss</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-red-500">
                  Money you can't buy with anymore
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Loss Percentage</div>
                <div className="text-3xl font-bold text-red-800">
                  -{realLossPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-red-500">
                  Of your original purchasing power
                </div>
              </div>
            </div>
          </div>

          {/* VCOP Solution */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xl font-bold text-emerald-800 mb-2">How VCOP Would Have Protected You</h4>
                <p className="text-emerald-700">
                  Instead of holding pesos, you could have kept your crypto and borrowed VCOP when needed.
                </p>
              </div>
              <div className="bg-emerald-500 p-3 rounded-lg">
                <Calculator className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-emerald-600 mb-1">With Traditional Savings</div>
                <div className="text-xl font-bold text-red-600">
                  Lost {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="text-xs text-gray-500">
                  -{realLossPercentage.toFixed(1)}% purchasing power
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-emerald-600 mb-1">With VCOP Protocol</div>
                <div className="text-xl font-bold text-emerald-600">
                  Kept {formatCurrency(initialAmount)}
                </div>
                <div className="text-xs text-emerald-500">
                  + crypto upside potential
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 mt-6">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
            <Calculator className="w-5 h-5" />
            Protect Your Wealth with VCOP
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => {
              setInitialAmount(1000000);
              setSelectedYear(2014);
              setCurrentYear(2024);
            }}
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reset Calculator
          </button>
        </div>
      </div>
    </div>
  );
};