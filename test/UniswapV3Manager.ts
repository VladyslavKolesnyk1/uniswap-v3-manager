import {expect} from 'chai';
import hre from 'hardhat';
import {Token, UniswapV3Manager} from '../typechain-types';

const NON_FUNGIBLE_POSITION_MANAGER_ADDRESS =
    '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const POOL_ADDRESS = '0x6C9A2dC04cc86bDd2db5f31baE0fD56818FD67B7';
const OWNER_ADDRESS = '0x9A5365186639a2E7cC5B3AA2A84F61B17A4A6728';

describe('UniswapV3Manager', function () {
    let uniswapV3Manager: UniswapV3Manager;
    let token0: Token;
    let token1: Token;

    function retrieveTokenFromTxReceipe(txReceipt: any): bigint {
        const positionCreatedEvent = txReceipt?.logs.find((log) => {
            return log.topics[0] === '0xa6002b91967bd5507bbfeefa7d745c79e1e21cc2961c38928b1144b7a9a81ece';
        }) as any;

        return positionCreatedEvent.args[0];
    }

    beforeEach(async function () {
        await hre.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [OWNER_ADDRESS],
        });

        const owner = await hre.ethers.getSigner(OWNER_ADDRESS);

        uniswapV3Manager = await hre.ethers.deployContract(
            'UniswapV3Manager',
            [NON_FUNGIBLE_POSITION_MANAGER_ADDRESS],
            {
                signer: owner,
            },
        );

        token0 = await hre.ethers.getContractAt(
            'Token',
            '0x50d394a5bC8444B667818A784eB804c01C92577a',
            owner,
        );
        token1 = await hre.ethers.getContractAt(
            'Token',
            '0x95088c53F62b6E53142eB2002b0c0661B9853156',
            owner,
        );

        await token0.approve(
            uniswapV3Manager.target,
            hre.ethers.parseUnits('10000', 18),
        );
        await token1.approve(
            uniswapV3Manager.target,
            hre.ethers.parseUnits('10000', 18),
        );
    });

    describe('Deployment', function () {
        it('Should set the right position manager address', async function () {
            const positionManger =
                await uniswapV3Manager.nonfungiblePositionManager();

            expect(positionManger).to.equal(
                NON_FUNGIBLE_POSITION_MANAGER_ADDRESS,
            );
        });

        describe('Position creation', function () {
            it('Should create position with tick lower below current tick, upper ticker above current tick', async function () {
                const tx = await uniswapV3Manager.createPosition(
                    POOL_ADDRESS,
                    hre.ethers.parseUnits('100', 18).toString(),
                    hre.ethers.parseUnits('100', 18).toString(),
                    0
                );
                const txReceipt = await tx.wait();

                const tokenId = retrieveTokenFromTxReceipe(txReceipt);

                const [tickLower, tickUpper, , currentTick] = await uniswapV3Manager.positionInfo(tokenId);

                expect(tickLower < currentTick && tickUpper > currentTick).to.be.true;
            });

            it('Should create position above current tick', async function () {
                const tx = await uniswapV3Manager.createPosition(
                    POOL_ADDRESS,
                    hre.ethers.parseUnits('100', 18).toString(),
                    hre.ethers.parseUnits('100', 18).toString(),
                    1
                );
                const txReceipt = await tx.wait();

                const tokenId = retrieveTokenFromTxReceipe(txReceipt);

                const [tickLower, tickUpper, , currentTick] = await uniswapV3Manager.positionInfo(tokenId);
                expect(tickLower > currentTick && tickUpper > tickLower).to.be.true;
            });

            it('Should create position below current tick', async function () {
                const tx = await uniswapV3Manager.createPosition(
                    POOL_ADDRESS,
                    hre.ethers.parseUnits('100', 18).toString(),
                    hre.ethers.parseUnits('100', 18).toString(),
                    2
                );
                const txReceipt = await tx.wait();

                const tokenId = retrieveTokenFromTxReceipe(txReceipt);

                const [tickLower, tickUpper, , currentTick] = await uniswapV3Manager.positionInfo(tokenId);

                expect(tickUpper < currentTick && tickUpper > tickLower).to.be.true;
            });

            describe('Liquidity removal', function () {
                let tokenId: bigint;

                beforeEach(async function () {
                    const tx = await uniswapV3Manager.createPosition(
                        POOL_ADDRESS,
                        hre.ethers.parseUnits('100', 18).toString(),
                        hre.ethers.parseUnits('100', 18).toString(),
                        0
                    );
                    const txReceipt = await tx.wait();

                    tokenId = retrieveTokenFromTxReceipe(txReceipt);
                })

                it('Should remove liquidity', async function () {
                    await uniswapV3Manager.removeLiquidity(tokenId);

                    expect(uniswapV3Manager.positionInfo(tokenId)).to.be.revertedWith('Position does not exist')
                })

                it('Should collect tokens from position', async function () {
                    const oldBalance0 = await token0.balanceOf(OWNER_ADDRESS);
                    const oldBalance1 = await token1.balanceOf(OWNER_ADDRESS);

                    await uniswapV3Manager.removeLiquidity(tokenId);

                    expect(await token0.balanceOf(OWNER_ADDRESS)).to.be.gt(oldBalance0);
                    expect(await token1.balanceOf(OWNER_ADDRESS)).to.be.gt(oldBalance1);
                })
            });
        });
    });
});
