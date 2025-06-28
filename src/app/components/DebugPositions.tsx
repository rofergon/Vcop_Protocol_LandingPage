import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserPositions, getAssetSymbol } from '../../hooks/useUserPositions';
import { useRepayPosition, type RepaymentResult } from '../../hooks/hook_repayposition';
import { formatUnits, parseUnits, type Address, hexToBigInt } from 'viem';

interface Position {
  positionId: bigint;
  totalDebt: `0x${string}` | bigint;
  collateralValueFormatted: string;
  debtValueFormatted: string;
  healthFactor: string;
  position: {
    collateralAsset: Address;
  };
}

export const DebugPositions: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { 
    positions, 
    contractAddresses,
    isLoading: isLoadingPositions, 
    error: positionsError,
    refreshPositions
  } = useUserPositions();

  const {
    repayPosition,
    loadVaultHandler,
    isLoading: isRepaying,
    error: repayError,
    isApproving,
    isConfirmingApprove,
    isConfirmingRepay,
    approveHash,
    repayHash
  } = useRepayPosition();

  const [selectedAmount, setSelectedAmount] = useState<string>('');

  // Cargar VaultHandler al inicio
  useEffect(() => {
    loadVaultHandler();
  }, [loadVaultHandler]);

  console.log('🔧 Debug Positions Render:');
  console.log('- Is Connected:', isConnected);
  console.log('- Address:', address);
  console.log('- Contract Addresses:', contractAddresses);
  console.log('- Is Loading:', isLoadingPositions);
  console.log('- Error:', positionsError || repayError);
  console.log('- Positions:', positions);

  if (isLoadingPositions) return <div>Loading positions...</div>;
  if (positionsError) return <div className="text-red-500">Error: {positionsError}</div>;
  if (!contractAddresses) return <div>Loading contract addresses...</div>;

  const handleRepayFull = async (position: Position) => {
    if (!contractAddresses?.mockUSDC) return;
    
    console.log('🎯 Initiating full repayment for position:', position.positionId.toString());
    
    // Convertir totalDebt a bigint si es necesario
    const totalDebtBigInt = typeof position.totalDebt === 'string' 
      ? hexToBigInt(position.totalDebt)
      : position.totalDebt;
    
    const result = await repayPosition(
      totalDebtBigInt,
      contractAddresses.mockUSDC as Address
    );
    
    if (result.success) {
      console.log('✅ Repayment successful! Hash:', result.txHash);
      refreshPositions();
    } else {
      console.error('❌ Repayment failed:', result.error);
    }
  };

  const handleRepayPartial = async (position: Position) => {
    if (!contractAddresses?.mockUSDC || !selectedAmount) return;
    
    try {
      const amountBigInt = parseUnits(selectedAmount, 6); // USDC has 6 decimals
      
      console.log('🎯 Initiating partial repayment:');
      console.log('- Position:', position.positionId.toString());
      console.log('- Amount:', selectedAmount, 'USDC');
      
      const result = await repayPosition(
        amountBigInt,
        contractAddresses.mockUSDC as Address
      );
      
      if (result.success) {
        console.log('✅ Partial repayment successful! Hash:', result.txHash);
        setSelectedAmount('');
        refreshPositions();
      } else {
        console.error('❌ Partial repayment failed:', result.error);
      }
    } catch (error) {
      console.error('Error parsing amount:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Debug Positions</h2>
      
      {repayError && (
        <div className="text-red-500 mb-4">
          Error: {repayError}
        </div>
      )}

      <div className="space-y-4">
        {positions.map((position: Position) => (
          <div key={position.positionId.toString()} 
               className="border p-4 rounded-lg">
            <h3 className="font-semibold">
              Position #{position.positionId.toString()}
            </h3>
            
            <div className="mt-2 space-y-1 text-sm">
              <p>Collateral: {position.collateralValueFormatted} {getAssetSymbol(position.position.collateralAsset)}</p>
              <p>Debt: {position.debtValueFormatted} USDC</p>
              <p>Health Factor: {position.healthFactor}</p>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => handleRepayFull(position)}
                disabled={isRepaying || isApproving}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isRepaying ? 'Repaying...' : 'Repay Full'}
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={selectedAmount}
                  onChange={(e) => setSelectedAmount(e.target.value)}
                  placeholder="Amount in USDC"
                  className="px-2 py-1 border rounded"
                />
                <button
                  onClick={() => handleRepayPartial(position)}
                  disabled={isRepaying || isApproving || !selectedAmount}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {isRepaying ? 'Repaying...' : 'Repay Partial'}
                </button>
              </div>
            </div>

            {(isApproving || isConfirmingApprove) && (
              <p className="mt-2 text-sm text-blue-500">
                {approveHash ? 'Confirming approval...' : 'Approving tokens...'}
              </p>
            )}
            
            {(isRepaying || isConfirmingRepay) && (
              <p className="mt-2 text-sm text-green-500">
                {repayHash ? 'Confirming repayment...' : 'Processing repayment...'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugPositions; 