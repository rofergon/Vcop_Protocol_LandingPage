import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  Shield, 
  Zap, 
  BarChart3, 
  ArrowRight, 
  ChevronDown,
  DollarSign,
  Target,
  Activity,
  Lock,
  Users,
  Globe,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Star,
  ArrowUpRight,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Calculator,
  PieChart,
  Wallet,
  CreditCard,
  Smartphone,
  Plus,
  Minus,
  ChevronRight,
  X
} from 'lucide-react';
import { InteractiveLoanDemo } from './components/InteractiveLoanDemo';
import { DevaluationCalculator } from './components/DevaluationCalculator';

function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);
  const [animatedValue, setAnimatedValue] = useState(2600);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredComparison, setHoveredComparison] = useState<number | null>(null);

  const stats = [
    { value: "2,600", label: "COP per USD (2014)", color: "text-green-400" },
    { value: "4,200+", label: "COP per USD (2024)", color: "text-red-400" },
    { value: "62%", label: "Purchasing Power Lost", color: "text-yellow-400" }
  ];

  const liveMetrics = [
    { label: "Current COP/USD", value: "4,247", change: "+0.8%", trend: "up" as const },
    { label: "VCOP Stability", value: "99.98%", change: "±0.02%", trend: "stable" as const },
    { label: "Protocol TVL", value: "$2.1M", change: "+12.3%", trend: "up" as const },
    { label: "Active Loans", value: "1,247", change: "+5.2%", trend: "up" as const }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentStat((prev) => (prev + 1) % stats.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Animated counter for peso devaluation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue(prev => {
        const target = currentStat === 0 ? 2600 : currentStat === 1 ? 4200 : 62;
        const diff = target - prev;
        return prev + (diff * 0.1);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentStat]);

  const features = [
    {
      icon: <Target className="w-8 h-8" />,
      title: "Flexible Risk Control",
      description: "Set your own risk level with our Flexible Loan Manager - borrow up to 99.9% LTV when you want maximum leverage.",
      details: "Advanced users can push leverage to extreme levels while our real-time monitoring keeps you informed of every risk metric.",
      benefits: ["Up to 99.9% LTV", "Custom risk profiles", "Real-time alerts", "Professional tools"]
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: "Real-Time Monitoring",
      description: "Live Risk Calculator tracks 15+ metrics including health factor, liquidation price, and countdown timers with early warnings.",
      details: "Our sophisticated risk engine processes market data every block to give you precise liquidation predictions and health scores.",
      benefits: ["15+ risk metrics", "Block-by-block updates", "Predictive analytics", "Early warning system"]
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Peso-Pegged Stability",
      description: "VCOP stays 1:1 with Colombian peso via multi-source oracles, PSM for instant swaps, and Uniswap v4 auto-rebalancing.",
      details: "Triple-redundant stability mechanism ensures VCOP maintains perfect parity with COP through any market condition.",
      benefits: ["1:1 COP parity", "Multi-oracle security", "Instant swaps", "Auto-rebalancing"]
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Yield Opportunities",
      description: "Earn 5-20% APY in USDC, ETH, and WBTC vaults while liquidators earn 5% bounty for maintaining system health.",
      details: "Multiple yield strategies from conservative stablecoin farming to high-yield crypto vaults, plus liquidation rewards.",
      benefits: ["5-20% APY", "Multiple assets", "Liquidation bonuses", "Compound rewards"]
    }
  ];

  const testimonials = [
    {
      name: "Carlos Mendoza",
      role: "Crypto Trader, Bogotá",
      avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150",
      quote: "VCOP saved my portfolio during the last peso crash. I kept my ETH exposure while spending in pesos.",
      rating: 5
    },
    {
      name: "María González",
      role: "DeFi Investor, Medellín",
      avatar: "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=150",
      quote: "Finally, a protocol that understands Latin American financial reality. The flexibility is unmatched.",
      rating: 5
    },
    {
      name: "Diego Ramírez",
      role: "Financial Advisor, Cali",
      avatar: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150",
      quote: "I recommend VCOP to all my clients. It's the smartest hedge against peso devaluation.",
      rating: 5
    }
  ];

  const competitors = [
    {
      name: "Traditional Banks",
      vcop: "5-20% APY",
      competitor: "2-4% APY",
      vcopWins: true,
      feature: "Yield"
    },
    {
      name: "Aave/Compound",
      vcop: "Up to 99.9% LTV",
      competitor: "Max 80% LTV",
      vcopWins: true,
      feature: "Flexibility"
    },
    {
      name: "Dollar Stablecoins",
      vcop: "COP-pegged",
      competitor: "USD-pegged",
      vcopWins: true,
      feature: "Local Currency"
    },
    {
      name: "Selling Crypto",
      vcop: "Keep upside",
      competitor: "Lose upside",
      vcopWins: true,
      feature: "Crypto Exposure"
    }
  ];

  const faqs = [
    {
      question: "¿Cómo mantiene VCOP la paridad 1:1 con el peso colombiano?",
      answer: "VCOP utiliza un sistema triple: oráculos múltiples para precios en tiempo real, un Módulo de Estabilidad de Paridad (PSM) para intercambios instantáneos VCOP↔USDC, y un hook de Uniswap v4 que rebalancea automáticamente la liquidez cuando detecta desviaciones mayores al 1%."
    },
    {
      question: "¿Qué tan seguro es prestar hasta 99.9% LTV?",
      answer: "El sistema FlexibleLoanManager permite ratios extremos pero con monitoreo en tiempo real. Nuestro Calculador de Riesgo rastrea 15+ métricas cada bloque y proporciona alertas tempranas. Los usuarios avanzados pueden asumir más riesgo, mientras que los conservadores pueden limitarse a ratios más seguros."
    },
    {
      question: "¿Cómo gano rendimiento con VCOP?",
      answer: "Múltiples oportunidades: 1) Proporciona liquidez en vaults de USDC, ETH, WBTC (5-20% APY), 2) Participa en liquidaciones (5% de bonificación), 3) Farming de liquidez en pools VCOP/USDC, 4) Arbitraje entre PSM y mercados externos."
    },
    {
      question: "¿Qué pasa si el precio del peso cambia drásticamente?",
      answer: "VCOP se ajusta automáticamente. Si el peso se devalúa, VCOP mantiene la paridad 1:1, protegiendo tu poder adquisitivo. El sistema PSM y los hooks de Uniswap v4 manejan volatilidad extrema manteniendo la estabilidad del protocolo."
    },
    {
      question: "¿Cuándo estará disponible en mainnet?",
      answer: "Actualmente operamos en Base Sepolia con todas las funcionalidades. El lanzamiento en mainnet está programado para Q1 2025, después de completar la auditoría de Halborn y alcanzar nuestro objetivo de recaudación de $700,000."
    }
  ];

  const useCases = [
    {
      title: "Hedge Against Devaluation",
      description: "Keep crypto, spend pesos",
      icon: <Shield className="w-6 h-6" />,
      example: "Deposit 1 ETH → Borrow 8M VCOP → Spend in Colombia"
    },
    {
      title: "Leverage Trading",
      description: "Amplify your positions",
      icon: <TrendingUp className="w-6 h-6" />,
      example: "90% LTV on ETH → More exposure without selling"
    },
    {
      title: "Yield Farming",
      description: "Earn on idle assets",
      icon: <PieChart className="w-6 h-6" />,
      example: "Deposit USDC → Earn 12% APY → Compound rewards"
    },
    {
      title: "Arbitrage Trading",
      description: "Profit from price differences",
      icon: <RefreshCw className="w-6 h-6" />,
      example: "PSM arbitrage → VCOP/USDC spreads → 0.1% fees"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-3000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Globe className="w-4 h-4 mr-2" />
                Live on Base Sepolia • Mainnet Q1 2025
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Keep Your <span className="text-emerald-400 relative">
                Crypto
                <div className="absolute -inset-1 bg-emerald-400/20 blur-lg rounded-lg"></div>
              </span>
              <br />
              Spend in <span className="text-yellow-400 relative">
                Pesos
                <div className="absolute -inset-1 bg-yellow-400/20 blur-lg rounded-lg"></div>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-4xl mx-auto leading-relaxed">
              The first DeFi protocol designed for Latin America. Hedge against devaluation without selling your crypto.
            </p>
            
            {/* Enhanced Animated Stats */}
            <div className="mb-12">
              <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-8 max-w-lg mx-auto border border-emerald-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-yellow-500/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-emerald-300">Live Data</div>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="text-emerald-300 hover:text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className={`text-4xl md:text-5xl font-bold mb-2 transition-colors duration-500 ${stats[currentStat].color}`}>
                    {currentStat === 2 ? `${Math.round(animatedValue)}%` : Math.round(animatedValue).toLocaleString()}
                  </div>
                  <div className="text-emerald-300 text-lg mb-4">
                    {stats[currentStat].label}
                  </div>
                  <div className="flex justify-center space-x-2">
                    {stats.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentStat(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentStat ? 'bg-emerald-400 w-6' : 'bg-emerald-400/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
              {liveMetrics.map((metric, index) => (
                <div key={index} className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="text-xs text-emerald-300 mb-1">{metric.label}</div>
                  <div className="text-lg font-bold text-white">{metric.value}</div>
                  <div className={`text-xs flex items-center ${
                    metric.trend === 'up' ? 'text-green-400' : 
                    metric.trend === 'down' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {metric.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                    {metric.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                    {metric.trend === 'stable' && <Activity className="w-3 h-3 mr-1" />}
                    {metric.change}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="group bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl flex items-center gap-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Launch App
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-emerald-900 font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                View Documentation
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
          <div className="flex flex-col items-center">
            <div className="text-sm text-emerald-300 mb-2">Scroll to explore</div>
            <ChevronDown className="w-8 h-8" />
          </div>
        </div>
      </section>

      {/* Interactive Devaluation Calculator Section */}
      <section className="py-20 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 mb-6">
              <AlertTriangle className="w-4 h-4 mr-2" />
              The Crisis Deepens
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Calculate Your <span className="text-red-600 relative">
                Real Losses
                <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600/30"></div>
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
              See exactly how much purchasing power you've lost to peso devaluation and how VCOP could have protected you.
            </p>
          </div>

          <DevaluationCalculator />
        </div>
      </section>

      {/* Interactive Loan Demo Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 mb-6">
              <CheckCircle className="w-4 h-4 mr-2" />
              Experience the Solution
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Try VCOP's <span className="text-emerald-600 relative">
                Risk Engine
                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600/30"></div>
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
              Experience our real-time risk calculator with live scenarios. See how different loan parameters affect your position safety.
            </p>
          </div>

          <InteractiveLoanDemo />
        </div>
      </section>

      {/* Enhanced Solution Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 mb-6">
              <CheckCircle className="w-4 h-4 mr-2" />
              The Smart Solution
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              VCOP Delivers the <span className="text-emerald-600 relative">
                Smarter Way
                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600/30"></div>
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Help Latin American savers and traders hedge against devaluation—without selling their crypto. 
              Keep your crypto, spend in pesos, sleep at night.
            </p>
          </div>

          {/* Interactive Feature Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFeature(index)}
                    className={`w-full text-left p-6 rounded-2xl mb-4 transition-all duration-300 ${
                      selectedFeature === index 
                        ? 'bg-emerald-500 text-white shadow-xl transform scale-105' 
                        : 'bg-white border border-gray-200 hover:shadow-lg hover:border-emerald-200'
                    }`}
                  >
                    <div className={`mb-4 ${selectedFeature === index ? 'text-white' : 'text-emerald-600'}`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {feature.title}
                    </h3>
                    <p className={`text-sm ${selectedFeature === index ? 'text-emerald-100' : 'text-gray-600'}`}>
                      {feature.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="text-emerald-600 mr-4">
                    {features[selectedFeature].icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {features[selectedFeature].title}
                  </h3>
                </div>
                
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                  {features[selectedFeature].details}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {features[selectedFeature].benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center p-3 bg-emerald-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-emerald-800 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <div 
                key={index}
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200"
              >
                <div className="text-emerald-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {useCase.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {useCase.description}
                </p>
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                  {useCase.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Three Key Components
            </h2>
            <p className="text-xl text-gray-600">
              No jargon, just results
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border-t-4 border-emerald-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="text-emerald-600 mb-4">
                  <Target className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  You Set the Risk
                </h3>
                <p className="text-gray-600 mb-6">
                  Our Flexible Loan Manager lets you borrow up to 99.9% LTV—you decide the risk level that works for your strategy.
                </p>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-emerald-800 mb-2">Risk Control</div>
                  <div className="text-emerald-600">Conservative to Ultra-Aggressive</div>
                  <div className="mt-3 flex items-center text-xs text-emerald-700">
                    <Calculator className="w-4 h-4 mr-1" />
                    Real-time risk calculator
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-t-4 border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="text-blue-600 mb-4">
                  <Activity className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  We Guard You Every Block
                </h3>
                <p className="text-gray-600 mb-6">
                  Live Risk Calculator tracks 15+ metrics: health factor, liquidation price, countdown timers—with early warnings.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-blue-800 mb-2">Real-Time Monitoring</div>
                  <div className="text-blue-600">15+ Risk Metrics</div>
                  <div className="mt-3 flex items-center text-xs text-blue-700">
                    <Eye className="w-4 h-4 mr-1" />
                    Block-by-block updates
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-t-4 border-yellow-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="text-yellow-600 mb-4">
                  <DollarSign className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Spend in Your Currency
                </h3>
                <p className="text-gray-600 mb-6">
                  VCOP stays pegged 1:1 via multi-source oracles, instant USDC swaps, and Uniswap v4 auto-rebalancing.
                </p>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-yellow-800 mb-2">Peso-Pegged</div>
                  <div className="text-yellow-600">1:1 COP Stability</div>
                  <div className="mt-3 flex items-center text-xs text-yellow-700">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Auto-rebalancing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose <span className="text-emerald-600">VCOP</span>?
            </h2>
            <p className="text-xl text-gray-600">
              See how we stack up against the competition
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
              <div className="p-6 font-semibold text-gray-900">Feature</div>
              <div className="p-6 font-semibold text-emerald-600 bg-emerald-50">VCOP</div>
              <div className="p-6 font-semibold text-gray-600">Competitors</div>
              <div className="p-6 font-semibold text-gray-900">Winner</div>
            </div>
            
            {competitors.map((comp, index) => (
              <div 
                key={index}
                className={`grid grid-cols-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  hoveredComparison === index ? 'bg-emerald-50' : ''
                }`}
                onMouseEnter={() => setHoveredComparison(index)}
                onMouseLeave={() => setHoveredComparison(null)}
              >
                <div className="p-6 font-medium text-gray-900">{comp.feature}</div>
                <div className="p-6 text-emerald-600 font-semibold">{comp.vcop}</div>
                <div className="p-6 text-gray-600">{comp.competitor}</div>
                <div className="p-6">
                  {comp.vcopWins ? (
                    <div className="flex items-center text-emerald-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      VCOP
                    </div>
                  ) : (
                    <div className="text-gray-400">Tie</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Latin American <span className="text-emerald-600">Crypto Users</span>
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from real users protecting their wealth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
                
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Yield Section */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-teal-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Earn While You <span className="text-emerald-400">Protect</span>
              </h2>
              <div className="space-y-6 text-lg text-gray-300">
                <p>
                  Yield seekers can earn <strong className="text-emerald-400">5–20% APY</strong> in USDC, ETH, and WBTC vaults.
                </p>
                <p>
                  Liquidators earn a <strong className="text-yellow-400">5% bounty</strong> for maintaining system health.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-emerald-900/50 p-6 rounded-lg border border-emerald-500/30">
                    <div className="text-3xl font-bold text-emerald-400 mb-2">5-20%</div>
                    <div className="text-sm text-emerald-300">Vault APY</div>
                    <div className="text-xs text-emerald-400 mt-2">USDC • ETH • WBTC</div>
                  </div>
                  <div className="bg-yellow-900/50 p-6 rounded-lg border border-yellow-500/30">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">5%</div>
                    <div className="text-sm text-yellow-300">Liquidation Bonus</div>
                    <div className="text-xs text-yellow-400 mt-2">Per liquidation</div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Start Earning
                  </button>
                  <button className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Calculate Yields
                  </button>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?auto=compress&cs=tinysrgb&w=800" 
                alt="Cryptocurrency and financial growth"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -top-6 -left-6 bg-emerald-500 p-4 rounded-2xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-yellow-500 p-4 rounded-2xl shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about VCOP
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${
                    openFaq === index ? 'rotate-90' : ''
                  }`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-gray-700 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traction Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Built on <span className="text-blue-600">Base</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From the creator of Pixel Minter—bringing innovation to Latin American DeFi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Base Sepolia</h3>
              <p className="text-gray-600 mb-4">Core contracts deployed and tested</p>
              <div className="text-sm text-blue-600 font-medium">✓ Fully Operational</div>
            </div>
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Security Ready</h3>
              <p className="text-gray-600 mb-4">Full integration tests completed</p>
              <div className="text-sm text-emerald-600 font-medium">✓ Audit Scheduled</div>
            </div>
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">50K Users</h3>
              <p className="text-gray-600 mb-4">Target for first 12 months</p>
              <div className="text-sm text-yellow-600 font-medium">🎯 Growth Goal</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5"></div>
            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                The Vision
              </h3>
              <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
                VCOP turns dormant crypto into spendable Colombian pesos—without killing your upside. 
                We're raising <strong className="text-emerald-600">$700,000 pre-seed</strong> to fund a full Halborn audit, launch on mainnet, 
                and help Latin America keep more of what it earns.
              </p>
              <div className="mt-6 flex items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
                  Halborn Audit
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
                  Mainnet Launch
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
                  50K Users
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Protect Your Wealth?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
            Join the protocol that's designed for Latin America's financial reality
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button className="group bg-white hover:bg-gray-100 text-emerald-600 font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Try VCOP App
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              Read Documentation
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-emerald-100">
            <div className="flex items-center justify-center">
              <Globe className="w-5 h-5 mr-2" />
              <span className="text-sm">Live on Base Sepolia</span>
            </div>
            <div className="flex items-center justify-center">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm">Mainnet Q1 2025</span>
            </div>
            <div className="flex items-center justify-center">
              <Shield className="w-5 h-5 mr-2" />
              <span className="text-sm">Halborn Audited</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg mr-3 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                VCOP Protocol
              </h3>
              <p className="text-gray-400 max-w-md mb-6 leading-relaxed">
                The first DeFi lending protocol designed specifically for Latin American savers and traders. 
                Hedge against currency devaluation without selling your crypto.
              </p>
              <div className="flex space-x-4">
                <button className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors">
                  <Globe className="w-5 h-5" />
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors">
                  <Users className="w-5 h-5" />
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors">
                  <Activity className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-emerald-400">Protocol</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><ArrowUpRight className="w-4 h-4 mr-2" />Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><Shield className="w-4 h-4 mr-2" />Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><CheckCircle className="w-4 h-4 mr-2" />Audit Reports</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><Globe className="w-4 h-4 mr-2" />GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-emerald-400">Community</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><Users className="w-4 h-4 mr-2" />Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><Activity className="w-4 h-4 mr-2" />Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><Smartphone className="w-4 h-4 mr-2" />Telegram</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center"><Eye className="w-4 h-4 mr-2" />Blog</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 mb-4 md:mb-0">
                &copy; 2024 VCOP Protocol. Built for Latin America, powered by Base.
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Risk Disclosure</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;