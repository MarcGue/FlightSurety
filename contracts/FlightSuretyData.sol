pragma solidity ^0.5.17;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Address used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    mapping(address => bool) private authorizedCallers; // Authorized Addresses to access this contract

    struct Airline {
        address Address;
        bool isRegistered;
        bool isFunded;
    }
    uint256 internal totalAirlines = 0; // Number of registered airlines
    mapping(address => Airline) private airlines; // Registered airlines
    mapping(address => uint256) private airlineBalances; // Balance for each airline
    mapping(address => address[]) private airlineVotes;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address airlineAddress);
    event AirlineFunded(address airlineAddress, uint256 amount);
    event AirlineVoted(address airlineAddress, address voterAddress);

    /**
     * @dev Constructor
     *      The deploying Address becomes contractOwner
     */
    constructor(address airlineAddress) public {
        contractOwner = msg.sender;
        authorizedCallers[msg.sender] = true;

        totalAirlines.add(1);
        airlines[airlineAddress] = Airline(airlineAddress, true, false);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" Address to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireCallerAuthorized() {
        require(
            authorizedCallers[msg.sender] == true,
            "Caller is not authorized to call this function"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function authorizeCaller(address callerAddress)
        external
        requireIsOperational
        requireContractOwner
    {
        authorizedCallers[callerAddress] = true;
    }

    // function getBalance()

    function isAirlineRegistered(address airlineAddress)
        external
        view
        returns (bool)
    {
        return airlines[airlineAddress].isRegistered == true;
    }

    function isAirlineFunded(address airlineAddress)
        external
        view
        returns (bool)
    {
        return airlines[airlineAddress].isFunded == true;
    }

    function isAirline(address airlineAddress) external view returns (bool) {
        return
            this.isAirlineRegistered(airlineAddress) &&
            this.isAirlineFunded(airlineAddress);
    }

    function getNumberOfAirlines()
        external
        view
        requireIsOperational
        requireCallerAuthorized
        returns (uint256)
    {
        return totalAirlines;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address airlineAddress)
        external
        requireIsOperational
        requireCallerAuthorized
    {
        totalAirlines.add(1);
        airlines[airlineAddress] = Airline(airlineAddress, true, false);
        emit AirlineRegistered(airlineAddress);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fundAirline(address airlineAddress, uint256 amount)
        public
        payable
        requireIsOperational
    {
        airlineBalances[airlineAddress] = airlineBalances[airlineAddress].add(
            amount
        );
        airlines[airlineAddress].isFunded = true;
        emit AirlineFunded(airlineAddress, amount);
    }

    function voteAirline(address airlineAddress, address voterAddress)
        external
    {
        bool hasVoted = false;

        for (uint256 i = 0; i < airlineVotes[airlineAddress].length; i++) {
            if (airlineVotes[airlineAddress][i] == voterAddress) {
                hasVoted = true;
                break;
            }
        }

        if (!hasVoted) {
            airlineVotes[airlineAddress].push(voterAddress);
            emit AirlineVoted(airlineAddress, voterAddress);
        }
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {}
}
