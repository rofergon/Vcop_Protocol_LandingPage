import React, { useState } from 'react';
import { 
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  User,
  Wallet,
  ArrowRight,
  Shield,
  DollarSign,
  Zap,
  Activity,
  Target,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useCreatePosition, BASE_SEPOLIA_ADDRESSES } from '../../hooks/useCreatePosition';
import type { LoanTerms } from '../../hooks/useCreatePosition';
import { parseUnits } from 'viem';
import MockETHFaucet from './MockETHFaucet';

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
  React.useEffect(() => {
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

// Risk calculation logic
enum RiskLevel {
  ULTRA_SAFE = "ULTRA_SAFE",
  HEALTHY = "HEALTHY", 
  MODERATE = "MODERATE",
  AGGRESSIVE = "AGGRESSIVE",
  EXTREME = "EXTREME",
  DANGER_ZONE = "DANGER_ZONE"
}

const calculateRiskLevel = (ltv: number): RiskLevel => {
  if (ltv <= 50) return RiskLevel.ULTRA_SAFE;
  if (ltv <= 65) return RiskLevel.HEALTHY;
  if (ltv <= 80) return RiskLevel.MODERATE;
  if (ltv <= 90) return RiskLevel.AGGRESSIVE;
  if (ltv <= 100) return RiskLevel.EXTREME;
  return RiskLevel.DANGER_ZONE;
};

const getRiskIcon = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return <Shield className="w-3 h-3" />;
    case RiskLevel.HEALTHY: return <Shield className="w-3 h-3" />;
    case RiskLevel.MODERATE: return <Activity className="w-3 h-3" />;
    case RiskLevel.AGGRESSIVE: return <Target className="w-3 h-3" />;
    case RiskLevel.EXTREME: return <AlertTriangle className="w-3 h-3" />;
    case RiskLevel.DANGER_ZONE: return <TrendingDown className="w-3 h-3" />;
    default: return <Calculator className="w-3 h-3" />;
  }
};

const getRiskLevelColor = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return "text-green-800";
    case RiskLevel.HEALTHY: return "text-emerald-800";
    case RiskLevel.MODERATE: return "text-blue-800";
    case RiskLevel.AGGRESSIVE: return "text-yellow-800";
    case RiskLevel.EXTREME: return "text-orange-800";
    case RiskLevel.DANGER_ZONE: return "text-red-800";
    default: return "text-gray-800";
  }
};

const getRiskLevelBgColor = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return "bg-green-100";
    case RiskLevel.HEALTHY: return "bg-emerald-100";
    case RiskLevel.MODERATE: return "bg-blue-100";
    case RiskLevel.AGGRESSIVE: return "bg-yellow-100";
    case RiskLevel.EXTREME: return "bg-orange-100";
    case RiskLevel.DANGER_ZONE: return "bg-red-100";
    default: return "bg-gray-100";
  }
};

const formatHealthFactor = (ltv: number): string => {
  if (ltv <= 50) return "∞";
  if (ltv <= 65) return "5.2";
  if (ltv <= 80) return "2.1";
  if (ltv <= 90) return "1.3";
  if (ltv <= 100) return "1.0";
  return "0.8";
};

export const RealPositionCreator: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [isEasyMode, setIsEasyMode] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(0);
  
  // Position parameters
  const [collateralAsset, setCollateralAsset] = useState("ETH");
  const [loanAsset, setLoanAsset] = useState("USDC");
  const [collateralAmount, setCollateralAmount] = useState("1");
  const [loanAmount, setLoanAmount] = useState("1500");

  // Easy mode state  
  const [easyCollateralAmount, setEasyCollateralAmount] = useState(1);
  const [easyLTV, setEasyLTV] = useState(60);

  // Wallet hooks
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  // Hook para crear posiciones
  const {
    createPosition,
    resetState,
    isLoading,
    error,
    success,
    txHash,
    step,
    balanceInfo,
    allowanceInfo,
    refetchBalances
  } = useCreatePosition({
    addresses: BASE_SEPOLIA_ADDRESSES,
    autoVerifyBalances: true
  });

  const LOAN_PRESETS = [
    { name: "Conservative", ltv: 60, description: "Safe and stable", color: "emerald" },
    { name: "Moderate", ltv: 75, description: "Balanced approach", color: "blue" },
    { name: "Aggressive", ltv: 90, description: "Higher leverage", color: "yellow" },
    { name: "Extreme", ltv: 95, description: "Maximum leverage", color: "orange" }
  ];

  const assetPrices = { ETH: 2500, WBTC: 45000, USDC: 1, VCOP: 1/4100 };

  const handleCreatePosition = async () => {
    if (!isConnected) return;
    
    try {
      // Preparar términos del préstamo
      const collateralAmountBigInt = parseUnits(
        isEasyMode ? easyCollateralAmount.toString() : collateralAmount, 
        18
      );
      const loanAmountBigInt = parseUnits(
        isEasyMode ? calculateLoanFromLTV().toString() : loanAmount, 
        6
      );
      
      const customTerms: Partial<LoanTerms> = {
        collateralAsset: BASE_SEPOLIA_ADDRESSES.mockETH,
        loanAsset: BASE_SEPOLIA_ADDRESSES.mockUSDC,
        collateralAmount: collateralAmountBigInt,
        loanAmount: loanAmountBigInt,
        maxLoanToValue: BigInt((isEasyMode ? easyLTV : currentLTV) * 10000), // Convert to basis points
        interestRate: 80000n, // 8% APR
        duration: 0n // Perpetual
      };

      await createPosition(customTerms);
    } catch (error) {
      console.error('Error creating position:', error);
    }
  };

  const calculateLoanFromLTV = () => {
    const collateralValue = easyCollateralAmount * assetPrices[collateralAsset as keyof typeof assetPrices];
    return (collateralValue * easyLTV / 100) / assetPrices[loanAsset as keyof typeof assetPrices];
  };

  const currentLTV = parseFloat(isEasyMode ? calculateLoanFromLTV().toString() : loanAmount) * assetPrices[loanAsset as keyof typeof assetPrices] / (parseFloat(isEasyMode ? easyCollateralAmount.toString() : collateralAmount) * assetPrices[collateralAsset as keyof typeof assetPrices]) * 100;
  
  // Calculate risk metrics based on current LTV
  const riskLevel = calculateRiskLevel(isEasyMode ? easyLTV : currentLTV);
  const healthFactor = formatHealthFactor(isEasyMode ? easyLTV : currentLTV);

  return (
    <div className={`relative p-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Faucet en esquina superior */}
      <div className="absolute top-2 right-2 z-10">
        <MockETHFaucet />
      </div>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold mb-1">🚀 Real VCOP Position Creator</h3>
            <p className="text-emerald-100 text-sm">Create actual positions on Base Sepolia!</p>
            <div className="flex items-center gap-2 text-xs text-emerald-100 mt-1">
              <Activity className="w-3 h-3" />
              <span>Connected to Base Sepolia testnet</span>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg">
            <Zap className="w-6 h-6" />
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
              <Calculator className="w-3 h-3" />
              Expert Mode
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        {!isConnected ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-4">Connect to Base Sepolia to create real positions.</p>
            <button 
              onClick={() => open()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {isEasyMode ? (
              /* EASY MODE INTERFACE */
              <div className="space-y-4">
                {/* Preset Selection */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Risk Level
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {LOAN_PRESETS.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedPreset(index);
                          setEasyLTV(preset.ltv);
                        }}
                        className={`p-2 rounded-lg border-2 transition-all duration-300 text-center ${
                          selectedPreset === index
                            ? 'border-emerald-500 bg-emerald-50'
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
                      <Settings className="w-4 h-4 text-blue-600" />
                      LTV {easyLTV}%
                    </h5>
                  </div>
                  
                  {/* LTV Slider */}
                  <div className="relative mb-3">
                    <input
                      type="range"
                      min="10"
                      max="95"
                      value={easyLTV}
                      onChange={(e) => setEasyLTV(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #3b82f6 60%, #f59e0b 75%, #ef4444 90%)`
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
                      <AssetIcon asset={collateralAsset} className="w-4 h-4" />
                      Collateral
                    </h5>
                    
                    <div className="space-y-3">
                      <AssetDropdown
                        value={collateralAsset}
                        onChange={setCollateralAsset}
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
                          <AssetIcon asset={collateralAsset} className="w-4 h-4" />
                          <span className="text-blue-600 font-medium text-xs">{collateralAsset}</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-100 p-2 rounded-lg text-center">
                        <div className="text-sm font-bold text-blue-900">
                          ${(easyCollateralAmount * assetPrices[collateralAsset as keyof typeof assetPrices]).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loan Section */}
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <h5 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <AssetIcon asset={loanAsset} className="w-4 h-4" />
                      Loan
                    </h5>
                    
                    <div className="space-y-2">
                      <AssetDropdown
                        value={loanAsset}
                        onChange={setLoanAsset}
                        options={[
                          { value: "USDC", label: "USDC" },
                          { value: "VCOP", label: "VCOP" },
                          { value: "ETH", label: "ETH" }
                        ]}
                        borderColor="border-emerald-300"
                      />
                      
                      <div className="bg-emerald-100 p-2 rounded-lg text-center">
                        <div className="text-sm font-bold text-emerald-900 flex items-center justify-center gap-1">
                          <AssetIcon asset={loanAsset} className="w-4 h-4" />
                          {calculateLoanFromLTV().toFixed(4)} {loanAsset}
                        </div>
                        <div className="text-xs text-emerald-700">
                          ${(calculateLoanFromLTV() * assetPrices[loanAsset as keyof typeof assetPrices]).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 p-2 rounded-lg text-center">
                        <div className="text-sm font-bold text-yellow-900">
                          {easyLTV > 90 ? "12" : easyLTV > 75 ? "8" : "6"}% APR
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Feedback */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                  <h5 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    📊 Live Metrics
                  </h5>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getRiskLevelBgColor(riskLevel)} ${getRiskLevelColor(riskLevel)}`}>
                        {getRiskIcon(riskLevel)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Risk</div>
                    </div>
                    
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        {healthFactor}
                      </div>
                      <div className="text-xs text-gray-600">Health</div>
                    </div>
                    
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        {(isEasyMode ? easyLTV : currentLTV).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">LTV</div>
                    </div>
                  </div>
                </div>

                {/* Balance Information */}
                {balanceInfo.eth && balanceInfo.usdc && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      💰 Your Balances
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center bg-white p-2 rounded-lg">
                        <div className="text-sm font-bold text-gray-900">
                          {parseFloat(balanceInfo.eth.formatted).toFixed(4)} ETH
                        </div>
                        <div className={`text-xs ${balanceInfo.eth.sufficient ? 'text-green-600' : 'text-red-600'}`}>
                          {balanceInfo.eth.sufficient ? '✅ Sufficient' : '❌ Insufficient'}
                        </div>
                      </div>
                      
                      <div className="text-center bg-white p-2 rounded-lg">
                        <div className="text-sm font-bold text-gray-900">
                          {parseFloat(balanceInfo.usdc.formatted).toFixed(2)} USDC
                        </div>
                        <div className={`text-xs ${balanceInfo.usdc.sufficient ? 'text-green-600' : 'text-red-600'}`}>
                          {balanceInfo.usdc.sufficient ? '✅ Sufficient' : '❌ Insufficient'}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={refetchBalances}
                      className="w-full mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh Balances
                    </button>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold">Error</span>
                    </div>
                    <p className="text-red-700 text-sm">{error}</p>
                    <button 
                      onClick={resetState}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Reset and try again
                    </button>
                  </div>
                )}

                {/* Success Display */}
                {success && txHash && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-semibold">Success!</span>
                    </div>
                    <p className="text-green-700 text-sm mb-2">Position created successfully!</p>
                    <a 
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on BaseScan
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* EXPERT MODE INTERFACE */
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-gray-600" />
                  Expert Configuration
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collateral Asset</label>
                    <AssetDropdown
                      value={collateralAsset}
                      onChange={setCollateralAsset}
                      options={[
                        { value: "ETH", label: "Ethereum (ETH)" },
                        { value: "WBTC", label: "Wrapped Bitcoin (WBTC)" },
                        { value: "USDC", label: "USD Coin (USDC)" }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Asset</label>
                    <AssetDropdown
                      value={loanAsset}
                      onChange={setLoanAsset}
                      options={[
                        { value: "USDC", label: "USD Coin (USDC)" },
                        { value: "VCOP", label: "VCOP Peso" },
                        { value: "ETH", label: "Ethereum (ETH)" }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collateral Amount</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* LTV Display */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">Current LTV Ratio</span>
                    <span className="text-xl font-bold text-blue-900">{currentLTV.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Balance Information for Expert Mode */}
                {balanceInfo.eth && balanceInfo.usdc && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      💰 Your Balances
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center bg-white p-2 rounded-lg">
                        <div className="text-sm font-bold text-gray-900">
                          {parseFloat(balanceInfo.eth.formatted).toFixed(4)} ETH
                        </div>
                        <div className={`text-xs ${balanceInfo.eth.sufficient ? 'text-green-600' : 'text-red-600'}`}>
                          {balanceInfo.eth.sufficient ? '✅ Sufficient' : '❌ Insufficient'}
                        </div>
                      </div>
                      
                      <div className="text-center bg-white p-2 rounded-lg">
                        <div className="text-sm font-bold text-gray-900">
                          {parseFloat(balanceInfo.usdc.formatted).toFixed(2)} USDC
                        </div>
                        <div className={`text-xs ${balanceInfo.usdc.sufficient ? 'text-green-600' : 'text-red-600'}`}>
                          {balanceInfo.usdc.sufficient ? '✅ Sufficient' : '❌ Insufficient'}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={refetchBalances}
                      className="w-full mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh Balances
                    </button>
                  </div>
                )}

                {/* Error Display for Expert Mode */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold">Error</span>
                    </div>
                    <p className="text-red-700 text-sm">{error}</p>
                    <button 
                      onClick={resetState}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Reset and try again
                    </button>
                  </div>
                )}

                {/* Success Display for Expert Mode */}
                {success && txHash && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-semibold">Success!</span>
                    </div>
                    <p className="text-green-700 text-sm mb-2">Position created successfully!</p>
                    <a 
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on BaseScan
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={handleCreatePosition}
                disabled={isLoading}
                className={`flex-1 font-semibold py-3 px-4 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isLoading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : success
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : error
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    {step === 'checking' && (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Checking balances...
                      </>
                    )}
                    {step === 'approving' && (
                      <>
                        <CheckCircle className="w-4 h-4 animate-spin" />
                        Approving collateral...
                      </>
                    )}
                    {step === 'creating' && (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        Creating position...
                      </>
                    )}
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Position Created!
                    {txHash && (
                      <ExternalLink 
                        className="w-4 h-4 cursor-pointer" 
                        onClick={() => window.open(`https://sepolia.basescan.org/tx/${txHash}`, '_blank')}
                      />
                    )}
                  </>
                ) : error ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Try Again
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    🚀 Create Real Position
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              <button 
                onClick={() => {
                  resetState();
                  if (isEasyMode) {
                    setEasyLTV(60);
                    setEasyCollateralAmount(1);
                    setSelectedPreset(0);
                  } else {
                    setCollateralAmount("1");
                    setLoanAmount("1500");
                  }
                }}
                className="flex-1 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-4 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Form
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RealPositionCreator; 