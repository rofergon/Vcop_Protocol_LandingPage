// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USD Coin token for testing the vault-based lending system
 */
contract MockUSDC is ERC20 {
    
    constructor() ERC20("Mock USD Coin", "mockUSDC") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000000 * 10**6); // 1B USDC
    }
    
    /**
     * @dev Mints tokens to any address (for testing only)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Returns 6 decimals (standard for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
} 