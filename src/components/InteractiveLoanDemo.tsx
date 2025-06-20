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
  RefreshCw,
  Settings,
  User,
  GraduationCap,
  BarChart3,
  Info,
  Sliders,
  TrendingUp as TrendingUpIcon,
  Percent,
  ArrowUpDown,
  ChevronDown
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

// Easy mode presets
const EASY_PRESETS = [
  { name: "Conservative", ltv: 60, description: "Safe and stable", color: "green" },
  { name: "Moderate", ltv: 75, description: "Balanced approach", color: "blue" },
  { name: "Aggressive", ltv: 90, description: "Higher leverage", color: "yellow" },
  { name: "Extreme", ltv: 95, description: "Maximum leverage", color: "orange" },
  { name: "VCOP Ultra", ltv: 105, description: "Beyond limits!", color: "red" }
];

// Asset icon component
const AssetIcon: React.FC<{ asset: string; className?: string }> = ({ asset, className = "w-5 h-5" }) => {
  switch (asset.toLowerCase()) {
    case 'eth':
      return <img src="/ethereum-eth-logo.svg" alt="ETH" className={`${className} inline-block align-middle`} />;
    case 'wbtc':
    case 'btc':
      return <img src="/bitcoin-btc-logo.svg" alt="BTC" className={`${className} inline-block align-middle`} />;
    case 'vcop':
      return (
        <div className={`${className} inline-block align-middle bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full p-0.5 flex items-center justify-center`}>
          <img src="/logovcop.png" alt="VCOP" className="w-full h-full object-contain rounded-full" />
        </div>
      );
    case 'usdc':
      return <img src="/usd-coin-usdc-logo.svg" alt="USDC" className={`${className} inline-block align-middle`} />;
    default:
      return <DollarSign className={`${className} inline-block align-middle`} />;
  }
};

// Custom dropdown component
const AssetDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  borderColor?: string;
}> = ({ value, onChange, options, className = "", borderColor = "border-gray-300" }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.asset-dropdown')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  return (
    <div className={`relative asset-dropdown ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2 text-sm border ${borderColor} rounded-lg bg-white text-left flex items-center justify-between hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        <span className="flex items-center gap-2">
          <AssetIcon asset={value} className="w-4 h-4" />
          {selectedOption?.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full p-2 text-left flex items-center gap-2 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              <AssetIcon asset={option.value} className="w-4 h-4" />
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const InteractiveLoanDemo: React.FC<InteractiveLoanDemoProps> = ({ className = "" }) => {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [customPosition, setCustomPosition] = useState(DEMO_SCENARIOS[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEasyMode, setIsEasyMode] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Easy mode state
  const [easyCollateralAmount, setEasyCollateralAmount] = useState(1);
  const [easyLTV, setEasyLTV] = useState(60);
  const [easyCollateralAsset, setEasyCollateralAsset] = useState("ETH");
  const [easyLoanAsset, setEasyLoanAsset] = useState("USDC");

  const { riskMetrics, priceImpact, formatCollateralizationRatio, formatHealthFactor, getRiskLevelColor, getRiskLevelBgColor } = useRiskCalculator(customPosition);

  // Asset prices for calculations (all in USD)
  const assetPrices = {
    ETH: 2500,
    WBTC: 45000,
    USDC: 1,
    VCOP: 1/4100  // 1 VCOP = 1 COP = ~1/4100 USD
  };

  // Calculate loan amount from LTV in easy mode
  useEffect(() => {
    if (isEasyMode) {
      const collateralValue = easyCollateralAmount * assetPrices[easyCollateralAsset as keyof typeof assetPrices];
      const loanValue = (collateralValue * easyLTV) / 100;
      const loanAmount = loanValue / assetPrices[easyLoanAsset as keyof typeof assetPrices];
      
             setCustomPosition({
         ...customPosition,
         collateralAsset: easyCollateralAsset,
         loanAsset: easyLoanAsset,
         collateralAmount: easyCollateralAmount.toString(),
         loanAmount: loanAmount.toFixed(2),
         interestRate: easyLTV > 90 ? "12" : easyLTV > 75 ? "8" : "6"
       });
    }
  }, [isEasyMode, easyCollateralAmount, easyLTV, easyCollateralAsset, easyLoanAsset]);

  // Update easy mode when preset changes
  useEffect(() => {
    if (isEasyMode) {
      const preset = EASY_PRESETS[selectedPreset];
      setEasyLTV(preset.ltv);
    }
  }, [selectedPreset, isEasyMode]);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [selectedScenario, customPosition]);

  const handleScenarioChange = (index: number) => {
    setSelectedScenario(index);
    setCustomPosition(DEMO_SCENARIOS[index]);
    setIsEasyMode(false); // Switch to expert mode when using scenarios
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

  const getLTVColor = (ltv: number) => {
    if (ltv <= 60) return "bg-green-500";
    if (ltv <= 75) return "bg-blue-500";
    if (ltv <= 90) return "bg-yellow-500";
    if (ltv <= 100) return "bg-orange-500";
    return "bg-red-500";
  };

  const currentLTV = riskMetrics ? (parseFloat(customPosition.loanAmount) * assetPrices[customPosition.loanAsset as keyof typeof assetPrices] / (parseFloat(customPosition.collateralAmount) * assetPrices[customPosition.collateralAsset as keyof typeof assetPrices]) * 100) : 0;

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold mb-1">VCOP Flexible Risk Calculator</h3>
            <p className="text-emerald-100 text-sm">ANY ratio allowed! 🚀</p>
            <div className="flex items-center gap-2 text-xs text-emerald-100 mt-1">
              <Calculator className="w-3 h-3" />
              <span>Real-time risk analysis</span>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-center">
          <div className="bg-white/20 rounded-full p-1 flex">
            <button
              onClick={() => setIsEasyMode(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-all duration-300 ${
                isEasyMode 
                  ? 'bg-white text-emerald-600 font-semibold shadow-lg' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              Easy Mode
            </button>
            <button
              onClick={() => setIsEasyMode(false)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-all duration-300 ${
                !isEasyMode 
                  ? 'bg-white text-emerald-600 font-semibold shadow-lg' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              Expert Mode
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        {isEasyMode ? (
          /* EASY MODE INTERFACE */
          <div className="space-y-4">
            {/* Preset Selection */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                Risk Level
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {EASY_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPreset(index)}
                    className={`p-2 rounded-lg border-2 transition-all duration-300 text-center ${
                      selectedPreset === index
                        ? `border-${preset.color}-500 bg-${preset.color}-50`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-lg font-bold">{preset.ltv}%</div>
                    <div className="text-xs text-gray-600">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual LTV Slider */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  LTV {easyLTV}%
                </h5>
              </div>
              
              {/* LTV Slider */}
              <div className="relative mb-3">
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={easyLTV}
                  onChange={(e) => setEasyLTV(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #3b82f6 60%, #f59e0b 75%, #ef4444 90%, #dc2626 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>🟢</span>
                  <span>⚠️ 80%</span>
                  <span>🚀</span>
                </div>
              </div>
            </div>

            {/* Assets and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Collateral Section */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <AssetIcon asset={easyCollateralAsset} className="w-4 h-4" />
                  Collateral
                </h5>
                
                <div className="space-y-3">
                  <AssetDropdown
                    value={easyCollateralAsset}
                    onChange={setEasyCollateralAsset}
                    options={[
                      { value: "ETH", label: "ETH" },
                      { value: "WBTC", label: "WBTC" },
                      { value: "USDC", label: "USDC" }
                    ]}
                    borderColor="border-blue-300"
                  />
                  
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={easyCollateralAmount}
                      onChange={(e) => setEasyCollateralAmount(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 text-sm border border-blue-300 rounded-lg"
                      placeholder="0.0"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <AssetIcon asset={easyCollateralAsset} className="w-4 h-4" />
                      <span className="text-blue-600 font-medium text-xs">{easyCollateralAsset}</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-100 p-2 rounded-lg text-center">
                    <div className="text-sm font-bold text-blue-900">
                      ${(easyCollateralAmount * assetPrices[easyCollateralAsset as keyof typeof assetPrices]).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Section */}
              <div className="bg-emerald-50 rounded-lg p-3.5 border border-emerald-200">
                <h5 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <AssetIcon asset={easyLoanAsset} className="w-4 h-4" />
                  Loan
                </h5>
                
                <div className="space-y-2">
                  <AssetDropdown
                    value={easyLoanAsset}
                    onChange={setEasyLoanAsset}
                    options={[
                      { value: "USDC", label: "USDC" },
                      { value: "VCOP", label: "VCOP" },
                      { value: "ETH", label: "ETH" }
                    ]}
                    borderColor="border-emerald-300"
                  />
                  
                  <div className="bg-emerald-100 p-2 rounded-lg text-center">
                    <div className="text-sm font-bold text-emerald-900 flex items-center justify-center gap-1">
                      <AssetIcon asset={easyLoanAsset} className="w-4 h-4" />
                      {parseFloat(customPosition.loanAmount).toLocaleString()} {easyLoanAsset}
                    </div>
                    <div className="text-xs text-emerald-700">
                      ${(parseFloat(customPosition.loanAmount) * assetPrices[easyLoanAsset as keyof typeof assetPrices]).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-2 rounded-lg text-center">
                    <div className="text-sm font-bold text-yellow-900">
                      {customPosition.interestRate}% APR
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Feedback */}
            {riskMetrics && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                <h5 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  📊 Live Risk
                </h5>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center bg-white p-2 rounded-lg">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getRiskLevelBgColor(riskMetrics.riskLevel)} ${getRiskLevelColor(riskMetrics.riskLevel)}`}>
                      {getRiskIcon(riskMetrics.riskLevel)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Risk</div>
                  </div>
                  
                  <div className="text-center bg-white p-2 rounded-lg">
                    <div className="text-sm font-bold text-gray-900">
                      {formatHealthFactor(riskMetrics.healthFactor)}
                    </div>
                    <div className="text-xs text-gray-600">Health</div>
                  </div>
                  
                  <div className="text-center bg-white p-2 rounded-lg">
                    <div className="text-sm font-bold text-gray-900">
                      {currentLTV.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">LTV</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* EXPERT MODE INTERFACE */
          <div className="space-y-6">
            {/* Scenario Selector */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                Expert Scenarios
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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

            {/* Expert Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Loan Parameters
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collateral Asset</label>
                    <div className="relative">
                      <select
                        value={customPosition.collateralAsset}
                        onChange={(e) => handleInputChange('collateralAsset', e.target.value)}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                      >
                        <option value="ETH">ETH</option>
                        <option value="WBTC">WBTC</option>
                        <option value="USDC">USDC</option>
                      </select>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <AssetIcon asset={customPosition.collateralAsset} className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Asset</label>
                    <div className="relative">
                      <select
                        value={customPosition.loanAsset}
                        onChange={(e) => handleInputChange('loanAsset', e.target.value)}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                      >
                        <option value="USDC">USDC</option>
                        <option value="VCOP">VCOP</option>
                        <option value="ETH">ETH</option>
                      </select>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <AssetIcon asset={customPosition.loanAsset} className="w-5 h-5" />
                      </div>
                    </div>
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

                {/* LTV Display for Expert Mode */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">Current LTV Ratio</span>
                    <span className="text-lg font-bold text-blue-900">{currentLTV.toFixed(2)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getLTVColor(currentLTV)}`}
                      style={{ width: `${Math.min(currentLTV, 120) / 120 * 100}%` }}
                    />
                  </div>
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
                      <span className="ml-2">{riskMetrics.riskLevel.replace('_', ' ')}</span>
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
                        <span className="font-bold text-green-900 flex items-center gap-1">
                          {riskMetrics.maxWithdrawableByMath.toFixed(4)} 
                          <AssetIcon asset={customPosition.collateralAsset} className="w-4 h-4" />
                          {customPosition.collateralAsset}
                        </span>
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
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Try This Position Live
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => {
              if (isEasyMode) {
                setEasyLTV(60);
                setEasyCollateralAmount(1);
                setSelectedPreset(0);
              } else {
                setCustomPosition(DEMO_SCENARIOS[0]);
                setSelectedScenario(0);
              }
            }}
            className="flex-1 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold py-2 px-4 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};