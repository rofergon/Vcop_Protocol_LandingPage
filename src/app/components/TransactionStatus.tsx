import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  Copy,
  CheckCheck
} from 'lucide-react';

interface TransactionStatusProps {
  isLoading: boolean;
  txHash: string | null;
  error: string | null;
  isSuccess: boolean;
  className?: string;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  isLoading,
  txHash,
  error,
  isSuccess,
  className = ""
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const getEtherscanUrl = (hash: string) => {
    // This would be dynamic based on the network
    return `https://etherscan.io/tx/${hash}`;
  };

  if (!isLoading && !txHash && !error && !isSuccess) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Transaction Status
        </h3>
        <p className="text-blue-100 text-sm">Monitor your position creation</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900">Creating Position...</div>
              <div className="text-sm text-blue-700">
                Please confirm the transaction in your wallet
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess && txHash && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-green-900">Position Created Successfully!</div>
                <div className="text-sm text-green-700">
                  Your loan position has been created and is now active
                </div>
              </div>
            </div>

            {/* Transaction Hash */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Transaction Hash:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                  {formatTxHash(txHash)}
                </code>
                <button
                  onClick={() => copyToClipboard(txHash)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy transaction hash"
                >
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={getEtherscanUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
              <div className="font-semibold text-emerald-900 mb-2">What's Next?</div>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Monitor your position health regularly</li>
                <li>• You can add more collateral or repay anytime</li>
                <li>• Check the dashboard for position management</li>
              </ul>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-shrink-0 mt-0.5">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-red-900 mb-1">Transaction Failed</div>
                <div className="text-sm text-red-700 mb-2">
                  {error}
                </div>
              </div>
            </div>

            {/* Common Error Solutions */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="font-semibold text-yellow-900">Common Solutions:</div>
              </div>
              <ul className="text-sm text-yellow-800 space-y-1 ml-6">
                <li>• Check that you have enough balance for collateral</li>
                <li>• Ensure you have sufficient ETH for gas fees</li>
                <li>• Try increasing the gas limit in your wallet</li>
                <li>• Verify your wallet is connected to the correct network</li>
              </ul>
            </div>
          </div>
        )}

        {/* Transaction Hash (if available but failed) */}
        {txHash && error && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Failed Transaction Hash:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                {formatTxHash(txHash)}
              </code>
              <button
                onClick={() => copyToClipboard(txHash)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy transaction hash"
              >
                {copied ? (
                  <CheckCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={getEtherscanUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="View on Etherscan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Progress Steps (when loading) */}
        {isLoading && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-3">Transaction Progress:</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Wallet connection verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Waiting for user confirmation...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-400">Broadcasting transaction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-400">Confirming on blockchain</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 