pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@studydefi/money-legos/dydx/contracts/DydxFlashloanBase.sol";
import "@studydefi/money-legos/dydx/contracts/ICallee.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import './IUniswapV2Router02.sol';
import './IWeth.sol';
import './IKETH.sol';


contract Flashloan is ICallee, DydxFlashloanBase {
    struct ArbInfo {
        address[] tokenPath;
        uint repayAmount;
        uint originalAmount;
    }

    event NewArbitrage (
      uint profit,
      uint date
    );

    IUniswapV2Router02 uniswap;
    IKETH keth;
    IWeth weth;
    IERC20 root;
    mapping (address => bool) approved;
    mapping (address => bool) approvedContract;

    constructor(address uniswapAddress, address kethAddress,address wethAddress, address rootAddress) public {
      uniswap = IUniswapV2Router02(uniswapAddress);
      keth = IKETH(kethAddress);
      weth = IWeth(wethAddress);
      root = IERC20(rootAddress);
    }

    // This is the function that will be called postLoan
    // i.e. Encode the logic to handle your flashloaned funds here
    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public {
        ArbInfo memory arbInfo = abi.decode(data, (ArbInfo));
        uint256 balanceWeth = weth.balanceOf(address(this));
        if(balanceWeth >= arbInfo.originalAmount){
            uint256 amountOut = arbInfo.originalAmount;
            if (arbInfo.tokenPath[0] == address(keth)){
                if (!approved[address(keth)]) {
                    keth.approve(address(this), uint256(-1));
                    approved[address(keth)] = true;
                }
               keth.deposit();
            }
            
            goMakeMoney(arbInfo.tokenPath, amountOut);

            uint256 finalBalance = weth.balanceOf(address(this));
            require(finalBalance >= arbInfo.repayAmount, "Not enough funds to repay dydx loan!");
            uint profit = finalBalance - arbInfo.repayAmount;
            weth.transfer(msg.sender, profit);
            emit NewArbitrage(profit, now);
        }
    }

    function goMakeMoney(address[] memory _tokenPath, uint256 _amountIn) private
    {
        uint256 amountOut = _amountIn;
        address[] memory path = new address[](2);
        uint256 swaps = _tokenPath.length;
        for (uint256 x=0; x < swaps; x++) {
            if(((x+1) == swaps) && (_tokenPath[x] == address(weth))){
                break;
            }else {
                if(_tokenPath[x] == address(root)){
                    if (!approved[address(_tokenPath[x])]) {
                        IERC20(_tokenPath[x]).approve(address(uniswap), uint256(-1));
                        approved[address(_tokenPath[x])] = true;
                    }
                    if (!approvedContract[address(_tokenPath[x])]) {
                        IERC20(_tokenPath[x]).approve(address(this), uint256(-1));
                        approvedContract[address(_tokenPath[x])] = true;
                    }
                    path[0] = _tokenPath[x];
                    path[1] = _tokenPath[x+1];
                    amountOut = amountOut.mul(150)/10000; // minus 1.5% fees
                    uniswap.swapExactTokensForTokensSupportingFeeOnTransferTokens(amountOut, 0, path, address(this), now);
                    (uint256[] memory amounts) = uniswap.getAmountsOut(amountOut, path);
                    amountOut = amounts[1];              
                }else {
                    if ((address(_tokenPath[x]) == address(weth))) {
                        if (!approved[address(_tokenPath[x])]) {
                            weth.approve(address(uniswap), uint256(-1));
                            approved[address(_tokenPath[x])] = true;
                        }
                        if (!approvedContract[address(_tokenPath[x])]) {
                            weth.approve(address(this), uint256(-1));
                            approvedContract[address(_tokenPath[x])] = true;
                        }
                    }else if ((address(_tokenPath[x]) == address(keth))) {
                        if (!approved[address(_tokenPath[x])]) {
                            keth.approve(address(uniswap), uint256(-1));
                            approved[address(_tokenPath[x])] = true;
                        }
                        if (!approvedContract[address(_tokenPath[x])]) {
                            keth.approve(address(this), uint256(-1));
                            approvedContract[address(_tokenPath[x])] = true;
                        }
                        if((x+1) == swaps){
                            amountOut = amountOut.mul(150)/10000; // minus 1.5% fees
                            keth.withdraw(amountOut);
                            break;
                        }
                    }else {
                        if (!approved[address(_tokenPath[x])]) {
                            IERC20(_tokenPath[x]).approve(address(uniswap), uint256(-1));
                            approved[address(_tokenPath[x])] = true;
                        }
                        if (!approvedContract[address(_tokenPath[x])]) {
                            IERC20(_tokenPath[x]).approve(address(this), uint256(-1));
                            approvedContract[address(_tokenPath[x])] = true;
                        }
                    }
                    path[0] = _tokenPath[x];
                    if(((x+1) == swaps) && (_tokenPath[x] != address(weth))){
                        path[1] = address(weth);
                    }else{
                        path[1] = _tokenPath[x+1];
                    }
                    if((address(_tokenPath[x]) == address(keth))) {
                        amountOut = amountOut.mul(150)/10000; // minus 1.5% fees
                    }
                    (uint256[] memory amounts) = uniswap.swapExactTokensForTokens(amountOut, 0, path, address(this), now);
                    amountOut = amounts[1];
                }
            }
        }
    }

    function initiateFlashloan(
      address _solo, 
      address _token, 
      uint256 _amount, 
      address[] calldata _tokenPath)
        external
    {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, _token);

        // Calculate repay amount (_amount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _getRepaymentAmountInternal(_amount);
        IERC20(_token).approve(_solo, uint256(-1));
        IERC20(_token).approve(address(this), uint256(-1));

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount);
        operations[1] = _getCallAction(
            // Encode MyCustomData for callFunction
            abi.encode(ArbInfo({tokenPath: _tokenPath, repayAmount: repayAmount, originalAmount: _amount}))
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }

    function() external payable {}
}