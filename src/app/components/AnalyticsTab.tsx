import React from 'react';
import { 
  DollarSign,
  Shield,
  Activity,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Protocol Stats */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-emerald-800">Total Borrowed</h3>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900">$0.00</div>
          <div className="text-xs text-emerald-700">No active positions</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-800">Collateral Value</h3>
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">$0.00</div>
          <div className="text-xs text-blue-700">No collateral deposited</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-800">Health Factor</h3>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">∞</div>
          <div className="text-xs text-purple-700">No risk exposure</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-yellow-800">Avg LTV</h3>
            <TrendingUp className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-900">0%</div>
          <div className="text-xs text-yellow-700">No active loans</div>
        </div>
      </div>
      
      <div className="text-center py-8">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Portfolio Analytics</h3>
        <p className="text-gray-600 mb-6">Detailed analytics will appear once you create your first position.</p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-purple-800 text-sm">
            📈 Coming soon:
          </p>
          <ul className="text-purple-700 text-sm mt-2 text-left space-y-1">
            <li>• Historical performance charts</li>
            <li>• Risk timeline analysis</li>
            <li>• Yield tracking</li>
            <li>• Liquidation risk alerts</li>
            <li>• Portfolio diversification metrics</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab; 