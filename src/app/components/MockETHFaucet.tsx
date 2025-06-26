import React from 'react';
import { Droplets, CheckCircle, AlertTriangle, Loader2, TrendingUp, Clock } from 'lucide-react';
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
    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-800">MockETH Faucet</span>
        </div>
        
        {!isConnected ? (
          <span className="text-xs text-gray-500">Connect wallet</span>
        ) : !addressesReady ? (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
            <span className="text-xs text-amber-600">Loading...</span>
          </div>
        ) : hasSuccess ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700">Minted 1 ETH!</span>
            <button
              onClick={resetFaucet}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Reset
            </button>
          </div>
        ) : hasError ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-700">Failed</span>
            <button
              onClick={resetFaucet}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <button
            onClick={requestETH}
            disabled={!canRequest}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Minting...'}
              </>
            ) : (
              <>
                <Droplets className="w-3 h-3" />
                Get 1 ETH
              </>
            )}
          </button>
        )}
      </div>
      
      {balance && (
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-gray-600">Current Balance:</span>
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {balance.formatted} {balance.symbol}
          </span>
        </div>
      )}
      
      {hasError && (
        <div className="mt-2 text-xs text-red-600">
          {error}
        </div>
      )}
      
      {hasSuccess && txHash && (
        <div className="mt-2">
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            View on BaseScan ↗
          </a>
        </div>
      )}
    </div>
  );
};

export default MockETHFaucet; 