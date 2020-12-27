require('dotenv').config()
const Web3 = require('web3');
const abis = require('./abis');
const rootkitmoneyabi = require('./rootkitmoneyabi');
const { mainnet: addresses } = require('./addresses');

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

const ETH_AMOUNT= '6000000000000000000';

const PROFIT= 0.1;

const init = async () => {
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
        goMakeMoney(["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", "0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E", "0x1df2099f6AbBf0b05C12a61835137D84F10DAA96"], ETH_AMOUNT, 'WETH > WBTC > ROOT > KETH');
        //goMakeMoney(["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", "0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"], ETH_AMOUNT, 'WETH > WBTC > ROOT > WETH');
        //goMakeMoney(["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E", "0x1df2099f6AbBf0b05C12a61835137D84F10DAA96"], ETH_AMOUNT, 'WETH > ROOT > KETH');
        //goMakeMoney(["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"], ETH_AMOUNT, 'WETH > ROOT > WBTC');
        //goMakeMoney(["0x1df2099f6AbBf0b05C12a61835137D84F10DAA96", "0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"], ETH_AMOUNT, 'KETH > ROOT > WETH');
        //goMakeMoney(["0x1df2099f6AbBf0b05C12a61835137D84F10DAA96", "0xCb5f72d37685C3D5aD0bB5F982443BC8FcdF570E", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"], ETH_AMOUNT, 'KETH > ROOT > WBTC > WETH');
    }).on('error', error => {
        console.log(error);
    });
}
init();

async function goMakeMoney(path, amount, title){
    let gasPrice;
    web3.eth.getGasPrice()
    .then(function(response){
        gasPrice = response;
    }).catch(function(error){
        console.log(error);
    });
    let block = await web3.eth.getBlock("latest");
    let currentGasLimit = block.gasLimit;
    console.log('CURRENT GAS PRICE >>> ' + gasPrice);
    console.log("CURRENT GAS LIMIT >>> " + currentGasLimit);
    console.log('AMOUNT TO SPEND IN WEI >>>> ' + amount);

    let estimatedProfit= await rootkitmoneyToken.methods.estimateProfit(path,amount).call(function (err, response) {
        if (err) {
          console.log("An error occured", err);
          return
        }        
        return web3.utils.fromWei((response).toString(), 'ether');
      });
      estimatedProfit = web3.utils.fromWei((estimatedProfit).toString(), 'ether');
      console.log('ESTIMATED PROFIT IN ETHER >>> ' + estimatedProfit);
      let txGasPrice = gasPrice * 2;
      console.log('UPDATED GAS PRICE IN WEI >>> ' + txGasPrice);
      console.log('UPDATED GAS PRICE IN GWEI >>> ' + web3.utils.fromWei((txGasPrice).toString(), 'gwei'));     
      let txGasPriceFormatted= web3.utils.fromWei((txGasPrice).toString(), 'micro');
      console.log('UPDATED GAS PRICE IN ETHER >>> ' + txGasPriceFormatted);

      if((estimatedProfit > PROFIT) && (estimatedProfit > txGasPriceFormatted)){
          console.log('PROFIT OPPORTUNITY IN >>>> ' + title);
          console.log('TX GAS PRICE >>>> ' + txGasPriceFormatted + ', PROFIT >>>> ' + estimatedProfit);
          rootkitmoneyToken.methods.gimmeMoney(path, amount, 0).send({from: admin, gas: 999999, gasPrice: txGasPrice.toString()})
            .then(function(receipt){
                console.log(receipt);
            });
      }else{
          console.log('PROFIT LESS THAN: ' + PROFIT + '. NO CURRENT OPPORTUNITIES IN >>>> ' + title);
      }
}