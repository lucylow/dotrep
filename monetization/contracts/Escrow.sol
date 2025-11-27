// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Escrow
 * @dev Minimal escrow contract for DotRep marketplace
 */
contract Escrow {
    struct Deposit {
        address buyer;
        uint256 amount;
        address recipient;
        bool released;
    }

    mapping(string => Deposit) public deposits;
    address public owner;
    uint256 public feePercent; // Fee percentage (e.g., 250 = 2.5%)

    event Deposited(string indexed referenceId, address indexed buyer, uint256 amount);
    event Released(string indexed referenceId, address indexed recipient, uint256 amount);
    event FeeCollected(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(uint256 _feePercent) {
        owner = msg.sender;
        feePercent = _feePercent; // Default 2.5% = 250
    }

    /**
     * @dev Deposit funds into escrow
     * @param referenceId Unique reference identifier
     */
    function deposit(string memory referenceId) public payable {
        require(msg.value > 0, "Must send ETH");
        require(deposits[referenceId].buyer == address(0), "Deposit already exists");

        deposits[referenceId] = Deposit({
            buyer: msg.sender,
            amount: msg.value,
            recipient: address(0), // Set by owner before release
            released: false
        });

        emit Deposited(referenceId, msg.sender, msg.value);
    }

    /**
     * @dev Set recipient for a deposit (must be called before release)
     * @param referenceId Reference identifier
     * @param recipient Recipient address
     */
    function setRecipient(string memory referenceId, address recipient) public onlyOwner {
        require(deposits[referenceId].buyer != address(0), "Deposit does not exist");
        require(!deposits[referenceId].released, "Already released");
        deposits[referenceId].recipient = recipient;
    }

    /**
     * @dev Release funds from escrow
     * @param referenceId Reference identifier
     */
    function release(string memory referenceId) public onlyOwner {
        Deposit storage depositInfo = deposits[referenceId];
        require(depositInfo.buyer != address(0), "Deposit does not exist");
        require(depositInfo.recipient != address(0), "Recipient not set");
        require(!depositInfo.released, "Already released");

        depositInfo.released = true;

        // Calculate fee
        uint256 fee = (depositInfo.amount * feePercent) / 10000;
        uint256 amountToRecipient = depositInfo.amount - fee;

        // Transfer to recipient
        payable(depositInfo.recipient).transfer(amountToRecipient);

        // Transfer fee to owner
        if (fee > 0) {
            payable(owner).transfer(fee);
            emit FeeCollected(fee);
        }

        emit Released(referenceId, depositInfo.recipient, amountToRecipient);
    }

    /**
     * @dev Get deposit information
     * @param referenceId Reference identifier
     * @return buyer Buyer address
     * @return amount Deposit amount
     * @return recipient Recipient address
     * @return released Whether funds have been released
     */
    function getDeposit(string memory referenceId) public view returns (
        address buyer,
        uint256 amount,
        address recipient,
        bool released
    ) {
        Deposit memory depositInfo = deposits[referenceId];
        return (
            depositInfo.buyer,
            depositInfo.amount,
            depositInfo.recipient,
            depositInfo.released
        );
    }

    /**
     * @dev Update fee percentage (only owner)
     * @param newFeePercent New fee percentage (e.g., 250 = 2.5%)
     */
    function setFeePercent(uint256 newFeePercent) public onlyOwner {
        require(newFeePercent <= 1000, "Fee cannot exceed 10%");
        feePercent = newFeePercent;
    }
}

