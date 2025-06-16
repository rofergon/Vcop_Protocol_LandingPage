import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  DollarSign,
  Activity,
  Target,
  Clock,
  Zap,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useRiskCalculator, RiskLevel } from '../hooks/useRiskCalculator';

interface InteractiveLoanDemoProps {
  className?: string;
}

const DEMO_SCENARIOS = [
  {
    name: "Conservative Loan",
    description: "Safe 60% LTV with ETH collateral",
    collateralAsset: "ETH",
    loanAsset: "USDC",
    collateralAmount: "2",
    loanAmount: "3000",
    interestRate: "6"
  },
  {
    name: "Aggressive Leverage",
    description: "85% LTV - Higher risk, higher reward",
    collateralAsset: "ETH",
    loanAsset: "USDC",
    collateralAmount: "1",
    loanAmount: "2125",
    interestRate: "8"
  },
  {
    name: "Extreme Leverage",
    description: "95% LTV - VCOP allows extreme ratios!",
    collateralAsset: "ETH",
    loanAsset: "USDC",
    collateralAmount: "1",
    loanAmount: "2375",
    interestRate: "12"
  },
  {
    name: "Beyond 100% LTV",
    description: "105% LTV - Only possible with VCOP!",
    collateralAsset: "ETH",
    loanAsset: "USDC",
    collateralAmount: "1",
    loanAmount: "2625",
    interestRate: "15"
  },
  {
    name: "VCOP Peso Hedge",
    description: "Borrow pesos with crypto - any ratio",
    collateralAsset: "ETH",
    loanAsset: "VCOP",
    collateralAmount: "1",
    loanAmount: "8500000",
    interestRate: "5"
  }
];

export const InteractiveLoanDemo: React.FC<InteractiveLoanDemoProps> = ({ className = "" }) => {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [customPosition, setCustomPosition] = useState(DEMO_SCENARIOS[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const { riskMetrics, priceImpact, formatCollateralizationRatio, formatHealthFactor, getRiskLevelColor, getRiskLevelBgColor } = useRiskCalculator(customPosition);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [selectedScenario]);

  const handleScenarioChange = (index: number) => {
    setSelectedScenario(index);
    setCustomPosition(DEMO_SCENARIOS[index]);
  };

  const handleInputChange = (field: string, value: string) => {
    setCustomPosition(prev => ({ ...prev, [field]: value }));
  };

  const getRiskIcon = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case RiskLevel.ULTRA_SAFE: return <Shield className="w-5 h-5" />;
      case RiskLevel.HEALTHY: return <Shield className="w-5 h-5" />;
      case RiskLevel.MODERATE: return <Activity className="w-5 h-5" />;
      case RiskLevel.AGGRESSIVE: return <Target className="w-5 h-5" />;
      case RiskLevel.EXTREME: return <AlertTriangle className="w-5 h-5" />;
      case RiskLevel.DANGER_ZONE: return <TrendingDown className="w-5 h-5" />;
      default: return <Calculator className="w-5 h-5" />;
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">VCOP Flexible Risk Calculator</h3>
            <p className="text-emerald-100">Experience ultra-flexible lending - ANY ratio allowed!</p>
          </div>
          <div className="bg-white/20 p-3 rounded-lg">
            <Calculator className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Scenario Selector */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Choose a Scenario</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_SCENARIOS.map((scenario, index) => (
              <button
                key={index}
                onClick={() => handleScenarioChange(index)}
                className={`p-3 rounded-lg border-2 transition-all duration-300 text-left ${
                  selectedScenario === index
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <div className="font-semibold text-sm">{scenario.name}</div>
                <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Loan Parameters</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collateral Asset</label>
                <select
                  value={customPosition.collateralAsset}
                  onChange={(e) => handleInputChange('collateralAsset', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="ETH">ETH</option>
                  <option value="WBTC">WBTC</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Asset</label>
                <select
                  value={customPosition.loanAsset}
                  onChange={(e) => handleInputChange('loanAsset', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="USDC">USDC</option>
                  <option value="VCOP">VCOP</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collateral Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={customPosition.collateralAmount}
                  onChange={(e) => handleInputChange('collateralAmount', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={customPosition.loanAmount}
                  onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={customPosition.interestRate}
                onChange={(e) => handleInputChange('interestRate', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="5.0"
              />
            </div>
          </div>

          {/* Risk Analysis Display */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Real-Time Risk Analysis</h4>
            
            {riskMetrics ? (
              <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Risk Level Badge */}
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-4 ${getRiskLevelBgColor(riskMetrics.riskLevel)} ${getRiskLevelColor(riskMetrics.riskLevel)}`}>
                  {getRiskIcon(riskMetrics.riskLevel)}
                  <span className="ml-2">{riskMetrics.riskLevel}</span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Health Factor</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatHealthFactor(riskMetrics.healthFactor)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Collateral Ratio</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCollateralizationRatio(riskMetrics.collateralizationRatio)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Liquidation Price</div>
                    <div className="text-xl font-bold text-gray-900">
                      ${riskMetrics.theoreticalLiquidationPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Suggested threshold</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Price Drop to Liq.</div>
                    <div className="text-xl font-bold text-red-600">
                      -{riskMetrics.priceDropToSuggestedLiquidation.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">To suggested threshold</div>
                  </div>
                </div>

                {/* Advanced Metrics */}
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">Max Borrowable (Liquidity)</span>
                    <span className="font-bold text-blue-900">${riskMetrics.maxBorrowableByLiquidity.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Max Withdrawable (Math)</span>
                    <span className="font-bold text-green-900">{riskMetrics.maxWithdrawableByMath.toFixed(4)} {customPosition.collateralAsset}</span>
                  </div>
                  
                  {riskMetrics.timeToSuggestedLiquidation > 0 && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium text-yellow-800 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Time to Suggested Liq.
                      </span>
                      <span className="font-bold text-yellow-900">
                        {riskMetrics.timeToSuggestedLiquidation > 24 
                          ? `${Math.floor(riskMetrics.timeToSuggestedLiquidation / 24)}d` 
                          : `${Math.floor(riskMetrics.timeToSuggestedLiquidation)}h`
                        }
                      </span>
                    </div>
                  )}
                  
                  {/* System Flexibility Warning */}
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-xs text-purple-800 font-medium mb-1">VCOP Flexibility:</div>
                    <div className="text-xs text-purple-700">{riskMetrics.systemFlexibilityNote}</div>
                  </div>
                </div>

                {/* Price Impact Analysis */}
                {priceImpact && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Price Impact Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>10% Risk Scenario:</span>
                        <span className="font-medium">-{priceImpact.priceDropFor10PercentRisk.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>50% Risk Scenario:</span>
                        <span className="font-medium">-{priceImpact.priceDropFor50PercentRisk.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>90% Risk Scenario:</span>
                        <span className="font-medium">-{priceImpact.priceDropFor90PercentRisk.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>Asset Volatility:</span>
                        <span className="font-medium">{priceImpact.currentVolatility.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Enter loan parameters to see risk analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            Try This Position Live
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button className="flex-1 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};