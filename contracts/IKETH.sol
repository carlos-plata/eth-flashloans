
pragma solidity ^0.5.0;

interface IKETH{
    function deposit() external payable;
    function withdraw(uint wad) external;
    function balanceOf(address owner) external view returns(uint);
    function approve(address guy, uint wad) external;
    function transfer(address dst, uint wad) external;
    function transferFrom(address src, address dst, uint wad) external;
}