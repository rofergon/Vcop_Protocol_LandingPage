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
import { useCreatePosition } from '../../hooks/useCreatePosition';
import type { LoanTerms, CreatePositionParams } from '../../hooks/useCreatePosition';
import useContractAddresses from '../../hooks/useContractAddresses';
import { parseUnits } from 'viem';
import MockETHFaucet from './MockETHFaucet';
import { useOraclePrices } from '../../hooks/useOraclePrices';

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
    case 'wgold':
      return <img src="/a6704b41-49c8-4224-8257-01388c290d3sinfondof.png" alt="WGOLD" className={`${className} inline-block align-middle rounded-full`} />;
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

  // Hook para direcciones de contratos
  const { addresses } = useContractAddresses();

  // Hook para crear posiciones (MEJORADO)
  const {
    createPosition,
    resetState,
    isLoading,
    error,
    success,
    txHash,
    step,
    balanceInfo,
    refetchBalances,
    // 🆕 NUEVA INFORMACIÓN DE PROGRESO
    progressInfo
  } = useCreatePosition({
    autoVerifyBalances: true
  });

  const LOAN_PRESETS = [
    { name: "Conservative", ltv: 60, description: "Safe and stable", color: "emerald" },
    { name: "Moderate", ltv: 75, description: "Balanced approach", color: "blue" },
    { name: "Aggressive", ltv: 90, description: "Higher leverage", color: "yellow" },
    { name: "Extreme", ltv: 95, description: "Maximum leverage", color: "orange" }
  ];

  // 🔍 INTEGRACIÓN CON ORACLE: Obtener precios dinámicos del MockVCOPOracle desplegado
  const { 
    prices: oraclePrices, 
    isLoading: pricesLoading, 
    error: pricesError, 
    refetchPrices, 
    lastUpdated 
  } = useOraclePrices();
  
  // Usar precios del oracle en lugar de hardcodeados
  const assetPrices = oraclePrices;

  const handleCreatePosition = async () => {
    if (!isConnected || !addresses) return;
    
    // 🔍 DEBUG: Verificar valores de estado antes de crear la posición
    console.log('🔍 DEBUG - Estado actual:', {
      isEasyMode,
      collateralAsset,
      loanAsset,
      collateralAmount,
      loanAmount,
      easyCollateralAmount,
      easyLTV,
      addresses: {
        mockETH: addresses.mockETH,
        mockUSDC: addresses.mockUSDC,
        mockWBTC: addresses.mockWBTC
      }
    });
    
    try {
      // Mapear assets seleccionados a direcciones de contratos
      const getAssetAddress = (asset: string) => {
        console.log('🔍 Mapping asset:', asset, 'to address');
        switch (asset.toUpperCase()) {
          case 'ETH': 
            console.log('  → ETH mapped to:', addresses.mockETH);
            return addresses.mockETH;
          case 'USDC': 
            console.log('  → USDC mapped to:', addresses.mockUSDC);
            return addresses.mockUSDC;
          case 'WBTC': 
            console.log('  → WBTC mapped to:', addresses.mockWBTC);
            return addresses.mockWBTC;
          case 'VCOP': 
            console.log('  → VCOP mapped to USDC:', addresses.mockUSDC);
            return addresses.mockUSDC; // VCOP no existe, usar USDC
          case 'WGOLD': 
            console.log('  → WGOLD mapped to USDC:', addresses.mockUSDC);
            return addresses.mockUSDC; // WGOLD no existe como contrato, usar USDC
          default: 
            console.log('  → Default mapped to ETH:', addresses.mockETH);
            return addresses.mockETH;
        }
      };

      // Obtener decimales por asset
      const getAssetDecimals = (asset: string) => {
        switch (asset.toUpperCase()) {
          case 'ETH': return 18;
          case 'WBTC': return 8;
          case 'USDC': return 6;
          case 'VCOP': return 6; // Asumir 6 decimales
          default: return 18;
        }
      };

      // Preparar cantidades en formato string (no BigInt)
      const collateralAmountStr = isEasyMode ? easyCollateralAmount.toString() : collateralAmount;
      const loanAmountStr = isEasyMode ? calculateLoanFromLTV().toString() : loanAmount;
      
      const customTerms: CreatePositionParams = {
        collateralAsset: getAssetAddress(collateralAsset),
        loanAsset: getAssetAddress(loanAsset),
        collateralAmount: collateralAmountStr,
        loanAmount: loanAmountStr,
        maxLoanToValue: isEasyMode ? easyLTV : currentLTV,
        interestRate: 8, // 8% APR
        duration: 0n // Perpetual
      };

      console.log('🚀 Creating position with user selections:', {
        collateral: collateralAsset,
        loan: loanAsset,
        collateralAddress: customTerms.collateralAsset,
        loanAddress: customTerms.loanAsset,
        terms: customTerms
      });

      await createPosition(customTerms);
    } catch (error) {
      console.error('Error creating position:', error);
    }
  };

  // 🆕 FUNCIÓN PARA MANEJAR EL BOTÓN PRINCIPAL
  const handleMainButtonClick = () => {
    if (success && txHash) {
      // Si la transacción fue exitosa, abrir explorador de bloques
      window.open(`https://subnets-test.avax.network/c-chain/tx/${txHash}`, '_blank');
    } else {
      // Si no, crear posición normalmente
      handleCreatePosition();
    }
  };

  const calculateLoanFromLTV = () => {
    const collateralValue = easyCollateralAmount * assetPrices[collateralAsset as keyof typeof assetPrices];
    return (collateralValue * easyLTV / 100) / assetPrices[loanAsset as keyof typeof assetPrices];
  };

  // 🔧 FIX: Consider asset decimals for accurate LTV calculation
  const getAssetDecimals = (asset: string): number => {
    if (asset === 'USDC') return 6;
    if (asset === 'WBTC') return 8;
    return 18; // ETH, VCOP default
  };

  const calculateCurrentLTV = () => {
    const collateralAmountValue = parseFloat(isEasyMode ? easyCollateralAmount.toString() : collateralAmount);
    const loanAmountValue = parseFloat(isEasyMode ? calculateLoanFromLTV().toString() : loanAmount);
    
    // Get prices
    const collateralPrice = assetPrices[collateralAsset as keyof typeof assetPrices];
    const loanPrice = assetPrices[loanAsset as keyof typeof assetPrices];
    
    // Calculate values in USD
    const collateralValueUSD = collateralAmountValue * collateralPrice;
    const loanValueUSD = loanAmountValue * loanPrice;
    
    if (collateralValueUSD === 0) return 0;
    
    return (loanValueUSD / collateralValueUSD) * 100;
  };

  const currentLTV = calculateCurrentLTV();
  
  // Calculate risk metrics based on current LTV
  const riskLevel = calculateRiskLevel(isEasyMode ? easyLTV : currentLTV);
  const healthFactor = formatHealthFactor(isEasyMode ? easyLTV : currentLTV);

  // 🆕 FUNCIÓN PARA RENDERIZAR EL PROGRESO DE TRANSACCIONES
  const renderTransactionProgress = () => {
    if (!isLoading) return null;

    const { currentTransaction, totalTransactions, needsApproval } = progressInfo;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-semibold text-blue-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Transaction Progress
          </h5>
          <span className="text-blue-600 text-sm font-bold">
            {currentTransaction}/{totalTransactions}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentTransaction / totalTransactions) * 100}%` }}
          ></div>
        </div>

        {/* Current Step */}
        <div className="text-xs text-blue-700">
          {step === 'checking' && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              Validating transaction parameters...
            </div>
          )}
          {step === 'validating' && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              Checking balances and allowances...
            </div>
          )}
          {step === 'approving' && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 animate-spin" />
              Sign approval transaction ({currentTransaction}/{totalTransactions})
            </div>
          )}
          {step === 'creating' && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 animate-spin" />
              {needsApproval ? 
                `Creating position (${currentTransaction}/${totalTransactions})` : 
                'Creating position...'
              }
            </div>
          )}
        </div>

        {/* Next Step Preview */}
        {needsApproval && step === 'approving' && (
          <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-600">
            ℹ️ Next: Sign transaction to create your position (automatically triggered)
          </div>
        )}
      </div>
    );
  };

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
                              <p className="text-emerald-100 text-sm">Create actual positions on Avalanche Fuji!</p>
            <div className="flex items-center gap-2 text-xs text-emerald-100 mt-1">
              <Activity className="w-3 h-3" />
                              <span>Connected to Avalanche Fuji testnet</span>
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
                          <p className="text-gray-600 mb-4">Connect to Avalanche Fuji to create real positions.</p>
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
                      onChange={(value) => {
                        console.log('🔍 Collateral asset changed to:', value);
                        setCollateralAsset(value);
                      }}
                      options={[
                        { value: "ETH", label: "ETH" },
                        { value: "WBTC", label: "WBTC" },
                        { value: "USDC", label: "USDC" },
                        { value: "WGOLD", label: "WGOLD" }
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
                        onChange={(value) => {
                          console.log('🔍 Loan asset changed to:', value);
                          setLoanAsset(value);
                        }}
                        options={[
                          { value: "USDC", label: "USDC" },
                          { value: "VCOP", label: "VCOP" },
                          { value: "ETH", label: "ETH" },
                          { value: "WGOLD", label: "WGOLD" }
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

                {/* Oracle Price Display */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-cyan-900 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      🔮 Oracle Prices
                    </h5>
                    <div className="flex items-center gap-2">
                      {pricesError && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                          ⚠️ Error
                        </span>
                      )}
                      {pricesLoading && (
                        <div className="animate-spin w-3 h-3 border border-cyan-500 border-t-transparent rounded-full"></div>
                      )}
                      <button 
                        onClick={refetchPrices}
                        className="text-xs text-cyan-600 hover:text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2 py-1 rounded-full transition-colors"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        ${assetPrices.ETH.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">ETH</div>
                    </div>
                    
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        ${assetPrices.WBTC.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">WBTC</div>
                    </div>
                    
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        ${assetPrices.USDC.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">USDC</div>
                    </div>
                    
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        ${assetPrices.VCOP.toFixed(6)}
                      </div>
                      <div className="text-xs text-gray-600">VCOP</div>
                    </div>
                    
                    <div className="text-center bg-white p-2 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        ${assetPrices.WGOLD.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">WGOLD</div>
                    </div>
                  </div>
                  
                  {lastUpdated && (
                    <div className="text-xs text-cyan-700 mt-2 text-center">
                      Updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* DEBUG DISPLAY */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                  <h6 className="font-semibold text-yellow-800 mb-1">🔍 Debug Info</h6>
                  <div className="grid grid-cols-2 gap-2 text-yellow-700">
                    <div>Collateral Asset: <strong>{collateralAsset}</strong></div>
                    <div>Loan Asset: <strong>{loanAsset}</strong></div>
                    <div>Collateral Amount: <strong>{isEasyMode ? easyCollateralAmount : collateralAmount}</strong></div>
                    <div>Loan Amount: <strong>{isEasyMode ? calculateLoanFromLTV().toFixed(4) : loanAmount}</strong></div>
                  </div>
                </div>

                {/* 🆕 PROGRESO DE TRANSACCIONES */}
                {renderTransactionProgress()}

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
                      href={`https://subnets-test.avax.network/c-chain/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on SnowTrace
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
                        { value: "USDC", label: "USD Coin (USDC)" },
                        { value: "WGOLD", label: "Wrapped Gold (WGOLD)" }
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
                        { value: "ETH", label: "Ethereum (ETH)" },
                        { value: "WGOLD", label: "Wrapped Gold (WGOLD)" }
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

                {/* 🆕 PROGRESO DE TRANSACCIONES PARA EXPERT MODE */}
                {renderTransactionProgress()}

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
                      href={`https://subnets-test.avax.network/c-chain/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on SnowTrace
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={handleMainButtonClick}
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
                        Checking...
                      </>
                    )}
                    {step === 'validating' && (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Validating...
                      </>
                    )}
                    {step === 'approving' && (
                      <>
                        <CheckCircle className="w-4 h-4 animate-spin" />
                        {progressInfo.needsApproval ? 
                          `Approve (${progressInfo.currentTransaction}/${progressInfo.totalTransactions})` : 
                          'Approving...'
                        }
                      </>
                    )}
                    {step === 'creating' && (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        {progressInfo.needsApproval ? 
                          `Creating (${progressInfo.currentTransaction}/${progressInfo.totalTransactions})` : 
                          'Creating...'
                        }
                      </>
                    )}
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    View Transaction
                    <ExternalLink className="w-4 h-4" />
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