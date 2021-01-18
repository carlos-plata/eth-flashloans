pragma solidity ^0.5.0;

interface RootKitDirect
{
    function sell(uint256 rootKitAmountIn, uint256 amountOutMin) external returns (uint256);
}