// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MezoLending
 * @notice BTC-collateral lending contract for MezoShop.
 *
 * On Mezo, native BTC is the gas currency (like ETH on Ethereum).
 * Users deposit BTC via msg.value as collateral and borrow MUSD against it.
 *
 * Key parameters:
 *   - LTV cap: 60% — borrow up to 60% of collateral USD value
 *   - Liquidation threshold: 75% — positions above this can be liquidated
 *   - Interest rate: 0%
 *   - BTC price: passed as a parameter by the caller (backend-assisted, no on-chain oracle)
 *     btcPriceUSD is expressed with 8 decimal places
 *     e.g. BTC = $95,000 → btcPriceUSD = 9_500_000_000_000 (95000 * 1e8)
 */
contract MezoLending {
    using SafeERC20 for IERC20;

    // ── State ──────────────────────────────────────────────────────────────────

    IERC20 public immutable musd;

    /// @notice BTC collateral per user in wei (18 decimals — native BTC on Mezo)
    mapping(address => uint256) public collateral;

    /// @notice MUSD debt per user in MUSD wei (18 decimals)
    mapping(address => uint256) public debt;

    /// @notice Maximum LTV before borrow/withdraw is blocked (60%)
    uint256 public constant LTV_CAP = 60;

    /// @notice LTV at which a position can be liquidated (75%)
    uint256 public constant LIQ_THRESHOLD = 75;

    // ── Events ─────────────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 musdAmount, uint256 btcPriceUSD);
    event Repaid(address indexed user, uint256 musdAmount);
    event Withdrawn(address indexed user, uint256 btcAmount);
    event Liquidated(
        address indexed user,
        address indexed liquidator,
        uint256 btcAmount,
        uint256 debtCleared
    );

    // ── Admin ──────────────────────────────────────────────────────────────────

    address public immutable admin;

    modifier onlyAdmin() {
        require(msg.sender == admin, "MezoLending: not admin");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────────

    /**
     * @param _musd Address of the MUSD ERC20 token
     * @param initialTreasury Amount of MUSD to transfer from deployer into the contract treasury.
     *        Deployer must have approved this contract for at least initialTreasury MUSD before deploying.
     */
    constructor(address _musd, uint256 initialTreasury) {
        require(_musd != address(0), "MezoLending: zero MUSD address");
        musd = IERC20(_musd);
        admin = msg.sender;
        if (initialTreasury > 0) {
            musd.safeTransferFrom(msg.sender, address(this), initialTreasury);
        }
    }

    /**
     * @notice Emergency: admin can withdraw MUSD from the treasury.
     * Only callable by the deployer address.
     */
    function adminWithdrawMUSD(uint256 amount, address to) external onlyAdmin {
        require(to != address(0), "MezoLending: zero address");
        musd.safeTransfer(to, amount);
    }

    // ── External functions ─────────────────────────────────────────────────────

    /**
     * @notice Deposit native BTC as collateral.
     * Send BTC as msg.value — it is credited to the caller's collateral balance.
     */
    function deposit() external payable {
        require(msg.value > 0, "MezoLending: deposit amount must be > 0");
        collateral[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Borrow MUSD against deposited BTC collateral.
     * @param musdAmount Amount of MUSD to borrow (18 decimals)
     * @param btcPriceUSD Current BTC price in USD with 8 decimal places
     * @param recipient Address to receive the borrowed MUSD (the actual user)
     */
    function borrow(uint256 musdAmount, uint256 btcPriceUSD, address recipient) external {
        require(musdAmount > 0, "MezoLending: borrow amount must be > 0");
        require(collateral[recipient] > 0, "MezoLending: no collateral deposited");
        require(btcPriceUSD > 0, "MezoLending: invalid BTC price");
        require(recipient != address(0), "MezoLending: zero recipient");

        uint256 collateralUSD = _collateralUSD(recipient, btcPriceUSD);
        uint256 newDebt = debt[recipient] + musdAmount;

        require(
            newDebt * 100 <= collateralUSD * LTV_CAP,
            "MezoLending: borrow would exceed LTV cap"
        );
        require(
            musd.balanceOf(address(this)) >= musdAmount,
            "MezoLending: insufficient treasury balance"
        );

        debt[recipient] = newDebt;
        musd.safeTransfer(recipient, musdAmount);

        emit Borrowed(recipient, musdAmount, btcPriceUSD);
    }

    /**
     * @notice Repay MUSD debt on behalf of a user.
     * The signer (backend) transfers MUSD from itself back to the treasury
     * and reduces the specified user's debt.
     * @param musdAmount Amount of MUSD to repay (18 decimals)
     * @param borrower The user whose debt is being repaid
     */
    function repay(uint256 musdAmount, address borrower) external {
        require(musdAmount > 0, "MezoLending: repay amount must be > 0");
        require(debt[borrower] >= musdAmount, "MezoLending: repay exceeds outstanding debt");
        require(borrower != address(0), "MezoLending: zero borrower");

        debt[borrower] -= musdAmount;
        musd.safeTransferFrom(msg.sender, address(this), musdAmount);

        emit Repaid(borrower, musdAmount);
    }

    /**
     * @notice Withdraw BTC collateral.
     * Only allowed if the resulting LTV stays at or below LTV_CAP.
     * @param btcAmount Amount of BTC to withdraw (18 decimals / wei)
     * @param btcPriceUSD Current BTC price in USD with 8 decimal places
     */
    function withdraw(uint256 btcAmount, uint256 btcPriceUSD) external {
        require(btcAmount > 0, "MezoLending: withdraw amount must be > 0");
        require(collateral[msg.sender] >= btcAmount, "MezoLending: insufficient collateral");
        require(btcPriceUSD > 0, "MezoLending: invalid BTC price");

        uint256 newCollateral = collateral[msg.sender] - btcAmount;

        // If there is outstanding debt, check LTV after withdrawal
        if (debt[msg.sender] > 0) {
            require(newCollateral > 0, "MezoLending: cannot withdraw all collateral with outstanding debt");
            uint256 newCollateralUSD = (newCollateral * btcPriceUSD) / 1e8;
            require(
                debt[msg.sender] * 100 <= newCollateralUSD * LTV_CAP,
                "MezoLending: withdrawal would exceed LTV cap"
            );
        }

        collateral[msg.sender] = newCollateral;

        (bool success, ) = msg.sender.call{value: btcAmount}("");
        require(success, "MezoLending: BTC transfer failed");

        emit Withdrawn(msg.sender, btcAmount);
    }

    /**
     * @notice Liquidate an undercollateralised position.
     * Can be called by anyone when a user's LTV exceeds LIQ_THRESHOLD.
     * The liquidator receives the user's entire BTC collateral.
     * @param user Address of the position to liquidate
     * @param btcPriceUSD Current BTC price in USD with 8 decimal places
     */
    function liquidate(address user, uint256 btcPriceUSD) external {
        require(btcPriceUSD > 0, "MezoLending: invalid BTC price");
        require(collateral[user] > 0, "MezoLending: no collateral to liquidate");

        uint256 collateralUSD = _collateralUSD(user, btcPriceUSD);
        require(
            debt[user] * 100 > collateralUSD * LIQ_THRESHOLD,
            "MezoLending: position is not undercollateralised"
        );

        uint256 btcToLiquidator = collateral[user];
        uint256 debtCleared = debt[user];

        collateral[user] = 0;
        debt[user] = 0;

        (bool success, ) = msg.sender.call{value: btcToLiquidator}("");
        require(success, "MezoLending: BTC transfer to liquidator failed");

        emit Liquidated(user, msg.sender, btcToLiquidator, debtCleared);
    }

    // ── View functions ─────────────────────────────────────────────────────────

    /**
     * @notice Returns the collateral and debt for a given user.
     * @return collateralBTC BTC collateral in wei
     * @return debtMUSD MUSD debt in wei
     */
    function getPosition(address user)
        external
        view
        returns (uint256 collateralBTC, uint256 debtMUSD)
    {
        return (collateral[user], debt[user]);
    }

    /**
     * @notice Returns the contract's current MUSD treasury balance.
     */
    function treasuryBalance() external view returns (uint256) {
        return musd.balanceOf(address(this));
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    /**
     * @dev Computes collateral value in MUSD units (18 decimals).
     * collateralUSD = collateral[user] * btcPriceUSD / 1e8
     * Both collateral (wei, 1e18) and MUSD (1e18) share 18 decimals,
     * so dividing by 1e8 (price decimals) gives the correct MUSD-unit value.
     */
    function _collateralUSD(address user, uint256 btcPriceUSD)
        internal
        view
        returns (uint256)
    {
        return (collateral[user] * btcPriceUSD) / 1e8;
    }

    // ── Receive ────────────────────────────────────────────────────────────────

    /// @dev Allow contract to receive BTC (needed for liquidation refunds etc.)
    receive() external payable {}
}
