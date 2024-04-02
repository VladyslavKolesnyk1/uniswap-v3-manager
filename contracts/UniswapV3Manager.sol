// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/INonfungiblePositionManager.sol";

contract UniswapV3Manager is AccessControl, IERC721Receiver {
    using SafeERC20 for IERC20;

    enum LiquidityType {
        InCurrentTick,
        AboveCurrentTick,
        BelowCurrentTick
    }

    struct Position {
        address pool;
        uint128 liquidity;
        int24 lowerTick;
        int24 upperTick;
    }

    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK = -MIN_TICK;
    bytes32 public constant LIQUIDITY_MANAGER_ROLE =
        keccak256("LIQUIDIY_MANAGER_ROLE");

    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    mapping(uint256 tokenId => Position) private positions;

    event PositionCreated(uint256 tokenId, uint256 amount0, uint256 amount1);
    event PositionRemoved(uint256 tokenId, uint256 amount0, uint256 amount1);

    constructor(address _nonfungiblePositionManager) {
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function createPosition(
        address pool,
        uint256 amount0,
        uint256 amount1,
        LiquidityType liquidityType
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) {
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();
        uint24 fee = IUniswapV3Pool(pool).fee();
        int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();
        (, int24 tick, , , , , ) = IUniswapV3Pool(pool).slot0();

        if (liquidityType == LiquidityType.InCurrentTick) {
            _createPositionInCurrentTick(
                pool,
                tick,
                tickSpacing,
                fee,
                token0,
                token1,
                amount0,
                amount1
            );
        } else if (liquidityType == LiquidityType.BelowCurrentTick) {
            _createPositionBelowCurrentTick(
                pool,
                tick,
                tickSpacing,
                fee,
                token0,
                token1,
                amount1
            );
        } else if (liquidityType == LiquidityType.AboveCurrentTick) {
            _createPositionAboveCurrentTick(
                pool,
                tick,
                tickSpacing,
                fee,
                token0,
                token1,
                amount0
            );
        }
    }

    function removeLiquidity(
        uint256 tokenId
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) {
        Position memory position = positions[tokenId];

        require(position.liquidity > 0, "Position does not exist");

        INonfungiblePositionManager.DecreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .DecreaseLiquidityParams({
                    tokenId: tokenId,
                    liquidity: position.liquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp
                });

        (uint256 amount0, uint256 amount1) = nonfungiblePositionManager
            .decreaseLiquidity(params);

        INonfungiblePositionManager.CollectParams
            memory collectParams = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: uint128(amount0),
                amount1Max: uint128(amount1)
            });

        nonfungiblePositionManager.collect(collectParams);

        delete positions[tokenId];

        emit PositionRemoved(tokenId, amount0, amount1);
    }

    function positionInfo(
        uint256 tokenId
    )
        external
        view
        returns (
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            int24 currentTick
        )
    {
        Position memory position = positions[tokenId];

        require(position.liquidity > 0, "Position does not exist");

        (, int24 tick, , , , , ) = IUniswapV3Pool(position.pool).slot0();

        return (
            position.lowerTick,
            position.upperTick,
            position.liquidity,
            tick
        );
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _createPositionBelowCurrentTick(
        address pool,
        int24 tick,
        int24 tickSpacing,
        uint24 fee,
        address token0,
        address token1,
        uint256 amount1Desired
    ) private {
        IERC20(token1).safeTransferFrom(
            msg.sender,
            address(this),
            amount1Desired
        );
        IERC20(token1).approve(
            address(nonfungiblePositionManager),
            amount1Desired
        );

        (, uint256 amount1) = _createPossition(
            pool,
            tick - 50 * tickSpacing,
            tickSpacing,
            fee,
            token0,
            token1,
            0,
            amount1Desired
        );

        if (amount1 < amount1Desired) {
            IERC20(token1).safeTransfer(msg.sender, amount1Desired - amount1);
        }
    }

    function _createPositionAboveCurrentTick(
        address pool,
        int24 tick,
        int24 tickSpacing,
        uint24 fee,
        address token0,
        address token1,
        uint256 amount0Desired
    ) private {
        IERC20(token0).safeTransferFrom(
            msg.sender,
            address(this),
            amount0Desired
        );
        IERC20(token0).approve(
            address(nonfungiblePositionManager),
            amount0Desired
        );

        (uint256 amount0, ) = _createPossition(
            pool,
            tick + 50 * tickSpacing,
            tickSpacing,
            fee,
            token0,
            token1,
            amount0Desired,
            0
        );

        if (amount0 < amount0Desired) {
            IERC20(token0).safeTransfer(msg.sender, amount0Desired - amount0);
        }
    }

    function _createPositionInCurrentTick(
        address pool,
        int24 tick,
        int24 tickSpacing,
        uint24 fee,
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) private {
        IERC20(token0).safeTransferFrom(
            msg.sender,
            address(this),
            amount0Desired
        );
        IERC20(token1).safeTransferFrom(
            msg.sender,
            address(this),
            amount1Desired
        );

        IERC20(token0).approve(
            address(nonfungiblePositionManager),
            amount0Desired
        );
        IERC20(token1).approve(
            address(nonfungiblePositionManager),
            amount1Desired
        );

        (uint256 amount0, uint256 amount1) = _createPossition(
            pool,
            tick,
            tickSpacing,
            fee,
            token0,
            token1,
            amount0Desired,
            amount1Desired
        );

        if (amount0 < amount0Desired) {
            IERC20(token0).safeTransfer(msg.sender, amount0Desired - amount0);
        }

        if (amount1 < amount1Desired) {
            IERC20(token1).safeTransfer(msg.sender, amount1Desired - amount1);
        }
    }

    function _createPossition(
        address pool,
        int24 tick,
        int24 tickSpacing,
        uint24 fee,
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) private returns (uint256, uint256) {
        int24 lowerTick = tick - 10 * tickSpacing;
        int24 upperTick = tick + 10 * tickSpacing;

        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: lowerTick,
                tickUpper: upperTick,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });

        (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        ) = nonfungiblePositionManager.mint(params);

        positions[tokenId] = Position({
            pool: pool,
            liquidity: liquidity,
            lowerTick: lowerTick,
            upperTick: upperTick
        });

        emit PositionCreated(tokenId, amount0, amount1);

        return (amount0, amount1);
    }
}
