import hre from 'hardhat';
import { timeout } from '../utils/common';
import { verify } from '../utils/verify';

async function main() {
    const UniswapV3ManagerFactory = await hre.ethers.getContractFactory(
        'UniswapV3Manager',
    );
    const uniswapV3ManagerFactory = await UniswapV3ManagerFactory.deploy(
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    );

    console.log('Manager Address: ', uniswapV3ManagerFactory.target);

    await timeout(50000);

    await verify(uniswapV3ManagerFactory.target, [
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    ]);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
