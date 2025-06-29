import React, { useState, useEffect } from 'react';
import { ChevronDown, DollarSign } from 'lucide-react';

interface AssetOption {
  value: string;
  label: string;
  decimals?: number;
}

interface AssetDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: AssetOption[];
  className?: string;
  borderColor?: string;
  label?: string;
}

// Asset icon component
const AssetIcon: React.FC<{ asset: string; className?: string }> = ({ asset, className = "w-5 h-5" }) => {
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

export const AssetDropdown: React.FC<AssetDropdownProps> = ({ 
  value, 
  onChange, 
  options, 
  className = "", 
  borderColor = "border-gray-300",
  label 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
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
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative asset-dropdown">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-3 text-sm border ${borderColor} rounded-lg bg-white text-left flex items-center justify-between hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200`}
        >
          <span className="flex items-center gap-2">
            <AssetIcon asset={value} className="w-5 h-5" />
            <span className="font-medium">{selectedOption?.label || value}</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg transition-colors duration-150 ${
                  option.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <AssetIcon asset={option.value} className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  {option.decimals && (
                    <div className="text-xs text-gray-500">{option.decimals} decimals</div>
                  )}
                </div>
                {option.value === value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 