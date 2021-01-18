require('dotenv').config()
const Web3 = require('web3');
const abis = require('./abis');
const swapperabi = require('./swapperabi');
const { mainnet: addresses } = require('./addresses');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_ROPSTEN_URL)
    );

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyberRopsten.kyberNetworkProxy
  );

const ONE_WEI = web3.utils.toBN(web3.utils.toWei('1'));

const swapper = new web3.eth.Contract(swapperabi.swapper, addresses.tokensRopsten.swapper);

const ETH_AMOUNT= web3.utils.toWei('3', 'ether');

const TOKEN_PATH = {
    //WEHT_WBTC_ROOT_WETH: ['0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xad6d458402f60fd3bd25163575031acdce07538d', '0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5'],
    WETH_ROOT_WETH: ['0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5', '0xad6d458402f60fd3bd25163575031acdce07538d', '0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5']
    //WETH_ROOT_WBTC_WETH: ['0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5', '0xad6d458402f60fd3bd25163575031acdce07538d', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5']
}

const init = async () => {
    let ethPrice;
    const updateEthPrice = async () => {
    const results = await kyber
    .methods
    .getExpectedRate(
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
        addresses.tokensRopsten.dai, 
        1
    )
    .call();
    ethPrice = web3.utils.toBN('1').mul(web3.utils.toBN(results.expectedRate)).div(ONE_WEI);
    }
    await updateEthPrice();
    setInterval(updateEthPrice, 15000);
    console.log('CURRENT ETH PRICE >>> ' + ethPrice);
     web3.eth.subscribe('newBlockHeaders').on('data', async block => {
        console.log(`New block received. Block # ${block.number}`);
        for (let key of Object.keys(TOKEN_PATH)) {
            swapTokens(TOKEN_PATH[key], key, ETH_AMOUNT, ethPrice);
        }
    }).on('error', error => {
        console.log(error);
    });
}
init();

async function swapTokens(tokenPath, key, amount, ethPrice){
    let gasPrice= await web3.eth.getGasPrice();
    let pendingBlockGasLimit= await web3.eth.getBlock("pending")
                                    .then(function (response){
                                        return response.gasLimit;
                                    });
    console.log('CURRENT GAS PRICE in WEI >>> ' + gasPrice);
    console.log('CURRENT PENDING BLOCK GAS LIMIT in WEI >>> ' + pendingBlockGasLimit);
    console.log('CURRENT GAS PRICE IN ETHER >>> ' + web3.utils.fromWei(web3.utils.toBN(gasPrice), 'ether'));
    let estimatedGasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN('50')).mul(ethPrice);
    console.log('ESTIMATED GAS COST IN WEI >>>> ' + estimatedGasCost);
    estimatedGasCost= web3.utils.fromWei(web3.utils.toBN(estimatedGasCost), 'ether');
    estimatedGasCost= ((estimatedGasCost * web3.utils.fromWei(web3.utils.toBN(amount), 'ether')) * ethPrice);
    console.log('ESTIMATED GAS COST IN USD >>>> ' + estimatedGasCost);
    console.log('AMOUNT TO SPEND IN WEI >>>> ' + amount);
    console.log('AMOUNT TO SPEND IN ETHER >>>> ' + web3.utils.fromWei(web3.utils.toBN(amount), 'ether'));

    let txCost= await swapper.methods.swapTokens(tokenPath, amount)
    .estimateGas({from: admin, gas: pendingBlockGasLimit})
    .then(function(gasAmount){
        console.log('THIS IS THE COST OF INITIATE FLASH LOAN >>>> ' + gasAmount);
        return gasAmount;
    })
    .catch(function(error){
        console.log('EN SERIO!!! >>>> ');
        console.log(error);
    })

    if(txCost > 0){
        console.log('OPPORTUNITY FOR ' +  key + ' GO MAKE MONEY !!! >>>>');
    }else{
        console.log('NO CURRENT OPPORTUNITIES IN >>>> ' + key);
    }
}