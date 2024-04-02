import { encodeSqrtRatioX96 } from '@uniswap/v3-sdk';
import { ethers } from 'hardhat';
import { ERC20_ABI, UNISWAP_FACTORY_ABI, UNISWAP_V3_POOL_ABI } from '../abi';

async function main() {
    const token0Address = '0x95088c53F62b6E53142eB2002b0c0661B9853156';
    const token1Address = '0x50d394a5bC8444B667818A784eB804c01C92577a';
    const fee = 0.3 * 10000;
    const price = encodePriceSqrt(1, 1);
    const npmca = '0x91ae842A5Ffd8d12023116943e72A606179294f3';
    const uniswapFactoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
    const amount0 = ethers.parseUnits('10000', 18);
    const amount1 = ethers.parseUnits('10000', 18);

    const uniswapFactoryContract = await getContract(
        uniswapFactoryAddress,
        UNISWAP_FACTORY_ABI,
    );

    await mintAndApprove(amount0, amount1, token0Address, token1Address, npmca);

    let poolAddress = await uniswapFactoryContract.getPool(
        token0Address,
        token1Address,
        fee,
    );

    const [deployer] = await ethers.getSigners();
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
        console.log('Creating pool');
        poolAddress = await createPool(
            uniswapFactoryContract,
            token0Address,
            token1Address,
            fee,
        );

        await initializePool(poolAddress, price, deployer);
    }
}

function encodePriceSqrt(token1Price, token0Price) {
    return encodeSqrtRatioX96(token1Price, token0Price);
}

async function getContract(address, abi) {
    const [deployer] = await ethers.getSigners();
    return new ethers.Contract(address, abi, deployer);
}

async function mintAndApprove(
    amount0,
    amount1,
    token0Address,
    token1Address,
    npmca,
) {
    const [deployer] = await ethers.getSigners();
    const token0 = new ethers.Contract(token0Address, ERC20_ABI, deployer);
    const token1 = new ethers.Contract(token1Address, ERC20_ABI, deployer);

    const tx1 = await token0.mint(deployer.address, amount0);
    await tx1.wait();

    const tx2 = await token1.mint(deployer.address, amount1);
    await tx2.wait();

    await (await token0.approve(npmca, amount0)).wait();
    await (await token1.approve(npmca, amount1)).wait();

    console.log('Minted and approved');
}

async function createPool(
    uniswapFactoryContract,
    token1Address,
    token2Address,
    fee,
) {
    const tx = await uniswapFactoryContract.createPool(
        token1Address.toLowerCase(),
        token2Address.toLowerCase(),
        fee,
    );

    await tx.wait();

    return uniswapFactoryContract.getPool(token1Address, token2Address, fee);
}

async function initializePool(poolAdd, price, signer) {
    const poolContract = new ethers.Contract(
        poolAdd,
        UNISWAP_V3_POOL_ABI,
        signer,
    );

    const tx = await poolContract.initialize(price.toString());
    await tx.wait();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
