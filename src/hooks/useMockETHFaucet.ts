import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseUnits } from 'viem';
import useContractAddresses from './useContractAddresses';
import MockETHABI from '../Abis/MockETH.json';

export interface FaucetState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  txHash: string | null;
  isConfirming: boolean;
}

export function useMockETHFaucet() {
  const { address, isConnected } = useAccount();
  const { addresses, isReady } = useContractAddresses();
  
  const [state, setState] = useState<FaucetState>({
    isLoading: false,
    error: null,
    success: false,
    txHash: null,
    isConfirming: false
  });

  // Balance del usuario para MockETH
  const { data: ethBalance, refetch: refetchBalance } = useBalance({
    address,
    token: addresses?.mockETH,
    query: { enabled: !!address && !!addresses?.mockETH }
  });

  const {
    writeContract: mintETH,
    data: mintHash,
    isPending: isMintPending,
    error: mintError,
    reset: resetMint
  } = useWriteContract();

  const {
    isLoading: isMintConfirming,
    isSuccess: isMintSuccess,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: mintHash
  });

  // Función para mintear 1 ETH
  const requestETH = useCallback(async () => {
    if (!isConnected || !address) {
      setState(prev => ({ ...prev, error: 'Please connect your wallet first' }));
      return;
    }

    if (!isReady || !addresses?.mockETH) {
      setState(prev => ({ ...prev, error: 'Contract addresses are still loading. Please wait a moment and try again.' }));
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null, 
        success: false,
        isConfirming: false
      }));

      console.log('🚀 Minting ETH using address:', addresses.mockETH);
      console.log('💰 Minting to user:', address);
      console.log('📄 Using ABI:', MockETHABI);

      await mintETH({
        address: addresses.mockETH,
        abi: MockETHABI,
        functionName: 'mint',
        args: [address, parseUnits('1', 18)] // Mintear exactamente 1 ETH
      });

      setState(prev => ({ ...prev, isConfirming: true }));

    } catch (error) {
      console.error('💥 Error requesting ETH:', error);
      console.error('💥 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        cause: error instanceof Error ? (error as any).cause : null,
        stack: error instanceof Error ? error.stack : null
      });
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isConfirming: false,
        error: error instanceof Error ? error.message : 'Failed to request ETH'
      }));
    }
  }, [isConnected, address, mintETH, addresses, isReady]);

  // Función para resetear el estado
  const resetFaucet = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
      txHash: null,
      isConfirming: false
    });
    resetMint();
  }, [resetMint]);

  // Actualizar estado basado en el resultado de la transacción
  useEffect(() => {
    if (isMintSuccess && mintHash) {
      console.log('✅ Mint transaction successful:', mintHash);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isConfirming: false,
        success: true,
        txHash: mintHash
      }));
      // Refetch balance después de mint exitoso
      setTimeout(() => refetchBalance(), 2000);
    }
  }, [isMintSuccess, mintHash, refetchBalance]);

  useEffect(() => {
    if (mintError || receiptError) {
      const error = mintError || receiptError;
      console.error('💥 Transaction error:', error);
      console.error('💥 Error type:', {
        isMintError: !!mintError,
        isReceiptError: !!receiptError,
        errorName: error?.name,
        errorMessage: error?.message,
        errorCause: (error as any)?.cause,
        errorDetails: error
      });

      let errorMessage = 'Failed to mint ETH';
      
      if (error?.message) {
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Contract execution failed - contract may have restrictions';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error - try again';
        } else {
          errorMessage = `Transaction failed: ${error.message}`;
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isConfirming: false,
        error: errorMessage
      }));
    }
  }, [mintError, receiptError]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading: isMintPending || isMintConfirming,
      isConfirming: isMintConfirming
    }));
  }, [isMintPending, isMintConfirming]);

  return {
    // Estado principal
    ...state,
    
    // Funciones
    requestETH,
    resetFaucet,
    
    // Info de wallet y balance
    isConnected,
    address,
    balance: ethBalance ? {
      value: ethBalance.value,
      formatted: parseFloat(ethBalance.formatted).toFixed(4),
      symbol: ethBalance.symbol
    } : null,
    
    // Status helpers
    canRequest: isConnected && !state.isLoading && isReady && !!addresses?.mockETH,
    hasError: !!state.error,
    hasSuccess: state.success,
    
    // Refetch functions
    refetchBalance
  };
} 