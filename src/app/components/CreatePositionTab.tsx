import React from 'react';
import { 
  Calculator,
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
  ExternalLink,
  Loader2,
  Hash
} from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useCreatePosition } from '../../hooks/useCreatePosition';
import type { CreatePositionParams } from '../../hooks/useCreatePosition';
import useContractAddresses from '../../hooks/useContractAddresses';
import MockETHFaucet from './MockETHFaucet';
import { useOraclePrices } from '../../hooks/useOraclePrices';
import { AssetDropdown } from './AssetDropdown';
import AssetIcon from './AssetIcon';
import { 
  calculateRiskLevel, 
  getRiskIcon, 
  getRiskLevelColor, 
  getRiskLevelBgColor, 
  formatHealthFactor 
} from '../../utils/riskCalculations';

export const CreatePositionTab: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
  const [isEasyMode, setIsEasyMode] = React.useState(true);
  const [selectedPreset, setSelectedPreset] = React.useState(0);
  
  // Position parameters
  const [collateralAsset, setCollateralAsset] = React.useState("ETH");
  const [loanAsset, setLoanAsset] = React.useState("USDC");
  const [collateralAmount, setCollateralAmount] = React.useState("1");
  const [loanAmount, setLoanAmount] = React.useState("1500");

  // Easy mode state  
  const [easyCollateralAmount, setEasyCollateralAmount] = React.useState(1);
  const [easyLTV, setEasyLTV] = React.useState(60);

  const { open } = useAppKit();

  // Hook centralizado de direcciones
  const { addresses, isReady: addressesReady, getAssetSymbol } = useContractAddresses();

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
    isApprovePending,
    isCreateLoanPending,
    refetchBalances,
    // 🆕 NUEVA INFORMACIÓN DE PROGRESO
    progressInfo
  } = useCreatePosition({
    autoVerifyBalances: true
  });

  const LOAN_PRESETS = [
    { name: "Conservative", ltv: 60, description: "Safe", color: "emerald" },
    { name: "Moderate", ltv: 75, description: "Balanced", color: "blue" },
    { name: "Aggressive", ltv: 90, description: "Leverage", color: "yellow" },
    { name: "Extreme", ltv: 95, description: "Maximum", color: "orange" }
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
    
    try {
      // 🔍 Mapear assets seleccionados a direcciones de contratos
      const getAssetAddress = (asset: string) => {
        switch (asset.toUpperCase()) {
          case 'ETH': 
            return addresses.mockETH;
          case 'USDC': 
            return addresses.mockUSDC;
          case 'WBTC': 
            return addresses.mockWBTC;
          case 'VCOP': 
            return addresses.mockUSDC; // VCOP no existe, usar USDC
          case 'WGOLD': 
            return addresses.mockUSDC; // WGOLD no existe como contrato, usar USDC
          default: 
            return addresses.mockETH;
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

    const { currentTransaction, totalTransactions, needsApproval, isApproving, isCreating } = progressInfo;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-semibold text-blue-900 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
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
              {progressInfo.approveHash && (
                <a
                  href={`https://subnets-test.avax.network/c-chain/tx/${progressInfo.approveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 ml-1"
                >
                  <Hash className="w-3 h-3" />
                </a>
              )}
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
            ℹ️ Next: Sign transaction to create your position
          </div>
        )}
      </div>
    );
  };

  // 🆕 FUNCIÓN PARA RENDERIZAR EL ESTADO DEL BOTÓN
  const renderButtonContent = () => {
    if (isLoading) {
      switch (step) {
        case 'checking':
          return (
            <>
              <Clock className="w-3 h-3 animate-spin" />
              Checking...
            </>
          );
        case 'validating':
          return (
            <>
              <Clock className="w-3 h-3 animate-spin" />
              Validating...
            </>
          );
        case 'approving':
          return (
            <>
              <CheckCircle className="w-3 h-3 animate-spin" />
              {progressInfo.needsApproval ? 
                `Approve (${progressInfo.currentTransaction}/${progressInfo.totalTransactions})` : 
                'Approving...'
              }
            </>
          );
        case 'creating':
          return (
            <>
              <Zap className="w-3 h-3 animate-spin" />
              {progressInfo.needsApproval ? 
                `Creating (${progressInfo.currentTransaction}/${progressInfo.totalTransactions})` : 
                'Creating...'
              }
            </>
          );
        default:
          return (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </>
          );
      }
    } else if (success) {
      return (
        <>
          <CheckCircle className="w-3 h-3" />
          View Transaction
          <ExternalLink className="w-3 h-3" />
        </>
      );
    } else if (error) {
      return (
        <>
          <AlertTriangle className="w-3 h-3" />
          Try Again
        </>
      );
    } else {
      return (
        <>
          <Zap className="w-3 h-3" />
          Create Position
          <ArrowRight className="w-3 h-3" />
        </>
      );
    }
  };

  return (
    <div className="relative p-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Faucet en esquina superior */}
      <div className="absolute top-1 right-1 z-10">
        <MockETHFaucet />
      </div>
      
      {/* Header Compacto */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4" />
              VCOP Position Creator
            </h3>
            <p className="text-emerald-100 text-xs">Create loans with flexible ratios 🚀</p>
          </div>
          
          {/* Mode Toggle integrado en header */}
          <div className="bg-white/20 rounded-full p-0.5 flex text-xs">
            <button
              onClick={() => setIsEasyMode(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all ${
                isEasyMode 
                  ? 'bg-white text-emerald-600 font-semibold' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              Easy
            </button>
            <button
              onClick={() => setIsEasyMode(false)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all ${
                !isEasyMode 
                  ? 'bg-white text-emerald-600 font-semibold' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Calculator className="w-3 h-3" />
              Expert
            </button>
          </div>
        </div>
      </div>

      <div className="p-3">
        {!isConnected ? (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Connect Your Wallet</h3>
            <p className="text-gray-600 text-sm">Please connect your wallet to create loan positions.</p>
          </div>
        ) : (
          <>
            {isEasyMode ? (
              /* EASY MODE INTERFACE COMPACTO */
              <div className="space-y-3">
                {/* Preset Selection + LTV Slider Combinados */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                      <Target className="w-3 h-3 text-emerald-600" />
                      Risk: {LOAN_PRESETS[selectedPreset].name}
                    </h4>
                    <div className="text-lg font-bold text-emerald-600">{easyLTV}%</div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {LOAN_PRESETS.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedPreset(index);
                          setEasyLTV(preset.ltv);
                        }}
                        className={`p-1.5 rounded border transition-all text-center text-xs ${
                          selectedPreset === index
                            ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <div className="font-bold">{preset.ltv}%</div>
                        <div className="text-xs">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                  
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={easyLTV}
                    onChange={(e) => setEasyLTV(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #3b82f6 60%, #f59e0b 75%, #ef4444 90%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>🟢 Safe</span>
                    <span>⚠️ Risk</span>
                    <span>🚀 Max</span>
                  </div>
                </div>

                {/* Assets Compactos */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Collateral Section */}
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <h5 className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Collateral
                    </h5>
                    
                    <AssetDropdown
                      value={collateralAsset}
                      onChange={setCollateralAsset}
                      options={[
                        { value: "ETH", label: "ETH" },
                        { value: "WBTC", label: "WBTC" },
                        { value: "USDC", label: "USDC" },
                        { value: "WGOLD", label: "WGOLD" }
                      ]}
                      borderColor="border-blue-300"
                      className="mb-1"
                    />
                    
                    <div className="relative mb-1">
                      <input
                        type="number"
                        step="0.1"
                        value={easyCollateralAmount}
                        onChange={(e) => setEasyCollateralAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 text-xs border border-blue-300 rounded"
                        placeholder="0.0"
                      />
                      <AssetIcon asset={collateralAsset} className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-3" />
                    </div>
                    
                    <div className="bg-blue-100 p-1 rounded text-center text-xs font-bold text-blue-900">
                      ${(easyCollateralAmount * assetPrices[collateralAsset as keyof typeof assetPrices]).toLocaleString()}
                    </div>
                  </div>

                  {/* Loan Section */}
                  <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                    <h5 className="text-xs font-semibold text-emerald-900 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Loan
                    </h5>
                    
                    <AssetDropdown
                      value={loanAsset}
                      onChange={setLoanAsset}
                      options={[
                        { value: "USDC", label: "USDC" },
                        { value: "VCOP", label: "VCOP" },
                        { value: "ETH", label: "ETH" },
                        { value: "WGOLD", label: "WGOLD" }
                      ]}
                      borderColor="border-emerald-300"
                      className="mb-1"
                    />
                    
                    <div className="bg-emerald-100 p-1 rounded text-center mb-1">
                      <div className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1">
                        <AssetIcon asset={loanAsset} className="w-3 h-3" />
                        {calculateLoanFromLTV().toFixed(4)} {loanAsset}
                      </div>
                      <div className="text-xs text-emerald-700">
                        ${(calculateLoanFromLTV() * assetPrices[loanAsset as keyof typeof assetPrices]).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-1 rounded text-center text-xs font-bold text-yellow-900">
                      {easyLTV > 90 ? "12" : easyLTV > 75 ? "8" : "6"}% APR
                    </div>
                  </div>
                </div>

                {/* Oracle Prices + Live Metrics Combinados */}
                <div className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-lg p-2 border border-cyan-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      🔮 Oracle Prices & Metrics
                    </h5>
                    <div className="flex items-center gap-1">
                      {pricesError && <span className="text-xs text-red-600">⚠️</span>}
                      {pricesLoading && <div className="animate-spin w-2 h-2 border border-cyan-500 border-t-transparent rounded-full"></div>}
                      <button onClick={refetchPrices} className="text-xs text-cyan-600 hover:text-cyan-800">🔄</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-8 gap-1 text-xs">
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">${assetPrices.ETH.toLocaleString()}</div>
                      <div className="text-gray-600">ETH</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">${assetPrices.WBTC.toLocaleString()}</div>
                      <div className="text-gray-600">WBTC</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">${assetPrices.USDC.toFixed(2)}</div>
                      <div className="text-gray-600">USDC</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">${assetPrices.VCOP.toFixed(4)}</div>
                      <div className="text-gray-600">VCOP</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">${assetPrices.WGOLD.toLocaleString()}</div>
                      <div className="text-gray-600">WGOLD</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className={`inline-flex items-center justify-center w-full rounded text-xs font-bold ${getRiskLevelBgColor(riskLevel)} ${getRiskLevelColor(riskLevel)}`}>
                        {React.createElement(getRiskIcon(riskLevel), { className: "w-3 h-3" })}
                      </div>
                      <div className="text-gray-600">Risk</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">{healthFactor}</div>
                      <div className="text-gray-600">Health</div>
                    </div>
                    <div className="text-center bg-white p-1 rounded">
                      <div className="font-bold text-gray-900">{(isEasyMode ? easyLTV : currentLTV).toFixed(1)}%</div>
                      <div className="text-gray-600">LTV</div>
                    </div>
                  </div>
                  
                  {lastUpdated && (
                    <div className="text-xs text-gray-600 mt-1 text-center">
                      Updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* Balance Information Compacto */}
                {balanceInfo.eth && balanceInfo.usdc && (
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        💰 Balances
                      </h5>
                      <button onClick={refetchBalances} className="text-xs text-blue-600 hover:text-blue-800">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="text-center bg-white p-1 rounded">
                        <div className="font-bold text-gray-900">{parseFloat(balanceInfo.eth.formatted).toFixed(4)} ETH</div>
                        <div className={balanceInfo.eth.sufficient ? 'text-green-600' : 'text-red-600'}>
                          {balanceInfo.eth.sufficient ? '✅' : '❌'}
                        </div>
                      </div>
                      <div className="text-center bg-white p-1 rounded">
                        <div className="font-bold text-gray-900">{parseFloat(balanceInfo.usdc.formatted).toFixed(2)} USDC</div>
                        <div className={balanceInfo.usdc.sufficient ? 'text-green-600' : 'text-red-600'}>
                          {balanceInfo.usdc.sufficient ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🆕 PROGRESO DE TRANSACCIONES */}
                {renderTransactionProgress()}

                {/* Error/Success Display Compacto */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-red-800">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs font-semibold">Error</span>
                      </div>
                      <button onClick={resetState} className="text-xs text-red-600 hover:text-red-800">Reset</button>
                    </div>
                    <p className="text-red-700 text-xs mt-1">{error}</p>
                  </div>
                )}

                {success && txHash && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs font-semibold">Success!</span>
                      </div>
                      <a 
                        href={`https://subnets-test.avax.network/c-chain/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-green-700 text-xs">Position created successfully!</p>
                  </div>
                )}
              </div>
            ) : (
              /* EXPERT MODE INTERFACE COMPACTO */
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                  <Calculator className="w-4 h-4 text-gray-600" />
                  Expert Configuration
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Collateral</label>
                    <AssetDropdown
                      value={collateralAsset}
                      onChange={setCollateralAsset}
                      options={[
                        { value: "ETH", label: "ETH" },
                        { value: "WBTC", label: "WBTC" },
                        { value: "USDC", label: "USDC" },
                        { value: "WGOLD", label: "WGOLD" }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Loan</label>
                    <AssetDropdown
                      value={loanAsset}
                      onChange={setLoanAsset}
                      options={[
                        { value: "USDC", label: "USDC" },
                        { value: "VCOP", label: "VCOP" },
                        { value: "ETH", label: "ETH" },
                        { value: "WGOLD", label: "WGOLD" }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Collateral Amount</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Loan Amount</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* LTV Display Compacto */}
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-800">Current LTV</span>
                    <span className="text-sm font-bold text-blue-900">{currentLTV.toFixed(2)}%</span>
                  </div>
                </div>

                {/* 🆕 PROGRESO DE TRANSACCIONES PARA EXPERT MODE */}
                {renderTransactionProgress()}

                {/* Balance Information for Expert Mode */}
                {balanceInfo.eth && balanceInfo.usdc && (
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        💰 Balances
                      </h5>
                      <button onClick={refetchBalances} className="text-xs text-blue-600 hover:text-blue-800">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="text-center bg-white p-1 rounded">
                        <div className="font-bold text-gray-900">{parseFloat(balanceInfo.eth.formatted).toFixed(4)} ETH</div>
                        <div className={balanceInfo.eth.sufficient ? 'text-green-600' : 'text-red-600'}>
                          {balanceInfo.eth.sufficient ? '✅' : '❌'}
                        </div>
                      </div>
                      <div className="text-center bg-white p-1 rounded">
                        <div className="font-bold text-gray-900">{parseFloat(balanceInfo.usdc.formatted).toFixed(2)} USDC</div>
                        <div className={balanceInfo.usdc.sufficient ? 'text-green-600' : 'text-red-600'}>
                          {balanceInfo.usdc.sufficient ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display for Expert Mode */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-red-800">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs font-semibold">Error</span>
                      </div>
                      <button onClick={resetState} className="text-xs text-red-600 hover:text-red-800">Reset</button>
                    </div>
                    <p className="text-red-700 text-xs mt-1">{error}</p>
                  </div>
                )}

                {/* Success Display for Expert Mode */}
                {success && txHash && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs font-semibold">Success!</span>
                      </div>
                      <a 
                        href={`https://subnets-test.avax.network/c-chain/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-green-700 text-xs">Position created successfully!</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons Mejorados */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={handleMainButtonClick}
                disabled={isLoading}
                className={`flex-1 font-semibold py-2 px-3 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
                  isLoading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : success
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : error
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {renderButtonContent()}
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
                className="flex-1 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold py-2 px-3 text-xs rounded transition-colors flex items-center justify-center gap-1"
                disabled={isLoading}
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreatePositionTab; 