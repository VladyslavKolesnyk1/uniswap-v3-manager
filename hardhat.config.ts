import * as dotenv from 'dotenv';

dotenv.config();

import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const deployerPrivateKey = process.env.PRIVATE_KEY;
const alchemyProvider = process.env.ALCHEMY_PROVIDER;
const polygonScannerApiKey = process.env.POLYGON_SCANNER_API_KEY;

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.24',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    viaIR: true,
                },
            },
        ],
    },
    sourcify: {
        enabled: true,
    },

    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            forking: {
                url: alchemyProvider!,
                blockNumber: 47775831,
            },
        },
        mumbai: {
            url: alchemyProvider,
            accounts: [deployerPrivateKey!],
        },
    },
    etherscan: {
        apiKey: {
            polygonMumbai: polygonScannerApiKey!,
        },
    },
};

export default config;
