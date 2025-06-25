// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockETH
 * @notice Mock Ethereum token for testing the vault-based lending system
 */
contract MockETH is ERC20 {
    
    constructor() ERC20("Mock Ethereum", "mockETH") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10**18); // 1M ETH
    }
    
    /**
     * @dev Mints tokens to any address (for testing only)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Returns 18 decimals (standard for ETH)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
} 