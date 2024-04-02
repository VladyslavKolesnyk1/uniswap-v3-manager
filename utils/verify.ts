import { run } from 'hardhat';

export const verify = async (contractAddress, args) => {
    try {
        await run('verify:verify', {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes('already verified')) {
            console.log('Already verified!');
        } else {
            console.log(e);
        }
    }
};
