const kyberMainnet = require('./kyber-mainnet.json');
const uniswapMainnet = require('./uniswap-mainnet.json');
const sushiswapMainnet = require('./sushiswap-mainnet.json');
const sakeswapMainnet = require('./sakeswap-mainnet.json');
const dydxMainnet = require('./dydx-mainnet.json');
const tokensMainnet = require('./tokens-mainnet.json');

module.exports = {
  mainnet: {
    kyber: kyberMainnet,
    uniswap: uniswapMainnet,
    sushiswap: sushiswapMainnet,
    sakeswapMainnet: sakeswapMainnet,
    dydx: dydxMainnet,
    tokens: tokensMainnet
  }
};