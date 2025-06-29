import React from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  Clock, 
  DollarSign,
  AlertTriangle,
  Shield,
  Activity,
  Target,
  RefreshCw
} from 'lucide-react';
import { RiskLevel } from '../../hooks/useRiskCalculator';
import { useOraclePrices } from '../../hooks/useOraclePrices';

interface RiskMetrics {
  riskLevel: RiskLevel;
  healthFactor: number;
  collateralizationRatio: number;
  theoreticalLiquidationPrice: number;
  priceDropToSuggestedLiquidation: number;
  maxBorrowableByLiquidity: number;
  maxWithdrawableByMath: number;
  timeToSuggestedLiquidation: number;
  systemFlexibilityNote: string;
}

interface PriceImpact {
  priceDropFor10PercentRisk: number;
  priceDropFor50PercentRisk: number;
  priceDropFor90PercentRisk: number;
  currentVolatility: number;
}

interface PositionSummaryProps {
  riskMetrics: RiskMetrics;
  priceImpact?: PriceImpact;
  collateralAsset: string;
  loanAsset: string;
  getRiskIcon: (riskLevel: RiskLevel) => React.ReactNode;
  formatHealthFactor: (healthFactor: number) => string;
  formatCollateralizationRatio: (ratio: number) => string;
  getRiskLevelColor: (riskLevel: RiskLevel) => string;
  getRiskLevelBgColor: (riskLevel: RiskLevel) => string;
}

// Asset icon component
const AssetIcon: React.FC<{ asset: string; className?: string }> = ({ asset, className = "w-4 h-4" }) => {
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

export const PositionSummary: React.FC<PositionSummaryProps> = ({
  riskMetrics,
  priceImpact,
  collateralAsset,
  loanAsset,
  getRiskIcon,
  formatHealthFactor,
  formatCollateralizationRatio,
  getRiskLevelColor,
  getRiskLevelBgColor
}) => {
  // 🔍 INTEGRACIÓN CON ORACLE: Obtener precios dinámicos
  const { 
    prices: oraclePrices, 
    isLoading: pricesLoading, 
    error: pricesError, 
    refetchPrices, 
    lastUpdated 
  } = useOraclePrices();
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Position Analysis
        </h3>
        <p className="text-purple-100 text-sm">Real-time risk assessment</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Risk Level Badge */}
        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getRiskLevelBgColor(riskMetrics.riskLevel)} ${getRiskLevelColor(riskMetrics.riskLevel)}`}>
            {getRiskIcon(riskMetrics.riskLevel)}
            <span className="ml-2">{riskMetrics.riskLevel.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 font-medium mb-1">Health Factor</div>
            <div className="text-lg font-bold text-blue-900">
              {formatHealthFactor(riskMetrics.healthFactor)}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 rounded-lg border border-emerald-200">
            <div className="text-xs text-emerald-600 font-medium mb-1">Collateral Ratio</div>
            <div className="text-lg font-bold text-emerald-900">
              {formatCollateralizationRatio(riskMetrics.collateralizationRatio)}
            </div>
          </div>
        </div>

        {/* Liquidation Info with Oracle Prices */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Liquidation Risk
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-700">Liquidation Price:</span>
              <span className="font-bold text-red-900">
                ${riskMetrics.theoreticalLiquidationPrice.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-700">Current Price:</span>
              <span className="font-bold text-gray-900">
                ${oraclePrices[collateralAsset as keyof typeof oraclePrices]?.toLocaleString() || 'Loading...'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-700">Price Drop to Liquidation:</span>
              <span className="font-bold text-red-900">
                -{riskMetrics.priceDropToSuggestedLiquidation.toFixed(1)}%
              </span>
            </div>
            
            {/* Real-time price difference */}
            {oraclePrices[collateralAsset as keyof typeof oraclePrices] && (
              <div className="mt-2 pt-2 border-t border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-600">Safety Margin:</span>
                  <span className="font-bold text-red-800">
                    ${(oraclePrices[collateralAsset as keyof typeof oraclePrices] - riskMetrics.theoreticalLiquidationPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Metrics */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">Position Limits</h4>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700">Max Borrowable:</span>
              <span className="font-bold text-blue-900">
                ${riskMetrics.maxBorrowableByLiquidity.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700">Max Withdrawable:</span>
              <span className="font-bold text-green-900 flex items-center gap-1">
                {riskMetrics.maxWithdrawableByMath.toFixed(4)} 
                <AssetIcon asset={collateralAsset} className="w-4 h-4" />
                {collateralAsset}
              </span>
            </div>
          </div>
          
          {riskMetrics.timeToSuggestedLiquidation > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-yellow-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time to Liquidation:
                </span>
                <span className="font-bold text-yellow-900">
                  {riskMetrics.timeToSuggestedLiquidation > 24 
                    ? `${Math.floor(riskMetrics.timeToSuggestedLiquidation / 24)}d` 
                    : `${Math.floor(riskMetrics.timeToSuggestedLiquidation)}h`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* VCOP Flexibility Note */}
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium mb-1">VCOP Flexibility:</div>
          <div className="text-xs text-purple-600">{riskMetrics.systemFlexibilityNote}</div>
        </div>

        {/* Price Impact Analysis */}
        {priceImpact && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Price Impact Scenarios
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">10% Risk Scenario:</span>
                <span className="font-medium">-{priceImpact.priceDropFor10PercentRisk.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">50% Risk Scenario:</span>
                <span className="font-medium">-{priceImpact.priceDropFor50PercentRisk.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">90% Risk Scenario:</span>
                <span className="font-medium">-{priceImpact.priceDropFor90PercentRisk.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-600">Asset Volatility:</span>
                <span className="font-medium">{priceImpact.currentVolatility.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Oracle Prices Display */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-cyan-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              🔮 Current Prices
            </h4>
            <div className="flex items-center gap-2">
              {pricesError && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  ⚠️
                </span>
              )}
              {pricesLoading && (
                <div className="animate-spin w-3 h-3 border border-cyan-500 border-t-transparent rounded-full"></div>
              )}
              <button 
                onClick={refetchPrices}
                className="text-xs text-cyan-600 hover:text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2 py-1 rounded-full transition-colors"
                title="Refresh prices"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center bg-white p-2 rounded-lg">
              <div className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1">
                <AssetIcon asset={collateralAsset} className="w-4 h-4" />
                ${oraclePrices[collateralAsset as keyof typeof oraclePrices]?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">{collateralAsset}</div>
            </div>
            
            <div className="text-center bg-white p-2 rounded-lg">
              <div className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1">
                <AssetIcon asset={loanAsset} className="w-4 h-4" />
                ${oraclePrices[loanAsset as keyof typeof oraclePrices]?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">{loanAsset}</div>
            </div>
          </div>
          
          {lastUpdated && (
            <div className="text-xs text-cyan-700 mt-2 text-center">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* VCOP Protocol Info */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
          <div className="text-center">
            <div className="text-sm font-semibold text-emerald-800 mb-1">
              🚀 VCOP Protocol Advantage
            </div>
            <div className="text-xs text-emerald-700">
              ANY ratio allowed! No traditional LTV limits.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 