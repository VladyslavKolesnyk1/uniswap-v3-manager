import hre from 'hardhat';
import { timeout } from '../utils/common';
import { verify } from '../utils/verify';

async function main() {
    const TokenFactory = await hre.ethers.getContractFactory('Token');
    const token = await TokenFactory.deploy();

    console.log('Token Address: ', token.target);

    await timeout(10000);

    await verify(token.target, []);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
