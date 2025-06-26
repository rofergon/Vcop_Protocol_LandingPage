import React from 'react';
import { useAccount } from 'wagmi';
import { useUserPositions, getAssetSymbol } from '../../hooks/useUserPositions';
import { formatUnits } from 'viem';

export const DebugPositions: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { 
    positions, 
    contractAddresses,
    isLoading, 
    error,
    repayFullPosition,
    repayPartialPosition,
    isApproving,
    isRepaying
  } = useUserPositions();

  console.log('🔧 Debug Positions Render:');
  console.log('- Is Connected:', isConnected);
  console.log('- Address:', address);
  console.log('- Contract Addresses:', contractAddresses);
  console.log('- Is Loading:', isLoading);
  console.log('- Error:', error);
  console.log('- Positions:', positions);

  if (isLoading) return <div>Loading positions...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!contractAddresses) return <div>Loading contract addresses...</div>;

  const handleRepayFull = async (positionId: bigint) => {
    if (!contractAddresses?.mockUSDC) return;
    
    console.log('🎯 Initiating full repayment for position:', positionId.toString());
    const result = await repayFullPosition(positionId, contractAddresses.mockUSDC);
    console.log('🎯 Repayment result:', result);
  };

  const handleRepayPartial = async (positionId: bigint, amount: string) => {
    if (!contractAddresses?.mockUSDC) return;
    
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1000000)); // Convert to 6 decimals
    console.log('🎯 Initiating partial repayment for position:', positionId.toString(), 'amount:', amount, 'USDC');
    const result = await repayPartialPosition(positionId, contractAddresses.mockUSDC, amountBigInt);
    console.log('🎯 Partial repayment result:', result);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">🔍 Debug: User Positions</h2>
      
      {/* Contract Addresses */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">📋 Contract Addresses:</h3>
        <div className="text-sm space-y-1">
          <div><strong>FlexibleLoanManager:</strong> {contractAddresses.flexibleLoanManager}</div>
          <div><strong>MockUSDC:</strong> {contractAddresses.mockUSDC}</div>
          <div><strong>MockETH:</strong> {contractAddresses.mockETH}</div>
        </div>
      </div>

      {/* Transaction Status */}
      {(isApproving || isRepaying) && (
        <div className="mb-6 p-4 bg-blue-100 rounded">
          <h3 className="font-semibold mb-2">⏳ Transaction Status:</h3>
          {isApproving && <div className="text-blue-600">🔄 Approving tokens...</div>}
          {isRepaying && <div className="text-blue-600">🚀 Executing repayment...</div>}
        </div>
      )}

      {/* Positions */}
      <div className="space-y-4">
        {positions.length === 0 ? (
          <div className="text-gray-500">No positions found</div>
        ) : (
          positions.map((position) => {
            // Calculate repayment details for debugging
            const totalDebt = position.totalDebt;
            const accruedInterest = position.accruedInterest;
            const protocolFee = 5000n; // 0.5%
            const interestFee = (accruedInterest * protocolFee) / 1000000n;
            const actualTransferAmount = totalDebt + interestFee;
            const approvalAmount = actualTransferAmount + (actualTransferAmount * 10n) / 100n;

            return (
              <div key={position.positionId.toString()} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Position #{position.positionId.toString()}</h3>
                    <div className="text-sm text-gray-600">
                      Health Factor: {position.healthFactor}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm ${
                    position.isAtRisk ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {position.isAtRisk ? '⚠️ At Risk' : '✅ Safe'}
                  </div>
                </div>

                {/* Position Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div><strong>Collateral:</strong> {position.collateralValueFormatted} ETH</div>
                    <div><strong>Debt:</strong> {position.debtValueFormatted} USDC</div>
                  </div>
                  <div>
                    <div><strong>Principal:</strong> {formatUnits(position.position.loanAmount, 6)} USDC</div>
                    <div><strong>Interest:</strong> {formatUnits(accruedInterest, 6)} USDC</div>
                  </div>
                </div>

                {/* Repayment Calculation Debug */}
                <div className="bg-yellow-50 p-3 rounded mb-4">
                  <h4 className="font-semibold text-sm mb-2">🧮 Repayment Calculation:</h4>
                  <div className="text-xs space-y-1">
                    <div><strong>Total Debt:</strong> {formatUnits(totalDebt, 6)} USDC</div>
                    <div><strong>Interest Fee (0.5%):</strong> {formatUnits(interestFee, 6)} USDC</div>
                    <div><strong>Actual Transfer:</strong> {formatUnits(actualTransferAmount, 6)} USDC</div>
                    <div><strong>Approval Amount (+10%):</strong> {formatUnits(approvalAmount, 6)} USDC</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRepayFull(position.positionId)}
                    disabled={isApproving || isRepaying}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-sm"
                  >
                    💰 Repay Full
                  </button>
                  
                  <button
                    onClick={() => handleRepayPartial(position.positionId, "500")}
                    disabled={isApproving || isRepaying}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 text-sm"
                  >
                    🔄 Repay 500 USDC
                  </button>
                  
                  <button
                    onClick={() => handleRepayPartial(position.positionId, "1000")}
                    disabled={isApproving || isRepaying}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 text-sm"
                  >
                    🔄 Repay 1000 USDC
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Debug Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">🔧 Debug Info:</h3>
        <div className="text-xs space-y-1">
          <div><strong>Positions loaded:</strong> {positions.length}</div>
          <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
          <div><strong>Error:</strong> {error || 'None'}</div>
          <div><strong>Approving:</strong> {isApproving ? 'Yes' : 'No'}</div>
          <div><strong>Repaying:</strong> {isRepaying ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
};

export default DebugPositions; 