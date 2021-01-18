pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import './IUniswapV2Router02.sol';
import './IWeth.sol';

contract Swapper {

    IUniswapV2Router02 uniswap;
    IWeth weth;
    IERC20 root;
    mapping (address => bool) approved;

    constructor(address uniswapAddress, address wethAddress, address rootAddress) public {
        uniswap = IUniswapV2Router02(uniswapAddress);
        weth = IWeth(wethAddress);
        root = IERC20(rootAddress);
    }

    function swapTokens(address[] memory _tokenPath, uint256 _amountIn) payable public{
        uint256 amountOut = _amountIn;
        address[] memory path = new address[](2);
        uint256 count = _tokenPath.length;
        for (uint256 x=0; x < count; x++) {
            if(_tokenPath[x] == address(root)){
                if (!approved[address(_tokenPath[x])]) {
                    IERC20(_tokenPath[x]).approve(address(uniswap), uint256(-1));
                    approved[address(_tokenPath[x])] = true;
                }
                path[0] = _tokenPath[x];
                path[1] = _tokenPath[x+1];
                uniswap.swapExactTokensForTokensSupportingFeeOnTransferTokens(amountOut, 0, path, address(this), now);
                (uint256[] memory amounts) = uniswap.getAmountsOut(amountOut, path);
                amountOut = amounts[1];              
            }else {
                if (!approved[address(_tokenPath[x])] && address(_tokenPath[x]) != address(weth)) {
                    IERC20(_tokenPath[x]).approve(address(uniswap), uint256(-1));
                    approved[address(_tokenPath[x])] = true;
                }else{
                    weth.approve(address(uniswap), uint256(-1));
                    approved[address(_tokenPath[x])] = true;
                }
                path[0] = _tokenPath[x];
                path[1] = _tokenPath[x+1];
                (uint256[] memory amounts) = uniswap.swapExactTokensForTokens(amountOut, 0, path, address(this), now);
                amountOut = amounts[1];
            }
        }
    }
}