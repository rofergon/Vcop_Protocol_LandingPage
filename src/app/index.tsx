import React from 'react';
import { 
  Zap,
  BarChart3,
  Activity,
  Wallet,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  ArrowDownToLine,
  ExternalLink
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useUserPositions } from '../hooks/useUserPositions';
import { useOraclePrices } from '../hooks/useOraclePrices';
import { OraclePricesProvider } from '../components/OraclePricesProvider';
import CreatePositionTab from './components/CreatePositionTab';
import AnalyticsTab from './components/AnalyticsTab';
import AssetIcon from './components/AssetIcon';

// Custom dropdown component (copiado del InteractiveLoanDemo)
const AssetDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  borderColor?: string;
}> = ({ value, onChange, options, className = "", borderColor = "border-gray-300" }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
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

// Temporary MyPositionsTab component inline
const MyPositionsTab: React.FC = () => {
  const { address, isConnected } = useAccount();
  const {
    positions,
    isLoading,
    error,
    repayFullPosition,
    repayPartialPosition,
    refreshPositions,
    isRepaying,
    isApproving,
    txError,
    getAssetSymbol: getAssetSymbolFromPositions
  } = useUserPositions();
  
  // 🔧 FIX: Usar precios dinámicos del oracle
  const { prices: oraclePrices } = useOraclePrices();

  // 🔧 FIX: Usar la función getAssetSymbol del hook useUserPositions que tiene las direcciones correctas
  const getAssetSymbol = (assetAddress: string): string => {
    return getAssetSymbolFromPositions(assetAddress as `0x${string}`)
  };

  // 🔧 FIX: Función helper para formatear interés con decimales correctos
  const formatInterest = (accruedInterest: bigint, loanAsset: string): string => {
    const symbol = getAssetSymbol(loanAsset);
    let decimals = 18; // Default para ETH
    
    if (symbol === 'USDC') {
      decimals = 6;
    }
    
    const divisor = Math.pow(10, decimals);
    const formatted = (Number(accruedInterest) / divisor).toFixed(decimals === 6 ? 4 : 6);
    
    return `${formatted} ${symbol}`;
  };

  const formatHealthFactor = (ratio: bigint): string => {
    if (ratio === 0n) return '0.0';
    if (ratio >= 5000000n) return '∞'; // 500%+ is considered infinite
    return (Number(ratio) / 1000000).toFixed(2);
  };

  const getRiskColor = (ratio: bigint): string => {
    const numRatio = Number(ratio) / 1000000; // Convert to percentage
    if (numRatio >= 200) return 'text-green-600';
    if (numRatio >= 150) return 'text-blue-600';
    if (numRatio >= 120) return 'text-yellow-600';
    if (numRatio >= 110) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskBgColor = (ratio: bigint): string => {
    const numRatio = Number(ratio) / 1000000; // Convert to percentage
    if (numRatio >= 200) return 'bg-green-50 border-green-200';
    if (numRatio >= 150) return 'bg-blue-50 border-blue-200';
    if (numRatio >= 120) return 'bg-yellow-50 border-yellow-200';
    if (numRatio >= 110) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  if (!isConnected) {
    return (
      <div className="p-6 text-center py-12">
        <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Please connect your wallet to view your positions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Positions...</h3>
        <p className="text-gray-600">Fetching your loan positions from the blockchain.</p>
      </div>
    );
  }

  if (error || txError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Positions</h3>
          <p className="text-red-700 mb-4">{error || (txError instanceof Error ? txError.message : String(txError))}</p>
          <button 
            onClick={refreshPositions}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Positions</h3>
          <p className="text-gray-600 mb-6">You haven't created any loan positions yet.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-800 text-sm">
              📊 Position management features:
            </p>
            <ul className="text-blue-700 text-sm mt-2 text-left space-y-1">
              <li>• Real-time health monitoring</li>
              <li>• Add/withdraw collateral</li>
              <li>• Repay loans</li>
              <li>• Liquidation alerts</li>
              <li>• Position history</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Positions</h2>
          <p className="text-gray-600">Manage your active loan positions</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshPositions}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-sm text-gray-500">
            {positions.length} position{positions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Transaction Status Banner */}
      {(isApproving || isRepaying) && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <div>
              <h3 className="font-semibold text-blue-900">
                {isApproving ? '🔄 Step 1-2: Approving Tokens...' : '🚀 Step 2-2: Executing Repayment...'}
              </h3>
              <p className="text-blue-700 text-sm">
                {isApproving 
                  ? 'Please sign the approval transaction(s) in your wallet. You may need to sign 2 approvals.' 
                  : 'Please sign the repayment transaction in your wallet.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {positions.length > 0 && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
            ℹ️ Repayment Process
          </h3>
          <p className="text-emerald-700 text-sm mb-2">
            <strong>Two-Step Process:</strong> First repay your loan, then withdraw your collateral.
          </p>
          <ul className="text-emerald-700 text-sm space-y-1">
            <li>• <strong>Step 1:</strong> Repay your loan using the "Repay Loan" button</li>
            <li>• <strong>Step 2:</strong> After successful repayment, use "Withdraw Collateral" to recover your assets</li>
            <li>• <strong>Safety:</strong> All transactions are simulated before execution</li>
          </ul>
        </div>
      )}

      {/* Positions Grid */}
      <div className="space-y-6">
        {positions.map((positionData) => (
          <div key={positionData.positionId.toString()} 
               className="bg-white rounded-xl border border-gray-200 p-4">
            {/* Position Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Position #{positionData.positionId.toString()}
                  {positionData.isAtRisk && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      ⚠️ At Risk
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-gray-600">
                    <AssetIcon asset={getAssetSymbol(positionData.position.collateralAsset)} className="w-4 h-4" />
                    {getAssetSymbol(positionData.position.collateralAsset)} → {getAssetSymbol(positionData.position.loanAsset)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created: {new Date(Number(positionData.position.createdAt) * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-lg font-bold ${getRiskColor(positionData.collateralizationRatio)}`}>
                  {formatHealthFactor(positionData.collateralizationRatio)}x
                </div>
                <div className="text-xs text-gray-500">Health Factor</div>
              </div>
            </div>

            {/* Position Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Collateral</div>
                <div className="font-semibold text-gray-900">
                  {parseFloat(positionData.collateralValueFormatted).toFixed(4)} {getAssetSymbol(positionData.position.collateralAsset)}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Borrowed</div>
                <div className="font-semibold text-gray-900">
                  {parseFloat(positionData.debtValueFormatted).toFixed(2)} {getAssetSymbol(positionData.position.loanAsset)}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Interest</div>
                <div className="font-semibold text-gray-900">
                  {formatInterest(positionData.accruedInterest, positionData.position.loanAsset)}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">LTV Ratio</div>
                <div className="font-semibold text-gray-900">
                  {(() => {
                    // 🔧 FIX: Calcular LTV correctamente usando precios del oracle y decimales correctos
                    const collateralSymbol = getAssetSymbol(positionData.position.collateralAsset);
                    const loanSymbol = getAssetSymbol(positionData.position.loanAsset);
                    
                    // Obtener cantidades ya normalizadas (el hook useUserPositions ya las normaliza por decimales)
                    const collateralAmount = parseFloat(positionData.collateralValueFormatted);
                    const loanAmount = parseFloat(positionData.debtValueFormatted);
                    
                    // Obtener precios del oracle según el símbolo del asset
                    let collateralPrice = 1; // Default
                    let loanPrice = 1; // Default
                    
                    switch (collateralSymbol) {
                      case 'ETH':
                        collateralPrice = oraclePrices.ETH;
                        break;
                      case 'WBTC':
                        collateralPrice = oraclePrices.WBTC;
                        break;
                      case 'USDC':
                        collateralPrice = oraclePrices.USDC; // Siempre $1
                        break;
                      case 'VCOP':
                        collateralPrice = oraclePrices.VCOP;
                        break;
                      case 'WGOLD':
                        collateralPrice = oraclePrices.WGOLD;
                        break;
                    }
                    
                    switch (loanSymbol) {
                      case 'ETH':
                        loanPrice = oraclePrices.ETH;
                        break;
                      case 'WBTC':
                        loanPrice = oraclePrices.WBTC;
                        break;
                      case 'USDC':
                        loanPrice = oraclePrices.USDC; // Siempre $1
                        break;
                      case 'VCOP':
                        loanPrice = oraclePrices.VCOP;
                        break;
                      case 'WGOLD':
                        loanPrice = oraclePrices.WGOLD;
                        break;
                    }
                    
                    // Calcular valores en USD
                    const collateralValueUSD = collateralAmount * collateralPrice;
                    const loanValueUSD = loanAmount * loanPrice;
                    
                    if (collateralValueUSD === 0) return '0.0%';
                    
                    const ltvRatio = (loanValueUSD / collateralValueUSD) * 100;
                    return `${ltvRatio.toFixed(1)}%`;
                  })()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const result = await repayFullPosition(positionData.positionId, positionData.position.loanAsset);
                    if (result.success) {
                      if (result.message) {
                        alert(result.message);
                      } else {
                        alert('✅ Loan repaid successfully! You can now withdraw your collateral.');
                      }
                      refreshPositions();
                    } else {
                      if (result.error?.includes('already been repaid')) {
                        alert('ℹ️ This loan has already been repaid. You can now withdraw your collateral.');
                      } else if (result.error?.includes('cancelled')) {
                        alert('❌ Transaction was cancelled by user.');
                      } else if (result.error?.includes('insufficient')) {
                        alert('❌ Insufficient USDC balance. Please get more USDC tokens first.');
                      } else {
                        alert(`❌ Repayment failed: ${result.error}`);
                      }
                    }
                  } catch (error) {
                    alert('❌ An unexpected error occurred. Please try again.');
                  }
                }}
                disabled={isApproving || isRepaying}
                className={`flex-1 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isApproving || isRepaying 
                    ? 'bg-gray-400'
                    : (Number(positionData.debtValueFormatted) === 0 || parseFloat(positionData.debtValueFormatted) === 0)
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {(isApproving || isRepaying) ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {isApproving ? 'Approving...' : 'Repaying...'}
                  </>
                ) : (
                  <>
                    {(Number(positionData.debtValueFormatted) === 0 || parseFloat(positionData.debtValueFormatted) === 0) ? (
                      <>
                        <ArrowDownToLine className="w-4 h-4" />
                        Withdraw Collateral
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Repay Loan
                      </>
                    )}
                  </>
                )}
              </button>
              
              {Number(positionData.debtValueFormatted) > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const amount = prompt("Enter amount to repay (USDC):");
                      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                        const result = await repayPartialPosition(
                          positionData.positionId, 
                          positionData.position.loanAsset, 
                          BigInt(Math.floor(Number(amount) * 1e6))
                        );
                        if (result.success) {
                          alert(`✅ Successfully repaid ${amount} USDC!`);
                          refreshPositions();
                        } else {
                          if (result.error?.includes('cancelled')) {
                            alert('❌ Transaction was cancelled by user.');
                          } else if (result.error?.includes('insufficient')) {
                            alert('❌ Insufficient USDC balance. Please get more USDC tokens first.');
                          } else {
                            alert(`❌ Partial repayment failed: ${result.error}`);
                          }
                        }
                      } else if (amount !== null) {
                        alert('❌ Please enter a valid amount greater than 0.');
                      }
                    } catch (error) {
                      alert('❌ An unexpected error occurred. Please try again.');
                    }
                  }}
                  disabled={isApproving || isRepaying}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Partial Repay
                </button>
              )}
              
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => window.open(`https://subnets-test.avax.network/c-chain/address/${positionData.position.borrower}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LoanApp: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'create' | 'positions' | 'analytics'>('create');
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

  const handleConnectWallet = () => {
    open();
  };

  return (
    <OraclePricesProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full p-1 flex items-center justify-center">
                  <img src="/logovcop.png" alt="VCOP" className="w-full h-full object-contain rounded-full" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">VCOP Loan Portal</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Network: <span className="text-emerald-600 font-semibold">Avalanche Fuji</span>
                </div>
                
                <button 
                  onClick={handleConnectWallet}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    isConnected 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  {isConnected ? (
                    <span>
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Dashboard Content */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">VCOP Lending Dashboard</h1>
            <p className="text-gray-600">Manage your flexible loan positions with unlimited LTV ratios</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'create'
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Create Position
                </button>
                
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'positions'
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  My Positions
                </button>
                
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'analytics'
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Analytics
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-0">
              {activeTab === 'create' && <CreatePositionTab isConnected={isConnected} />}
              {activeTab === 'positions' && <MyPositionsTab />}
              {activeTab === 'analytics' && <AnalyticsTab />}
            </div>
          </div>
        </main>
      </div>
    </OraclePricesProvider>
  );
};

export default LoanApp; 