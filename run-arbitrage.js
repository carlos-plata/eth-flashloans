require('dotenv').config();
const Web3 = require('web3');
const UNISWAP = require('@uniswap/sdk');
const SUSHISWAP = require('@sushiswap/sdk');
const abis = require('./abis');
const {mainnet: addresses} = require('./addresses');
const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.INFURA_URL));
const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyber.kyberNetworkProxy
);
const AMOUNT_ETH = 100;
const RECENT_ETH_PRICE = 390;
const AMOUNT_ETH_WEI = web3.utils.toWei(AMOUNT_ETH.toString());
const AMOUNT_BAND_WEI = web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString());

const init = async () => {
    //uniswap
    const [band, weth] = await Promise.all(
        [addresses.tokens.dai, addresses.tokens.weth].map(tokenAddress => (
            UNISWAP.Token.fetchData(
                UNISWAP.ChainId.MAINNET, 
                tokenAddress,
            )
    )));
    const bandWeth = await UNISWAP.Pair.fetchData(
        band,
        weth
    );

    //sushiswap
    const [sushiband, sushiweth] = await Promise.all(
        [addresses.tokens.dai, addresses.tokens.weth].map(sushiTokenAddress => (
            new SUSHISWAP.Token(SUSHISWAP.ChainId.MAINNET, sushiTokenAddress, 18)
    )));
    const sushiBandWeth = await SUSHISWAP.Fetcher.fetchPairData(sushiband, sushiweth);

    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block =>{
            console.log(`New block received. Block # ${block.number}`);

            const kyberResults = await Promise.all([
                kyber
                  .methods
                  .getExpectedRate(
                    addresses.tokens.dai, 
                    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
                    AMOUNT_BAND_WEI
                  ) 
                  .call(),
                kyber
                  .methods
                  .getExpectedRate(
                    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
                    addresses.tokens.dai, 
                    AMOUNT_ETH_WEI
                  ) 
                  .call()
            ]);
            const kyberRates = {
              buy: parseFloat(1 / (kyberResults[0].expectedRate / (10 ** 18))),
              sell: parseFloat(kyberResults[1].expectedRate / (10 ** 18))
            };
            console.log('Kyber ETH/DAI');
            console.log(kyberRates);

            //uniswap rates
            const uniswapResults = await Promise.all([
                bandWeth.getOutputAmount(new UNISWAP.TokenAmount(band, AMOUNT_BAND_WEI)),
                bandWeth.getOutputAmount(new UNISWAP.TokenAmount(weth, AMOUNT_ETH_WEI)),
            ]);
            const uniswapRates = {
                buy: parseFloat(AMOUNT_BAND_WEI/(uniswapResults[0][0].toExact() * 10 ** 18)),
                sell: parseFloat(uniswapResults[1][0].toExact()/AMOUNT_ETH)
            };
            console.log('Uniswap ETH/PICKLE');
            console.log(uniswapRates);

            //sushiswap rates
            const sushiswapResults = await Promise.all([
                sushiBandWeth.getOutputAmount(new SUSHISWAP.TokenAmount(sushiband, AMOUNT_BAND_WEI)),
                sushiBandWeth.getOutputAmount(new SUSHISWAP.TokenAmount(sushiweth, AMOUNT_ETH_WEI)),
            ]);
            const sushiswapRates = {
                buy: parseFloat(AMOUNT_BAND_WEI/(sushiswapResults[0][0].toExact() * 10 ** 18)),
                sell: parseFloat(sushiswapResults[1][0].toExact()/AMOUNT_ETH)
            };
            console.log('Sushiswap ETH/PICKLE');
            console.log(sushiswapRates);
            
            //const gasPrice = await web3.eth.getGasPrice();
            //const txCost = 200000 * parseInt(gasPrice);
            //const currentEthPrice = (uniswapRates.buy + uniswapRates.sell) / 2; 
            //const profit1 = (((parseInt(AMOUNT_ETH_WEI) / 10 ** 18) * (uniswapRates.sell - sushiswapRates.buy)) - (txCost / 10 ** 18)) * currentEthPrice;
            //const profit2 = (((parseInt(AMOUNT_ETH_WEI) / 10 ** 18) * (sushiswapRates.sell - uniswapRates.buy)) - (txCost / 10 ** 18)) * currentEthPrice;

            /*console.log('PROFIT 1: ' + profit1);
            console.log('PROFIT 2: ' + profit2);

            if(profit1 > 0) {
              console.log('Arb opportunity found!');
              console.log(`Buy ETH on SushiSwap at ${sushiswapRates.buy} band`);
              console.log(`Sell ETH on Uniswap at ${uniswapRates.sell} band`);
              console.log(`Expected profit: ${profit1} band`);
            } else if(profit2 > 0) {
              console.log('Arb opportunity found!');
              console.log(`Buy ETH from Uniswap at ${uniswapRates.buy} band`);
              console.log(`Sell ETH from SushiSwap at ${sushiswapRates.sell} band`);
              console.log(`Expected profit: ${profit2} band`);
            }*/
        })
        .on('error', error => {
            console.log(error);
        });
}
init();
