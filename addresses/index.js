const kyberMainnet = require('./kyber-mainnet.json');
const kyberRinkeby = require('./kyber-rinkeby.json');
const kyberRopsten = require('./kyber-rinkeby.json');
const uniswapMainnet = require('./uniswap-mainnet.json');
const uniswapRinkeby = require('./uniswap-rinkeby.json');
const uniswapRopsten = require('./uniswap-ropsten.json');
const sushiswapMainnet = require('./sushiswap-mainnet.json');
const sakeswapMainnet = require('./sakeswap-mainnet.json');
const dydxMainnet = require('./dydx-mainnet.json');
const dydxRinkeby = require('./dydx-rinkeby.json');
const tokensMainnet = require('./tokens-mainnet.json');
const tokensRinkeby = require('./tokens-rinkeby.json');
const tokensRopsten = require('./tokens-ropsten.json');

module.exports = {
  mainnet: {
    kyber: kyberMainnet,
    kyberRinkeby: kyberRinkeby,
    kyberRopsten: kyberRopsten,
    uniswap: uniswapMainnet,
    uniswapRinkeby: uniswapRinkeby,
    uniswapRopsten: uniswapRopsten,
    sushiswap: sushiswapMainnet,
    sakeswapMainnet: sakeswapMainnet,
    dydx: dydxMainnet,
    dydxRinkeby: dydxRinkeby,
    tokens: tokensMainnet,
    tokensRinkeby: tokensRinkeby,
    tokensRopsten: tokensRopsten
  }
};