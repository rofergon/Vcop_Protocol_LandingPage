import React from 'react';
import { Droplets, CheckCircle, AlertTriangle, Loader2, TrendingUp, Clock, Wallet } from 'lucide-react';
import { useMockETHFaucet } from '../../hooks/useMockETHFaucet';
import useContractAddresses from '../../hooks/useContractAddresses';

const MockETHFaucet: React.FC = () => {
  const {
    isLoading,
    error,
    success,
    txHash,
    isConfirming,
    requestETH,
    resetFaucet,
    isConnected,
    balance,
    canRequest,
    hasError,
    hasSuccess
  } = useMockETHFaucet();
  
  const { isReady: addressesReady } = useContractAddresses();

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg p-2 shadow-lg min-w-[260px]">
      {/* Header ultra compacto */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="bg-blue-100 p-1 rounded">
            <Droplets className="w-3 h-3 text-blue-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1">
              MockETH Faucet
              <span className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded-full font-medium">
                Free
              </span>
            </h4>
          </div>
        </div>
        {/* Balance inline en header */}
        {balance && (
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {balance.formatted} mockETH
            </div>
          </div>
        )}
      </div>

      {/* Action Section ultra compacta */}
      <div>
        {!isConnected ? (
          <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3 text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">Connect wallet</p>
            </div>
          </div>
        ) : !addressesReady ? (
          <div className="bg-blue-50 border border-blue-200 rounded p-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
              <p className="text-xs text-blue-700 font-medium">Loading...</p>
            </div>
          </div>
        ) : hasSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded p-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <p className="text-xs text-green-800 font-bold">Success!</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={resetFaucet}
                  className="bg-green-600 text-white py-1 px-2 rounded text-xs hover:bg-green-700 transition-colors"
                >
                  More
                </button>
                {txHash && (
                  <a
                    href={`https://subnets-test.avax.network/c-chain/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : hasError ? (
          <div className="bg-red-50 border border-red-200 rounded p-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <p className="text-xs text-red-800 font-bold">Failed</p>
              </div>
              <button
                onClick={resetFaucet}
                className="bg-red-600 text-white py-1 px-2 rounded text-xs hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={requestETH}
            disabled={!canRequest}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-3 rounded hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-xs"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{isConfirming ? 'Confirming...' : 'Minting...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <Droplets className="w-3 h-3" />
                <span>Get 1 ETH Now</span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default MockETHFaucet; 