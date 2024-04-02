# UniswapV3Manager Contract 

## Introduction

The UniswapV3Manager contract facilitates liquidity provision on the Uniswap V3 protocol. It enables users to create and remove liquidity positions in Uniswap V3 pools efficiently.

## Features
* Create Liquidity Positions: Allows users to create liquidity positions in Uniswap V3 pools.
* Remove Liquidity: Provides functionality to remove existing liquidity positions.
* Position Information: Retrieves information about a liquidity position based on its token ID and pool address.

## Usage

### 1. Create Liquidity Positions

   ```solidity
   function createPosition(
   address pool,
   uint256 amount0,
   uint256 amount1,
   LiquidityType liquidityType
   ) external onlyRole(LIQUIDITY_MANAGER_ROLE);
   ```

*    **pool**: The address of the Uniswap V3 pool.
*    **amount0**: The amount of token0 to provide as liquidity.
*    **amount1**: The amount of token1 to provide as liquidity.
*    **liquidityType**: The type of liquidity provision. Options: InCurrentTick, AboveCurrentTick, BelowCurrentTick.

### 2. Remove Liquidity

   ```solidity
   function removeLiquidity(
   uint256 tokenId
   ) external onlyRole(LIQUIDITY_MANAGER_ROLE);
```

*    **tokenId**: The unique identifier of the liquidity position to remove.

### 3. Position Information

   ```solidity
   function positionInfo(
   uint256 tokenId
   ) external view returns (int24 tickLower, int24 tickUpper, uint128 liquidity, int24 tick);
```

**tokenId**: The unique identifier of the liquidity position.
**pool**: The address of the Uniswap V3 pool.

# Important Notes

*    The `createPosition` method supports three types of liquidity provision based on the LiquidityType enum: `InCurrentTick`, `AboveCurrentTick`, `BelowCurrentTick`.
*    When using `AboveCurrentTick` or `BelowCurrentTick`, the contract takes the current tick and adjusts it by +/- 50 tick spaces.
*    The _`createPossition` method sets a tick range of +/- 10 tick spaces around the provided tick. If the liquidity provision is above or below the current tick, it adjusts the tick range accordingly.
*    The contract does not handle `amount0Min` and `amount1Min`, so users need to be cautious of slippage.

# Tests

To simplify testing, hardhat is using fork of mumbai network with deployed `pool`, `tokens`, `nonfungiblePositionManager`.

To run tests, use the following command:

```bash
npx hardhat test
```
