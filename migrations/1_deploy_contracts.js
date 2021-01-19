const Flashloan = artifacts.require("Flashloan.sol");
const Swapper = artifacts.require("Swapper.sol");
const { mainnet: addresses } = require('../addresses');

module.exports = function (deployer, network, [beneficiaryAddress, _]) {
  if (network == "mainnet") {
    deployer.deploy(Flashloan, addresses.uniswap.router, addresses.tokens.keth, addresses.tokens.weth, addresses.tokens.root, beneficiaryAddress);
  } else if (network == "ropsten") {
    deployer.deploy(Swapper, addresses.uniswapRopsten.router, addresses.tokensRopsten.weth, addresses.tokensRopsten.root);
  } else if (network == "rinkeby") {
    deployer.deploy(Swapper, addresses.uniswapRinkeby.router, addresses.tokensRinkeby.weth, addresses.tokensRinkeby.root);
  }
};