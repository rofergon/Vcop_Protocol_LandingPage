import React from 'react';
import { 
  Wallet,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  ArrowDownToLine,
  ExternalLink
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useUserPositions } from '../../hooks/useUserPositions';
import { useOraclePrices } from '../../hooks/useOraclePrices';
import AssetIcon from './AssetIcon';

export const MyPositionsTab: React.FC = () => {
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

export default MyPositionsTab; 