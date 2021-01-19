require('dotenv').config()
const Web3 = require('web3');
const abis = require('./abis');
const rootkitmoneyabi = require('./rootkitmoneyabi');
const flashloanabi = require('./flashloanabi');
const moneymakerabi = require('./moneymakerabi');
const { mainnet: addresses } = require('./addresses');
const Flashloan = require('./build/contracts/Flashloan.json');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
    );

var BN = web3.utils.BN;

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyber.kyberNetworkProxy
  );

const ONE_WEI = web3.utils.toBN(web3.utils.toWei('1'));

const rootkitmoneyToken = new web3.eth.Contract(rootkitmoneyabi.rootkitmoney,addresses.tokens.rootkitmoney);
const flashloan = new web3.eth.Contract(flashloanabi.flashloan, addresses.tokens.flashloan);
const moneymaker = new web3.eth.Contract(flashloanabi.flashloan, addresses.tokens.moneymaker);

const ETH_AMOUNT= web3.utils.toWei('13', 'ether');
let walletBalance= 0;

const TOKEN_PATH = {
    WETH_WBTC_ROOT_KETH: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E', '0x1df2099f6AbBf0b05C12a61835137D84F10DAA96'],
    WEHT_WBTC_ROOT_WETH: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    WETH_ROOT_KETH: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E', '0x1df2099f6AbBf0b05C12a61835137D84F10DAA96'],
    WETH_ROOT_WBTC: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
    //KETH_ROOT_WETH: ['0x1df2099f6AbBf0b05C12a61835137D84F10DAA96', '0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    //KETH_ROOT_WBTC_WETH: ['0x1df2099f6AbBf0b05C12a61835137D84F10DAA96', '0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2']
}

const init = async () => {
    walletBalance = await web3.eth.getBalance(admin);
    console.log('WALLET BALANCE >>>>> ' + web3.utils.fromWei(web3.utils.toBN(walletBalance), 'ether'));
    let ethPrice;
    const updateEthPrice = async () => {
    const results = await kyber
    .methods
    .getExpectedRate(
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
        addresses.tokens.dai, 
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
            goMakeMoney(TOKEN_PATH[key], key, ETH_AMOUNT, ethPrice);
        }
    }).on('error', error => {
        console.log(error);
    });
}
init();

async function goMakeMoney(tokenPath, key, amount, ethPrice){
    let gasPrice= await web3.eth.getGasPrice();
    let pendingBlockGasLimit= await web3.eth.getBlock("pending")
                                    .then(function (response){
                                        return response.gasLimit;
                                    });
    console.log('CURRENT GAS PRICE in WEI >>> ' + gasPrice);
    console.log('CURRENT PENDING BLOCK GAS LIMIT in WEI >>> ' + pendingBlockGasLimit);
    console.log('CURRENT GAS PRICE IN ETHER >>> ' + web3.utils.fromWei(web3.utils.toBN(gasPrice), 'micro'));
    let estimatedGasCost = web3.utils.fromWei(web3.utils.toBN(gasPrice), 'micro') * ethPrice;
    console.log('ESTIMATED GAS COST IN USD >>>> ' + estimatedGasCost);
    console.log('AMOUNT TO SPEND IN WEI >>>> ' + amount);
    console.log('AMOUNT TO SPEND IN ETHER >>>> ' + web3.utils.fromWei(web3.utils.toBN(amount), 'ether'));
    let estimatedProfit= await calculateEstimatedProfit(tokenPath, amount);
    console.log('ESTIMATED PROFIT IN WEI >>> ' + estimatedProfit);
    console.log('ESTIMATED PROFIT IN ETHER >>> ' + web3.utils.fromWei(web3.utils.toBN(estimatedProfit), 'ether'));

    let txCost= 0;
    txCost= await moneymaker.methods.initiateFlashloan(addresses.dydx.solo, addresses.tokens.weth, amount, tokenPath)
    .estimateGas({from: admin, gas: pendingBlockGasLimit})
    .then(function(gasAmount){
        console.log('THIS IS THE COST OF INITIATE FLASH LOAN >>>> ' + gasAmount);
        return gasAmount;
    })
    .catch(function(error){
        console.log('NO MAMES, EN SERIO!!! >>>> ' + error.message);
        //console.log(error);
        return 0;
    })

    console.log('TRANSACTION COST IS >>>> ' + txCost);
    console.log('ESTIMATED PROFIT IN USD >>> ' + web3.utils.fromWei(web3.utils.toBN(estimatedProfit).mul(ethPrice), 'ether'));

    if((txCost > 0) && (estimatedProfit > txCost) && (walletBalance > txCost)){
        console.log('OPPORTUNITY FOR ' +  key + ' GO MAKE MONEY !!! >>>>');
        // using the promise
        moneymaker.methods.initiateFlashloan(addresses.dydx.solo, addresses.tokens.weth, amount, tokenPath)
        .send({from: admin, gasPrice: gasPrice, gas: pendingBlockGasLimit})
        .on('receipt', function(receipt){
            console.log('PRINTING TX RECEIPT >>>> ');
            console.log(receipt);
        }).on('error', function(error, receipt){
            console.log('PRINTING ERROR >>>> ');
            console.log(error);
            if(receipt){
                console.log('PRINTING RECEIPT >>>> ');
                console.log(receipt);
            }
        });
    }else{
        console.log('ESTIMATED PROFIT: ' + web3.utils.fromWei(web3.utils.toBN(estimatedProfit).mul(ethPrice), 'ether') + ' IS LESS THAN POSSIBE GAS COST: ' + estimatedGasCost + '. NO CURRENT OPPORTUNITIES IN >>>> ' + key);
    }
}

async function calculateEstimatedProfit(tokenPath, amount){
    let estimatedProfit= await rootkitmoneyToken.methods.estimateProfit(tokenPath,amount).call(function (err, response) {
        if (err) {
          console.log("An error occured", err);
          return
        }        
        return web3.utils.fromWei((response).toString(), 'ether');
      });
    return estimatedProfit;
}