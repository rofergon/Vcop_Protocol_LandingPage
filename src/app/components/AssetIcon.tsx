import React from 'react';
import { DollarSign } from 'lucide-react';

interface AssetIconProps {
  asset: string;
  className?: string;
}

export const AssetIcon: React.FC<AssetIconProps> = ({ asset, className = "w-5 h-5" }) => {
  const normalizedAsset = asset.toUpperCase();
  
  switch (normalizedAsset) {
    case 'ETH':
      return (
        <img 
          src="/ethereum-eth-logo.svg" 
          alt="ETH" 
          className={`${className} inline-block align-middle`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    case 'WBTC':
    case 'BTC':
      return (
        <img 
          src="/bitcoin-btc-logo.svg" 
          alt="BTC" 
          className={`${className} inline-block align-middle`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    case 'VCOP':
      return (
        <div className={`${className} inline-block align-middle bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full p-0.5 flex items-center justify-center`}>
          <img 
            src="/logovcop.png" 
            alt="VCOP" 
            className="w-full h-full object-contain rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    case 'USDC':
      return (
        <img 
          src="/usd-coin-usdc-logo.svg" 
          alt="USDC" 
          className={`${className} inline-block align-middle`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    case 'WGOLD':
      return (
        <img 
          src="/a6704b41-49c8-4224-8257-01388c290d3sinfondof.png" 
          alt="WGOLD" 
          className={`${className} inline-block align-middle rounded-full`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    default:
      return (
        <div className={`${className} inline-block align-middle bg-gray-100 rounded-full flex items-center justify-center`}>
          <DollarSign className={`${className.includes('w-') ? 'w-3 h-3' : 'w-4 h-4'} text-gray-500`} />
        </div>
      );
  }
};

export default AssetIcon; 