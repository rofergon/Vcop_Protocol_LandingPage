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
import LoanApp from './app/index';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);
  const [animatedValue, setAnimatedValue] = useState(2600);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showApp, setShowApp] = useState(false);
  const [wasConnected, setWasConnected] = useState(false);
  
  // AppKit hooks
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  // Function to launch the VCOP app
  const handleLaunchApp = () => {
    setShowApp(true);
  };

  // Function to return to landing page
  const handleBackToLanding = () => {
    setShowApp(false);
  };

  const stats = [
    { value: "2,600", label: "COP per USD (2014)", color: "text-green-400" },
    { value: "4,200+", label: "COP per USD (2024)", color: "text-red-400" },
    { value: "62%", label: "Purchasing Power Lost", color: "text-yellow-400" }
  ];

  const liveMetrics: Array<{ label: string; value: string; change: string; trend: "up" | "down" | "stable" }> = [
    { label: "Current COP/USD", value: "4,100", change: "+0.5%", trend: "up" },
    { label: "BTC/USD", value: "$104,000", change: "+2.1%", trend: "up" },
    { label: "ETH/USD", value: "$2,600", change: "+1.8%", trend: "up" },
    { label: "VCOP Stability", value: "99.98%", change: "±0.02%", trend: "stable" }
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

  // Auto-launch app when user connects wallet
  useEffect(() => {
    // Si el usuario se conecta por primera vez (no estaba conectado antes)
    if (isConnected && !wasConnected) {
      setShowApp(true);
    }
    setWasConnected(isConnected);
  }, [isConnected, wasConnected]);

  // Animated counter for peso devaluation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue(prev => {
        const baseTarget = currentStat === 0 ? 2600 : currentStat === 1 ? 4150 : 62;
        // Add small random variation for the 4100-4200 range
        const randomVariation = currentStat === 1 ? (Math.random() - 0.5) * 100 : 0;
        const target = baseTarget + randomVariation;
        const diff = target - prev;
        return prev + (diff * 0.02); // Much slower animation (was 0.1, now 0.02)
      });
    }, 200); // Much slower interval (was 50ms, now 200ms)
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
      question: "How does VCOP maintain 1:1 parity with the Colombian peso?",
      answer: "VCOP uses a triple system: multiple oracles for real-time pricing, a Parity Stability Module (PSM) for instant VCOP↔USDC swaps, and a Uniswap v4 hook that automatically rebalances liquidity when it detects deviations greater than 1%."
    },
    {
      question: "How safe is borrowing up to 99.9% LTV?",
      answer: "The FlexibleLoanManager system allows extreme ratios but with real-time monitoring. Our Risk Calculator tracks 15+ metrics every block and provides early warnings. Advanced users can take more risk, while conservative users can limit themselves to safer ratios."
    },
    {
      question: "How do I earn yield with VCOP?",
      answer: "Multiple opportunities: 1) Provide liquidity in USDC, ETH, WBTC vaults (5-20% APY), 2) Participate in liquidations (5% bonus), 3) Liquidity farming in VCOP/USDC pools, 4) Arbitrage between PSM and external markets."
    },
    {
      question: "What happens if the peso price changes drastically?",
      answer: "VCOP adjusts automatically. If the peso devalues, VCOP maintains 1:1 parity, protecting your purchasing power. The PSM system and Uniswap v4 hooks handle extreme volatility while maintaining protocol stability."
    },
    {
      question: "When will it be available on mainnet?",
      answer: "We currently operate on Avalanche Fuji with full functionality. The mainnet launch is scheduled for Q1 2025, after completing the Halborn audit and reaching our fundraising goal of $700,000."
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

  // If showing the app, render the LoanApp component
  if (showApp) {
    return <LoanApp />;
  }

  return (
    <div className="min-h-screen bg-white" style={{ zoom: '0.9' }}>
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/logovcop.png" 
                alt="VCOP Protocol" 
                className="w-10 h-10 hover:animate-spin transition-all duration-300"
              />
              <span className="text-white font-bold text-xl">VCOP Protocol</span>
            </div>
            
            {/* Live Status Badge */}
            <div className="hidden lg:block">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Globe className="w-3 h-3 mr-1.5" />
                Live on Avalanche Fuji • Mainnet Q1 2025
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-white/80 hover:text-white transition-colors">Protocol</a>
              <a 
                href="https://saritus-organization.gitbook.io/docs-vcop-protocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
              >
                Documentation
              </a>
              <a href="#" className="text-white/80 hover:text-white transition-colors">FAQ</a>
              {!isConnected ? (
                <button 
                  onClick={() => open()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              ) : (
                <button 
                  onClick={handleLaunchApp}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Launch App
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Enhanced Background Pattern - Responsive */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 md:top-20 left-4 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-20 md:top-40 right-4 md:right-20 w-32 h-32 md:w-80 md:h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute -bottom-4 md:-bottom-8 left-20 md:left-40 w-40 h-40 md:w-72 md:h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
          <div className="absolute top-1/2 right-1/4 md:right-1/3 w-32 h-32 md:w-64 md:h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-3000"></div>
        </div>

        {/* Main Content Container - Responsive Layout */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="w-full max-w-7xl mx-auto text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              
              {/* Logo prominente */}
              <div className="mb-6 md:mb-8">
                <img 
                  src="/logovcop.png" 
                  alt="VCOP Protocol" 
                  className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-4 animate-pulse hover:animate-spin transition-all duration-700"
                />
              </div>
              
              {/* Main Title - Mobile First Responsive */}
              <h1 className="font-bold text-white mb-4 md:mb-6 leading-tight
                text-3xl 
                xs:text-4xl 
                sm:text-5xl 
                md:text-6xl 
                lg:text-7xl 
                xl:text-8xl
                2xl:text-9xl">
                Keep Your <span className="text-emerald-400 relative inline-block">
                  Crypto
                  <div className="absolute -inset-1 bg-emerald-400/20 blur-lg rounded-lg"></div>
                </span>
                <br />
                Spend in <span className="text-yellow-400 relative inline-block">
                  Pesos
                  <div className="absolute -inset-1 bg-yellow-400/20 blur-lg rounded-lg"></div>
                </span>
              </h1>
              
              {/* Subtitle - Responsive Typography */}
              <p className="text-emerald-100 mb-6 md:mb-8 mx-auto leading-relaxed max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl
                text-sm 
                sm:text-base 
                md:text-lg 
                lg:text-xl 
                xl:text-2xl">
                The first DeFi protocol designed for Latin America. Hedge against devaluation without selling your crypto.
              </p>
              
              {/* Enhanced Animated Stats - Responsive Container */}
              <div className="mb-6 md:mb-8">
                <div className="bg-black/30 backdrop-blur-lg rounded-xl md:rounded-2xl border border-emerald-500/30 relative overflow-hidden mx-auto
                  p-4 max-w-xs
                  sm:p-5 sm:max-w-sm
                  md:p-6 md:max-w-md
                  lg:p-8 lg:max-w-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-yellow-500/10"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2 md:mb-4">
                      <div className="text-xs md:text-sm text-emerald-300">Live Data</div>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="text-emerald-300 hover:text-white transition-colors"
                      >
                        {isPlaying ? <Pause className="w-3 h-3 md:w-4 md:h-4" /> : <Play className="w-2 h-3 md:w-4 md:h-4" />}
                      </button>
                    </div>
                    <div className={`font-bold mb-2 transition-colors duration-500 ${stats[currentStat].color}
                      text-2xl
                      sm:text-3xl
                      md:text-4xl
                      lg:text-5xl`}>
                      {currentStat === 2 ? `${Math.round(animatedValue)}%` : Math.round(animatedValue).toLocaleString()}
                    </div>
                    <div className="text-emerald-300 mb-3 md:mb-4
                      text-sm
                      md:text-base
                      lg:text-lg">
                      {stats[currentStat].label}
                    </div>
                    <div className="flex justify-center space-x-2">
                      {stats.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStat(index)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentStat ? 'bg-emerald-400 w-6' : 'bg-emerald-400/30 w-2'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Metrics Bar - Progressive Responsive Grid */}
              <div className="mb-6 md:mb-8 mx-auto
                grid gap-2 max-w-xs grid-cols-1
                xs:gap-3 xs:max-w-sm xs:grid-cols-2
                sm:max-w-2xl
                md:gap-4 md:max-w-3xl md:grid-cols-4
                lg:max-w-4xl">
                {liveMetrics.map((metric, index) => (
                  <div key={index} className="bg-black/20 backdrop-blur-sm rounded-lg border border-white/10
                    p-2.5
                    sm:p-3
                    lg:p-4">
                    <div className="text-xs text-emerald-300 mb-1 truncate">{metric.label}</div>
                    <div className="font-bold text-white
                      text-sm
                      sm:text-base
                      lg:text-lg">{metric.value}</div>
                    <div className={`text-xs flex items-center ${
                      metric.trend === 'up' ? 'text-green-400' : 
                      metric.trend === 'down' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {metric.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />}
                      {metric.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1 flex-shrink-0" />}
                      {metric.trend === 'stable' && <Activity className="w-3 h-3 mr-1 flex-shrink-0" />}
                      <span className="truncate">{metric.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons - Stack on Mobile, Inline on Desktop */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center max-w-lg mx-auto">
                {!isConnected ? (
                  <button 
                    onClick={() => open()}
                    className="group bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl flex items-center gap-2 relative overflow-hidden w-full sm:w-auto justify-center
                      py-3 px-6 text-base
                      md:py-4 md:px-8 md:text-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-2">
                      <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                      Connect Wallet
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={handleLaunchApp}
                    className="group bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl flex items-center gap-2 relative overflow-hidden w-full sm:w-auto justify-center
                      py-3 px-6 text-base
                      md:py-4 md:px-8 md:text-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-2">
                      <Zap className="w-4 h-4 md:w-5 md:h-5" />
                      Launch App
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                )}
                <a 
                  href="https://saritus-organization.gitbook.io/docs-vcop-protocol" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="border-2 border-white text-white hover:bg-white hover:text-emerald-900 font-semibold rounded-full transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center
                    py-3 px-6 text-base
                    md:py-4 md:px-8 md:text-lg"
                >
                  <Eye className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">View Documentation</span>
                  <span className="sm:hidden">Documentation</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator - Responsive & Accessible */}
        <div className="relative z-10 flex-shrink-0 pb-4 md:pb-6 lg:pb-8">
          <div className="flex flex-col items-center text-white animate-bounce">
            <div className="text-xs md:text-sm text-emerald-300 mb-1 md:mb-2">Scroll to explore</div>
            <ChevronDown className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
          </div>
        </div>
      </section>

      {/* Combined Interactive Demo Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-red-50 opacity-60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-emerald-100 to-red-100 text-gray-800 border border-gray-200 mb-6">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              Experience the Solution
              <AlertTriangle className="w-4 h-4 ml-2 text-red-600" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Try VCOP's <span className="text-emerald-600 relative">
                Ultra-Flexible Engine
                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600/30"></div>
              </span>
              {' & '}
              Calculate Your <span className="text-red-600 relative">
                Real Losses
                <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600/30"></div>
              </span>
            </h2>
            
            <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
              Experience our revolutionary lending system AND see exactly how peso devaluation has affected your purchasing power.
            </p>
          </div>

          {/* Horizontal Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="w-full">
              <InteractiveLoanDemo className="w-full h-auto" />
            </div>
            <div className="w-full">
              <DevaluationCalculator className="w-full h-auto" />
            </div>
          </div>
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
                className="grid grid-cols-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
{!isConnected ? (
              <button 
                onClick={() => open()}
                className="group bg-white hover:bg-gray-100 text-blue-600 font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ) : (
              <button 
                onClick={handleLaunchApp}
                className="group bg-white hover:bg-gray-100 text-emerald-600 font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Try VCOP App
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}
            <a 
              href="https://saritus-organization.gitbook.io/docs-vcop-protocol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Read Documentation
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-emerald-100">
            <div className="flex items-center justify-center">
              <Globe className="w-5 h-5 mr-2" />
              <span className="text-sm">Live on Avalanche Fuji</span>
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
                <img 
                  src="/logovcop.png" 
                  alt="VCOP Protocol Logo" 
                  className="w-8 h-8 mr-3"
                />
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
                <li><a href="https://saritus-organization.gitbook.io/docs-vcop-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center"><ArrowUpRight className="w-4 h-4 mr-2" />Documentation</a></li>
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