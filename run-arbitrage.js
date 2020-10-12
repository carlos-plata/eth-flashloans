require('dotenv').config();
const Web3 = require('web3');
const {ChainId, Token, TokenAmount, Pair, Fetcher} = require('@uniswap/sdk');
const abis = require('./abis');
const {mainnet: addresses} = require('./addresses');

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.INFURA_URL));

const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyber.kyberNetworkProxy
);

const AMOUNT_ETH = 100;
const RECENT_ETH_PRICE= 370;
const AMOUNT_ETH_WEI = web3.utils.toWei(AMOUNT_ETH.toString());
const AMOUNT_BAND_WEI = web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString());

const init = async () => {
    const [band, weth] = await Promise.all(
        [addresses.tokens.band, addresses.tokens.weth].map(tokenAddress => (
            new Token(ChainId.MAINNET, tokenAddress, 18)
    )));
    const bandWeth = await Fetcher.fetchPairData(
        band,
        weth
    );

    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block =>{
            console.log(`New block received. Block # ${block.number}`);

            const kyberResults = await Promise.all([
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.band,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_BAND_WEI
                    ).call(),
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        addresses.tokens.band,
                        AMOUNT_ETH_WEI
                    ).call()
            ]);
            const kyberRates = {
                buy: parseFloat(1/(kyberResults[0].expectedRate/(10 ** 18))),
                sell: parseFloat(kyberResults[1].expectedRate/(10 ** 18))
            };
            console.log('Kyber ETH/BAND');
            console.log(kyberRates);

            const uniswapResults = await Promise.all([
                bandWeth.getOutputAmount(new TokenAmount(band, AMOUNT_BAND_WEI)),
                bandWeth.getOutputAmount(new TokenAmount(weth, AMOUNT_ETH_WEI)),
            ]);
            const uniswapRates = {
                buy: parseFloat(AMOUNT_BAND_WEI/(uniswapResults[0][0].toExact() * 10 ** 18)),
                sell: parseFloat(uniswapResults[1][0].toExact()/AMOUNT_ETH)
            };
            console.log('Uniswap ETH BAND');
            console.log(uniswapRates);
        })
        .on('error', error => {
            console.log(error);
        });
}
init();
