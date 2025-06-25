// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "v4-core/lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {console2 as console} from "forge-std/console2.sol";
import {IGenericOracle} from "../interfaces/IGenericOracle.sol";

/**
 * @title MockVCOPOracle
 * @notice Mock oracle for testing that maintains all functions from VCOPOracle
 * @dev Allows free price manipulation for liquidation system testing
 * @dev Implements same interface as VCOPOracle but with manual price controls
 */
contract MockVCOPOracle is Ownable, IGenericOracle {
    
    // ========== STATE VARIABLES ==========
    
    // Token addresses (for reference)
    address public immutable vcopAddress;
    address public immutable usdcAddress;
    
    // Mock token addresses
    address public mockETH;
    address public mockWBTC;
    address public mockUSDC;
    
    // Exchange rates (with 6 decimals)
    uint256 private _usdToCopRate = 4200 * 1e6; // 4200 COP = 1 USD
    uint256 private _vcopToCopRate = 1e6; // 1 VCOP = 1 COP (1:1 parity)
    uint256 private _vcopToUsdRate = 1e6; // 1 VCOP = 1 USD initially
    
    // Manual price feeds (baseToken => quoteToken => price)
    mapping(address => mapping(address => uint256)) private manualPrices;
    mapping(address => mapping(address => uint256)) private priceTimestamps;
    mapping(address => mapping(address => bool)) private hasPriceFeedMapping;
    
    // Price feed configurations
    mapping(address => mapping(address => PriceFeedConfig)) private priceFeedConfigs;
    
    // ========== EVENTS ==========
    
    event UsdToCopRateUpdated(uint256 oldRate, uint256 newRate);
    event VcopToCopRateUpdated(uint256 oldRate, uint256 newRate);
    event VcopToUsdRateUpdated(uint256 oldRate, uint256 newRate);
    event PriceRequested(address requester, string rateType);
    event PriceProvided(address requester, string rateType, uint256 rate);
    event MockPriceSet(address indexed baseToken, address indexed quoteToken, uint256 price);
    
    // ========== CONSTRUCTOR ==========
    
    /**
     * @dev Constructor for MockVCOPOracle
     * @param _vcopAddress Address of the VCOP token
     * @param _usdcAddress Address of the USDC token
     */
    constructor(
        address _vcopAddress,
        address _usdcAddress
    ) Ownable(msg.sender) {
        vcopAddress = _vcopAddress;
        usdcAddress = _usdcAddress;
        
        console.log("MockVCOPOracle initialized");
        console.log("VCOP address:", _vcopAddress);
        console.log("USDC address:", _usdcAddress);
        console.log("Initial USD/COP rate:", _usdToCopRate);
        console.log("Initial VCOP/COP rate:", _vcopToCopRate);
    }
    
    // ========== MOCK TOKEN CONFIGURATION ==========
    
    /**
     * @dev Sets mock token addresses and realistic 2025 default prices
     */
    function setMockTokens(address _mockETH, address _mockWBTC, address _mockUSDC) public onlyOwner {
        mockETH = _mockETH;
        mockWBTC = _mockWBTC;
        mockUSDC = _mockUSDC;
        
        // Set realistic 2025 prices (all normalized to 6 decimals)
        _setManualPrice(mockETH, mockUSDC, 2500 * 1e6); // ETH = $2,500 (current 2025 price)
        _setManualPrice(mockWBTC, mockUSDC, 104000 * 1e6); // BTC = $104,000 (current 2025 price)
        _setManualPrice(mockUSDC, mockUSDC, 1 * 1e6); // USDC = $1
        _setManualPrice(vcopAddress, mockUSDC, _vcopToUsdRate); // VCOP to USD
        
        // Set reverse prices (calculate automatically based on 2025 prices)
        // 1 USDC = 1/2500 ETH = 0.0004 ETH (400 with 6 decimals for conversion)
        _setManualPrice(mockUSDC, mockETH, 400);
        // 1 USDC = 1/104000 BTC = 0.00000962 BTC (9 with 6 decimals for conversion)
        _setManualPrice(mockUSDC, mockWBTC, 9);
        // 1 ETH = 2500/104000 BTC = 0.024038 BTC (24038 with 6 decimals)
        _setManualPrice(mockETH, mockWBTC, 24038);
        // 1 BTC = 104000/2500 ETH = 41.6 ETH (41600000 with 6 decimals)
        _setManualPrice(mockWBTC, mockETH, 41600000);
        _setManualPrice(mockUSDC, vcopAddress, _vcopToUsdRate); // USD to VCOP
        
        console.log("Mock tokens configured with realistic 2025 prices");
        console.log("ETH: $2,500 | BTC: $104,000 | USDC: $1");
    }
    
    /**
     * @dev Internal function to set manual prices
     */
    function _setManualPrice(address baseToken, address quoteToken, uint256 price) internal {
        manualPrices[baseToken][quoteToken] = price;
        priceTimestamps[baseToken][quoteToken] = block.timestamp;
        hasPriceFeedMapping[baseToken][quoteToken] = true;
        
        // Configure as manual feed
        priceFeedConfigs[baseToken][quoteToken] = PriceFeedConfig({
            feedAddress: address(this),
            feedType: PriceFeedType.MANUAL,
            decimals: 6,
            heartbeat: 3600,
            isActive: true,
            isInverse: false
        });
        
        emit PriceUpdated(baseToken, quoteToken, price, PriceFeedType.MANUAL);
        emit MockPriceSet(baseToken, quoteToken, price);
    }
    
    // ========== PRICE MANIPULATION FUNCTIONS (FOR TESTING) ==========
    
    /**
     * @dev Sets a custom price for any token pair (testing function)
     * @param baseToken Base token address
     * @param quoteToken Quote token address  
     * @param price Price in 6 decimals
     */
    function setMockPrice(address baseToken, address quoteToken, uint256 price) external onlyOwner {
        _setManualPrice(baseToken, quoteToken, price);
        console.log("Mock price set:", price, "for pair");
    }
    
    /**
     * @dev Sets VCOP to USD rate for testing
     * @param newRate New VCOP/USD rate (6 decimals)
     */
    function setVcopToUsdRate(uint256 newRate) public onlyOwner {
        require(newRate > 0, "Rate must be greater than zero");
        
        uint256 oldRate = _vcopToUsdRate;
        _vcopToUsdRate = newRate;
        
        // Update manual price mapping
        _setManualPrice(vcopAddress, mockUSDC, newRate);
        
        console.log("VCOP/USD rate updated:", newRate);
        emit VcopToUsdRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Sets multiple prices at once for testing scenarios
     */
    function setBatchPrices(
        address[] calldata baseTokens,
        address[] calldata quoteTokens, 
        uint256[] calldata prices
    ) external onlyOwner {
        require(baseTokens.length == quoteTokens.length && baseTokens.length == prices.length, "Array length mismatch");
        
        for (uint256 i = 0; i < baseTokens.length; i++) {
            _setManualPrice(baseTokens[i], quoteTokens[i], prices[i]);
        }
        
        console.log("Batch prices set for", baseTokens.length, "pairs");
    }
    
    /**
     * @dev Simulates a market crash by reducing all asset prices
     * @param crashPercentage Percentage to reduce prices (e.g., 50 for 50% crash)
     */
    function simulateMarketCrash(uint256 crashPercentage) external onlyOwner {
        require(crashPercentage <= 90, "Max crash is 90%");
        
        uint256 multiplier = (100 - crashPercentage) * 1e6 / 100;
        
        // Crash ETH price
        if (mockETH != address(0) && mockUSDC != address(0)) {
            uint256 currentEthPrice = manualPrices[mockETH][mockUSDC];
            uint256 newEthPrice = (currentEthPrice * multiplier) / 1e6;
            _setManualPrice(mockETH, mockUSDC, newEthPrice);
        }
        
        // Crash BTC price
        if (mockWBTC != address(0) && mockUSDC != address(0)) {
            uint256 currentBtcPrice = manualPrices[mockWBTC][mockUSDC];
            uint256 newBtcPrice = (currentBtcPrice * multiplier) / 1e6;
            _setManualPrice(mockWBTC, mockUSDC, newBtcPrice);
        }
        
        // Crash VCOP price
        uint256 newVcopPrice = (_vcopToUsdRate * multiplier) / 1e6;
        setVcopToUsdRate(newVcopPrice);
        
        console.log("Market crash simulated:", crashPercentage, "% reduction");
    }
    
    // ========== INDIVIDUAL PRICE CONFIGURATION FUNCTIONS ==========
    
    /**
     * @dev Sets ETH price in USD (owner configurable)
     * @param newEthPrice New ETH price in USD (6 decimals)
     */
    function setEthPrice(uint256 newEthPrice) external onlyOwner {
        require(newEthPrice > 0, "Price must be greater than zero");
        if (mockETH != address(0) && mockUSDC != address(0)) {
            _setManualPrice(mockETH, mockUSDC, newEthPrice);
            // Update reverse price
            _setManualPrice(mockUSDC, mockETH, (1e12) / newEthPrice);
            console.log("ETH price updated to:", newEthPrice);
        }
    }
    
    /**
     * @dev Sets BTC price in USD (owner configurable)
     * @param newBtcPrice New BTC price in USD (6 decimals)
     */
    function setBtcPrice(uint256 newBtcPrice) external onlyOwner {
        require(newBtcPrice > 0, "Price must be greater than zero");
        if (mockWBTC != address(0) && mockUSDC != address(0)) {
            _setManualPrice(mockWBTC, mockUSDC, newBtcPrice);
            // Update reverse price
            _setManualPrice(mockUSDC, mockWBTC, (1e12) / newBtcPrice);
            console.log("BTC price updated to:", newBtcPrice);
        }
    }
    
    /**
     * @dev Sets USD to COP rate with realistic 2025 values (owner configurable)
     * @param newRate New USD/COP rate (6 decimals, e.g., 4200000000 for 4200 COP per USD)
     */
    function setUsdToCopRateRealistic(uint256 newRate) external onlyOwner {
        require(newRate > 3000 * 1e6 && newRate < 6000 * 1e6, "Rate should be between 3000-6000 COP per USD");
        
        uint256 oldRate = _usdToCopRate;
        _usdToCopRate = newRate;
        
        console.log("USD/COP rate updated to realistic value:", newRate);
        emit UsdToCopRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Sets all major crypto prices to realistic 2025 values (owner configurable)
     * @param ethPrice ETH price in USD (6 decimals)
     * @param btcPrice BTC price in USD (6 decimals)
     * @param vcopPrice VCOP price in USD (6 decimals)
     */
    function setRealistic2025Prices(
        uint256 ethPrice,
        uint256 btcPrice, 
        uint256 vcopPrice
    ) external onlyOwner {
        require(ethPrice >= 1000 * 1e6 && ethPrice <= 10000 * 1e6, "ETH price should be between $1,000-$10,000");
        require(btcPrice >= 30000 * 1e6 && btcPrice <= 200000 * 1e6, "BTC price should be between $30,000-$200,000");
        require(vcopPrice > 0, "VCOP price must be greater than zero");
        
        // Set main prices
        if (mockETH != address(0) && mockUSDC != address(0)) {
            _setManualPrice(mockETH, mockUSDC, ethPrice);
            _setManualPrice(mockUSDC, mockETH, (1e12) / ethPrice);
        }
        
        if (mockWBTC != address(0) && mockUSDC != address(0)) {
            _setManualPrice(mockWBTC, mockUSDC, btcPrice);
            _setManualPrice(mockUSDC, mockWBTC, (1e12) / btcPrice);
        }
        
        // Update VCOP price
        setVcopToUsdRate(vcopPrice);
        
        // Update cross-pairs
        if (mockETH != address(0) && mockWBTC != address(0)) {
            uint256 ethToBtc = (ethPrice * 1e6) / btcPrice;
            uint256 btcToEth = (btcPrice * 1e6) / ethPrice;
            _setManualPrice(mockETH, mockWBTC, ethToBtc);
            _setManualPrice(mockWBTC, mockETH, btcToEth);
        }
        
        console.log("Realistic 2025 prices set");
        console.log("ETH:", ethPrice);
        console.log("BTC:", btcPrice);
        console.log("VCOP:", vcopPrice);
    }
    
    /**
     * @dev Gets current market prices for verification
     */
    function getCurrentMarketPrices() external view returns (
        uint256 ethPrice,
        uint256 btcPrice,
        uint256 vcopPrice,
        uint256 usdCopRate
    ) {
        if (mockETH != address(0) && mockUSDC != address(0)) {
            ethPrice = manualPrices[mockETH][mockUSDC];
        }
        if (mockWBTC != address(0) && mockUSDC != address(0)) {
            btcPrice = manualPrices[mockWBTC][mockUSDC];
        }
        vcopPrice = _vcopToUsdRate;
        usdCopRate = _usdToCopRate;
    }
    
    // ========== IGenericOracle IMPLEMENTATION ==========
    
    /**
     * @dev Gets price for a token pair
     */
    function getPrice(address baseToken, address quoteToken) external view override returns (uint256 price) {
        // Handle address(0) as USD
        if (quoteToken == address(0)) {
            quoteToken = mockUSDC;
        }
        
        // Check manual prices first
        if (hasPriceFeedMapping[baseToken][quoteToken]) {
            price = manualPrices[baseToken][quoteToken];
            console.log("Mock Oracle: Returning price for pair:", price);
            return price;
        }
        
        // Handle VCOP prices
        if (baseToken == vcopAddress && quoteToken == mockUSDC) {
            return _vcopToUsdRate;
        }
        
        if (baseToken == mockUSDC && quoteToken == vcopAddress) {
            if (_vcopToUsdRate > 0) {
                return (1e12) / _vcopToUsdRate;
            }
        }
        
        console.log("Mock Oracle: No price found for pair");
        return 0;
    }
    
    /**
     * @dev Gets detailed price data
     */
    function getPriceData(address baseToken, address quoteToken) external view override returns (PriceData memory priceData) {
        uint256 price = this.getPrice(baseToken, quoteToken);
        uint256 timestamp = priceTimestamps[baseToken][quoteToken];
        
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }
        
        priceData = PriceData({
            price: price,
            timestamp: timestamp,
            isValid: price > 0
        });
    }
    
    /**
     * @dev Updates price for a token pair
     */
    function updatePrice(address baseToken, address quoteToken, uint256 price) external override onlyOwner {
        _setManualPrice(baseToken, quoteToken, price);
    }
    
    /**
     * @dev Configures a price feed
     */
    function configurePriceFeed(
        address baseToken,
        address quoteToken,
        PriceFeedConfig calldata config
    ) external override onlyOwner {
        priceFeedConfigs[baseToken][quoteToken] = config;
        hasPriceFeedMapping[baseToken][quoteToken] = true;
        
        emit PriceFeedConfigured(baseToken, quoteToken, config.feedType, config.feedAddress);
    }
    
    /**
     * @dev Sets feed priority (mock implementation)
     */
    function setFeedPriority(
        address baseToken,
        address quoteToken,
        PriceFeedType primaryType,
        PriceFeedType fallbackType
    ) external override onlyOwner {
        emit FeedPrioritySet(baseToken, quoteToken, primaryType, fallbackType);
    }
    
    /**
     * @dev Checks if price feed exists
     */
    function hasPriceFeed(address baseToken, address quoteToken) external view override returns (bool exists) {
        return hasPriceFeedMapping[baseToken][quoteToken];
    }
    
    /**
     * @dev Gets price feed configuration
     */
    function getPriceFeedConfig(
        address baseToken,
        address quoteToken,
        PriceFeedType /* feedType */
    ) external view override returns (PriceFeedConfig memory config) {
        return priceFeedConfigs[baseToken][quoteToken];
    }
    
    /**
     * @dev Validates price
     */
    function validatePrice(address /* baseToken */, address /* quoteToken */, uint256 price) external pure override returns (bool isValid) {
        return price > 0;
    }
    
    // ========== ORIGINAL VCOPACLE FUNCTIONS ==========
    
    /**
     * @dev Gets USD to COP rate (view)
     */
    function getUsdToCopRateView() public view returns (uint256) {
        return _usdToCopRate;
    }
    
    /**
     * @dev Gets VCOP to COP rate (view)
     */
    function getVcopToCopRateView() public view returns (uint256) {
        return _vcopToCopRate;
    }
    
    /**
     * @dev Gets USD to COP rate
     */
    function getUsdToCopRate() external returns (uint256) {
        console.log("Mock USD/COP rate query by:", msg.sender);
        console.log("Current USD/COP rate:", _usdToCopRate);
        
        emit PriceRequested(msg.sender, "USD/COP");
        emit PriceProvided(msg.sender, "USD/COP", _usdToCopRate);
        
        return _usdToCopRate;
    }
    
    /**
     * @dev Gets VCOP to COP rate
     */
    function getVcopToCopRate() external returns (uint256) {
        console.log("Mock VCOP/COP rate query by:", msg.sender);
        console.log("Current VCOP/COP rate:", _vcopToCopRate);
        
        emit PriceRequested(msg.sender, "VCOP/COP");
        emit PriceProvided(msg.sender, "VCOP/COP", _vcopToCopRate);
        
        return _vcopToCopRate;
    }
    
    /**
     * @dev Gets VCOP to USD price
     */
    function getVcopToUsdPrice() external returns (uint256) {
        console.log("Mock VCOP/USD price query by:", msg.sender);
        console.log("Current VCOP/USD rate:", _vcopToUsdRate);
        
        emit PriceRequested(msg.sender, "VCOP/USD");
        emit PriceProvided(msg.sender, "VCOP/USD", _vcopToUsdRate);
        
        return _vcopToUsdRate;
    }
    
    /**
     * @dev Gets price for rebase mechanism
     */
    function getPrice() external returns (uint256) {
        console.log("Mock price query for rebase by:", msg.sender);
        console.log("Current VCOP/COP rate:", _vcopToCopRate);
        
        emit PriceRequested(msg.sender, "REBASE");
        emit PriceProvided(msg.sender, "REBASE", _vcopToCopRate);
        
        return _vcopToCopRate;
    }
    
    /**
     * @dev Sets USD to COP rate
     */
    function setUsdToCopRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be greater than zero");
        
        uint256 oldRate = _usdToCopRate;
        _usdToCopRate = newRate;
        
        console.log("Mock USD/COP rate updated:", newRate);
        emit UsdToCopRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Sets VCOP to COP rate
     */
    function setVcopToCopRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be greater than zero");
        
        uint256 oldRate = _vcopToCopRate;
        _vcopToCopRate = newRate;
        
        console.log("Mock VCOP/COP rate updated:", newRate);
        emit VcopToCopRateUpdated(oldRate, newRate);
    }
    
    // ========== COMPATIBILITY FUNCTIONS ==========
    
    /**
     * @dev Mock implementation of pool price update
     */
    function updateRatesFromPool() public returns (uint256, uint256) {
        // In mock, we don't update from pool, just return current rates
        console.log("Mock: updateRatesFromPool called (no actual update)");
        return (_vcopToCopRate, _vcopToUsdRate);
    }
    
    /**
     * @dev Mock implementation of parity check
     */
    function isVcopAtParity() public view returns (bool) {
        // Check if VCOP/COP is around 1:1 (within 1% tolerance)
        uint256 toleranceLower = 990000; // 0.99 * 1e6
        uint256 toleranceUpper = 1010000; // 1.01 * 1e6
        
        bool atParity = (_vcopToCopRate >= toleranceLower && _vcopToCopRate <= toleranceUpper);
        console.log("Mock parity check:", atParity);
        return atParity;
    }
    
    /**
     * @dev Mock implementation of pool price getter
     */
    function getVcopToUsdPriceFromPool() public view returns (uint256) {
        console.log("Mock: Returning VCOP/USD from 'pool':", _vcopToUsdRate);
        return _vcopToUsdRate;
    }
    
    // ========== CHAINLINK COMPATIBILITY FUNCTIONS (MOCK) ==========
    
    /**
     * @dev Mock implementation of getBtcPriceFromChainlink
     */
    function getBtcPriceFromChainlink() public view returns (uint256 price) {
        if (mockWBTC != address(0) && mockUSDC != address(0)) {
            return manualPrices[mockWBTC][mockUSDC];
        }
        return 45000 * 1e6; // Default BTC price
    }
    
    /**
     * @dev Mock implementation of getEthPriceFromChainlink
     */
    function getEthPriceFromChainlink() public view returns (uint256 price) {
        if (mockETH != address(0) && mockUSDC != address(0)) {
            return manualPrices[mockETH][mockUSDC];
        }
        return 2500 * 1e6; // Default ETH price
    }
    
    /**
     * @dev Mock implementation of setChainlinkEnabled (no-op in mock)
     */
    function setChainlinkEnabled(bool enabled) external onlyOwner {
        console.log("Mock: setChainlinkEnabled called with:", enabled);
        // In mock, this does nothing but maintains compatibility
    }
    
    /**
     * @dev Mock implementation of getChainlinkFeedInfo
     */
    function getChainlinkFeedInfo(address token) external view returns (
        address feedAddress,
        uint256 latestPrice,
        uint256 updatedAt,
        bool isStale
    ) {
        if (token == mockWBTC) {
            feedAddress = address(this);
            latestPrice = getBtcPriceFromChainlink();
            updatedAt = block.timestamp;
            isStale = false;
        } else if (token == mockETH) {
            feedAddress = address(this);
            latestPrice = getEthPriceFromChainlink();
            updatedAt = block.timestamp;
            isStale = false;
        } else {
            return (address(0), 0, 0, true);
        }
    }
    
    /**
     * @dev Mock implementation of setPriceCalculator (no-op in mock)
     */
    function setPriceCalculator(address _calculator) external onlyOwner {
        console.log("Mock: setPriceCalculator called with:", _calculator);
        // In mock, this does nothing but maintains compatibility
    }

    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @dev Resets all prices to realistic 2025 values
     */
    function resetToDefaults() external onlyOwner {
        _usdToCopRate = 4200 * 1e6; // 4200 COP = 1 USD (realistic 2025)
        _vcopToCopRate = 1e6; // 1:1 parity
        _vcopToUsdRate = 1e6; // 1 VCOP = 1 USD
        
        if (mockETH != address(0) && mockUSDC != address(0)) {
            setMockTokens(mockETH, mockWBTC, mockUSDC);
        }
        
        console.log("Mock oracle reset to realistic 2025 values");
    }
    
    /**
     * @dev Sets current realistic 2025 market prices as defaults
     */
    function setCurrentMarketDefaults() external onlyOwner {
        // Realistic January 2025 prices based on market data
        _usdToCopRate = 4200 * 1e6; // 4200 COP per USD
        _vcopToCopRate = 1e6; // 1:1 parity with COP
        _vcopToUsdRate = 1e6; // 1 VCOP = 1 USD initially
        
        if (mockETH != address(0) && mockUSDC != address(0)) {
            // Current ETH price: ~$2,500
            _setManualPrice(mockETH, mockUSDC, 2500 * 1e6);
            _setManualPrice(mockUSDC, mockETH, 400); // 1 USDC = 0.0004 ETH
        }
        
        if (mockWBTC != address(0) && mockUSDC != address(0)) {
            // Current BTC price: ~$104,000
            _setManualPrice(mockWBTC, mockUSDC, 104000 * 1e6);
            _setManualPrice(mockUSDC, mockWBTC, 9); // 1 USDC = ~0.000009 BTC
        }
        
        // Cross-pairs based on current prices
        if (mockETH != address(0) && mockWBTC != address(0)) {
            // ETH/BTC = 2500/104000 = 0.024038
            _setManualPrice(mockETH, mockWBTC, 24038);
            // BTC/ETH = 104000/2500 = 41.6
            _setManualPrice(mockWBTC, mockETH, 41600000);
        }
        
        console.log("Current 2025 market defaults set:");
        console.log("ETH: $2,500 | BTC: $104,000 | USD/COP: 4,200");
    }
    
    /**
     * @dev Gets current mock configuration for debugging
     */
    function getConfiguration() external view returns (
        uint256 usdToCopRate,
        uint256 vcopToCopRate,
        uint256 vcopToUsdRate,
        address mockETHAddr,
        address mockWBTCAddr,
        address mockUSDCAddr
    ) {
        return (
            _usdToCopRate,
            _vcopToCopRate,
            _vcopToUsdRate,
            mockETH,
            mockWBTC,
            mockUSDC
        );
    }
} 