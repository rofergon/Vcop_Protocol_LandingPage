import { 
  Shield,
  Activity,
  Target,
  AlertTriangle,
  TrendingDown,
  Calculator
} from 'lucide-react';

export enum RiskLevel {
  ULTRA_SAFE = "ULTRA_SAFE",
  HEALTHY = "HEALTHY", 
  MODERATE = "MODERATE",
  AGGRESSIVE = "AGGRESSIVE",
  EXTREME = "EXTREME",
  DANGER_ZONE = "DANGER_ZONE"
}

export const calculateRiskLevel = (ltv: number): RiskLevel => {
  if (ltv <= 50) return RiskLevel.ULTRA_SAFE;
  if (ltv <= 65) return RiskLevel.HEALTHY;
  if (ltv <= 80) return RiskLevel.MODERATE;
  if (ltv <= 90) return RiskLevel.AGGRESSIVE;
  if (ltv <= 100) return RiskLevel.EXTREME;
  return RiskLevel.DANGER_ZONE;
};

export const getRiskIcon = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return Shield;
    case RiskLevel.HEALTHY: return Shield;
    case RiskLevel.MODERATE: return Activity;
    case RiskLevel.AGGRESSIVE: return Target;
    case RiskLevel.EXTREME: return AlertTriangle;
    case RiskLevel.DANGER_ZONE: return TrendingDown;
    default: return Calculator;
  }
};

export const getRiskLevelColor = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return "text-green-800";
    case RiskLevel.HEALTHY: return "text-emerald-800";
    case RiskLevel.MODERATE: return "text-blue-800";
    case RiskLevel.AGGRESSIVE: return "text-yellow-800";
    case RiskLevel.EXTREME: return "text-orange-800";
    case RiskLevel.DANGER_ZONE: return "text-red-800";
    default: return "text-gray-800";
  }
};

export const getRiskLevelBgColor = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case RiskLevel.ULTRA_SAFE: return "bg-green-100";
    case RiskLevel.HEALTHY: return "bg-emerald-100";
    case RiskLevel.MODERATE: return "bg-blue-100";
    case RiskLevel.AGGRESSIVE: return "bg-yellow-100";
    case RiskLevel.EXTREME: return "bg-orange-100";
    case RiskLevel.DANGER_ZONE: return "bg-red-100";
    default: return "bg-gray-100";
  }
};

export const formatHealthFactor = (ltv: number): string => {
  if (ltv <= 50) return "∞";
  if (ltv <= 65) return "5.2";
  if (ltv <= 80) return "2.1";
  if (ltv <= 90) return "1.3";
  if (ltv <= 100) return "1.0";
  return "0.8";
}; 