pragma solidity ^0.5.0;

interface MoneyMaker
{
    function goMakeMoney(address[] calldata _fullPath, uint256 _amountIn) external;
}