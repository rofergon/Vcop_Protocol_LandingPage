import React, { useState, useEffect } from 'react';
import { TrendingDown, DollarSign, Calculator, AlertTriangle, ArrowRight, RefreshCw, Info, HelpCircle, BarChart3 } from 'lucide-react';

interface DevaluationCalculatorProps {
  className?: string;
}

// Real historical data every 6 months from 2014 to 2025 (USD/COP rates)
const HISTORICAL_DATA = [
  { period: "Jan 2014", rate: 2000, year: 2014, month: 1 },
  { period: "Jul 2014", rate: 2100, year: 2014, month: 7 },
  { period: "Jan 2015", rate: 2380, year: 2015, month: 1 },
  { period: "Jul 2015", rate: 2920, year: 2015, month: 7 },
  { period: "Jan 2016", rate: 3380, year: 2016, month: 1 },
  { period: "Jul 2016", rate: 2950, year: 2016, month: 7 },
  { period: "Jan 2017", rate: 2900, year: 2017, month: 1 },
  { period: "Jul 2017", rate: 3050, year: 2017, month: 7 },
  { period: "Jan 2018", rate: 2850, year: 2018, month: 1 },
  { period: "Jul 2018", rate: 2980, year: 2018, month: 7 },
  { period: "Jan 2019", rate: 3100, year: 2019, month: 1 },
  { period: "Jul 2019", rate: 3280, year: 2019, month: 7 },
  { period: "Jan 2020", rate: 3300, year: 2020, month: 1 },
  { period: "Jul 2020", rate: 3780, year: 2020, month: 7 },
  { period: "Jan 2021", rate: 3520, year: 2021, month: 1 },
  { period: "Jul 2021", rate: 3980, year: 2021, month: 7 },
  { period: "Jan 2022", rate: 4000, year: 2022, month: 1 },
  { period: "Jul 2022", rate: 4300, year: 2022, month: 7 },
  { period: "Jan 2023", rate: 4700, year: 2023, month: 1 },
  { period: "Jul 2023", rate: 4200, year: 2023, month: 7 },
  { period: "Jan 2024", rate: 3980, year: 2024, month: 1 },
  { period: "Jul 2024", rate: 4100, year: 2024, month: 7 },
  { period: "Jan 2025", rate: 4430, year: 2025, month: 1 },
  { period: "Jun 2025", rate: 4120, year: 2025, month: 6 }
];

// Base year for purchasing power calculation
const BASE_YEAR = 2014;
const BASE_RATE = 2000;

// Enhanced Candlestick Chart Component
const CandlestickChart: React.FC<{ data: typeof HISTORICAL_DATA, height?: number }> = ({ 
  data, 
  height = 160 
}) => {
  const maxRate = Math.max(...data.map(d => d.rate));
  const minRate = Math.min(...data.map(d => d.rate));
  const range = maxRate - minRate;
  const padding = range * 0.1;
  
  const chartWidth = 320;
  const candleWidth = Math.max(8, (chartWidth - 40) / data.length - 2);
  
  const getY = (rate: number) => {
    return height - 25 - ((rate - minRate + padding) / (range + 2 * padding)) * (height - 50);
  };
  
  const getColor = (current: number, previous: number) => {
    return current >= previous ? '#10b981' : '#ef4444';
  };

  // Calculate purchasing power loss percentage for each point
  const getPowerLossPercent = (rate: number) => {
    return ((rate - BASE_RATE) / BASE_RATE) * 100;
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-3 relative overflow-hidden border border-gray-700">
      {/* Background grid with gradient */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height={height}>
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
            <line
              key={i}
              x1="20"
              y1={25 + ratio * (height - 50)}
              x2={chartWidth + 20}
              y2={25 + ratio * (height - 50)}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          ))}
        </svg>
      </div>
      
      {/* Title and trend */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-semibold text-sm">📉 Devaluación Histórica COP/USD</span>
        </div>
        <div className="flex items-center gap-1 text-red-400 text-xs font-mono">
          <TrendingDown className="w-3 h-3" />
          <span>+{getPowerLossPercent(data[data.length - 1].rate).toFixed(0)}%</span>
        </div>
      </div>

      <svg width="100%" height={height} className="overflow-visible">
        {data.map((point, index) => {
          const x = 40 + index * (candleWidth + 10);
          const y = getY(point.rate);
          const prevRate = index > 0 ? data[index - 1].rate : point.rate;
          const color = getColor(point.rate, prevRate);
          const isPositive = point.rate >= prevRate;
          const powerLoss = getPowerLossPercent(point.rate);
          
          // Enhanced candlestick with purchasing power visualization
          const bodyHeight = Math.max(6, Math.abs(y - getY(prevRate)));
          const bodyY = isPositive ? getY(point.rate) : getY(prevRate);
          
          return (
            <g key={index}>
              {/* Candlestick body with gradient effect */}
              <defs>
                <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: color, stopOpacity: 0.9}} />
                  <stop offset="100%" style={{stopColor: color, stopOpacity: 0.6}} />
                </linearGradient>
              </defs>
              
              <rect
                x={x - candleWidth/2}
                y={bodyY}
                width={candleWidth}
                height={bodyHeight}
                fill={`url(#grad-${index})`}
                rx="1"
                className="transition-all duration-300 hover:opacity-80"
                stroke={color}
                strokeWidth="0.5"
              />
              
              {/* Period label */}
              <text
                x={x}
                y={height - 8}
                fill="#9CA3AF"
                fontSize="7"
                textAnchor="middle"
                className="font-mono"
              >
                {point.period.split(' ')[1].slice(-2)}
              </text>
              
              {/* Enhanced hover effect with purchasing power info */}
              <g className="opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect
                  x={x - 35}
                  y={y - 30}
                  width="70"
                  height="25"
                  fill="#1F2937"
                  rx="3"
                  stroke={color}
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 20}
                  fill="white"
                  fontSize="7"
                  textAnchor="middle"
                  className="font-mono font-bold"
                >
                  ${point.rate.toLocaleString()}
                </text>
                <text
                  x={x}
                  y={y - 12}
                  fill={powerLoss > 50 ? "#ef4444" : "#f59e0b"}
                  fontSize="6"
                  textAnchor="middle"
                  className="font-mono"
                >
                  -{powerLoss.toFixed(0)}% poder
                </text>
              </g>
            </g>
          );
        })}
        
        {/* Trend line */}
        <path
          d={`M ${30} ${getY(data[0].rate)} ${data.map((point, index) => 
            `L ${30 + index * (candleWidth + 2)} ${getY(point.rate)}`
          ).join(' ')}`}
          fill="none"
          stroke="rgba(239, 68, 68, 0.3)"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </svg>
      
      {/* Price axis labels */}
      <div className="absolute left-1 top-8 text-xs text-emerald-400 font-mono">
        ${maxRate.toLocaleString()}
      </div>
      <div className="absolute left-1 bottom-10 text-xs text-red-400 font-mono">
        ${minRate.toLocaleString()}
      </div>
    </div>
  );
};

export const DevaluationCalculator: React.FC<DevaluationCalculatorProps> = ({ className = "" }) => {
  const [initialAmount, setInitialAmount] = useState(1000000); // 1M COP
  const [isAnimating, setIsAnimating] = useState(false);

  // Fixed comparison: 2014 vs 2025
  const initialData = HISTORICAL_DATA[0]; // Jan 2014
  const currentData = HISTORICAL_DATA[HISTORICAL_DATA.length - 1]; // Jun 2025

  // Calculate purchasing power lost
  const initialRate = initialData.rate;
  const currentRate = currentData.rate;
  const devaluationRatio = initialRate / currentRate;
  const purchasingPowerLost = ((currentRate - initialRate) / initialRate) * 100;

  const realValue = initialAmount * devaluationRatio;
  const realLoss = realValue - initialAmount;

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [initialAmount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">💸 Calculadora Devaluación Peso</h3>
            <p className="text-red-100 text-xs">Datos reales 2014-2025</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* Compact Amount Selector */}
        <div className="mb-3">
          <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-lg p-2 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                💰 Tu dinero (2014-2025):
              </span>
              <span className="text-lg font-bold text-red-600">-{purchasingPowerLost.toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
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
                  <div className="text-sm font-bold text-gray-900">
                    {(amount / 1000000).toFixed(amount < 1000000 ? 1 : 0)}M
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="font-bold text-gray-900">{formatCurrency(initialAmount)}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Historical Chart - Larger */}
        <div className={`transition-all duration-500 mb-3 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
          <CandlestickChart data={HISTORICAL_DATA} height={291} />
        </div>

        {/* Compact Impact Summary */}
        <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Side by side comparison */}
          <div className="bg-gradient-to-r from-red-50 to-emerald-50 p-3 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center bg-white p-3 rounded-lg border-2 border-red-200">
                <div className="text-xs text-red-600 mb-1 font-medium">💸 Pesos Tradicionales</div>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(realValue)}
                </div>
                <div className="text-xs text-red-500 mt-1">
                  Perdiste {formatCurrency(Math.abs(realLoss))}
                </div>
                <div className="mt-2 h-1 bg-red-200 rounded-full">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.max(20, 100 - purchasingPowerLost)}%` }}
                  />
                </div>
              </div>
              
              <div className="text-center bg-white p-3 rounded-lg border-2 border-emerald-200">
                <div className="text-xs text-emerald-600 mb-1 font-medium">🚀 VCOP Protegido</div>
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(initialAmount)}
                </div>
                <div className="text-xs text-emerald-500 mt-1">
                  + ganancias crypto 📈
                </div>
                <div className="mt-2 h-1 bg-emerald-200 rounded-full">
                  <div className="h-full bg-emerald-500 rounded-full w-full transition-all duration-1000" />
                </div>
              </div>
            </div>
            
            {/* Key insight */}
            <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-center text-sm">
                <span className="font-semibold text-yellow-800">🎯 VCOP te ahorró: </span>
                <span className="text-yellow-700 font-bold">
                  {formatCurrency(Math.abs(realLoss))} en {HISTORICAL_DATA.length / 2} años!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-3 text-sm rounded-lg transition-all flex items-center justify-center gap-2">
            <Calculator className="w-4 h-4" />
            🚀 Protégete con VCOP
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setInitialAmount(1000000)}
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-3 text-sm rounded-lg transition-all flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};