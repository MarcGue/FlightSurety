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

    struct Flight {
        address airlineAddress;
        bytes32 flightNumber;
        uint256 flightTime;
        uint8 flightStatus;
    }
    bytes32[] private flightKeys;
    mapping(bytes32 => Flight) private flights;

    struct Insurance {
        address insureeAddress;
        uint256 amount;
        address airlineAddress;
        bytes32 flightNumber;
        bool paid;
    }
    mapping(bytes32 => Insurance[]) private insurances;
    mapping(address => uint256) private insureeBalances;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event CallerAuthorized(address callerAddress);
    event AirlineRegistered(address airlineAddress);
    event AirlineFunded(address airlineAddress, uint256 amount);
    event AirlineVoted(address airlineAddress, address voterAddress);
    event FlightRegistered(
        address airlineAddress,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 flightStatus
    );
    event InsurancePurchased(
        address insureeAddress,
        uint256 amount,
        address airlineAddress,
        bytes32 flightNumber
    );

    /**
     * @dev Constructor
     *      The deploying Address becomes contractOwner
     */
    constructor(address airlineAddress) public {
        contractOwner = msg.sender;

        totalAirlines = totalAirlines.add(1);
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
        require(operational != mode, "Contract is already in this mode");
        operational = mode;
    }

    function authorizeCaller(address callerAddress)
        external
        requireIsOperational
        requireContractOwner
    {
        authorizedCallers[callerAddress] = true;
        emit CallerAuthorized(callerAddress);
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
        returns (uint256)
    {
        return totalAirlines;
    }

    function getFlightNumbers()
        external
        view
        requireIsOperational
        returns (bytes32[] memory)
    {
        bytes32[] memory fNumbers = new bytes32[](flightKeys.length);
        for (uint256 i = 0; i < flightKeys.length; i++) {
            fNumbers[i] = flights[flightKeys[i]].flightNumber;
        }
        return fNumbers;
    }

    function isInsurable(bytes32 flightNumber, address insureeAddress)
        external
        view
        requireIsOperational
        returns (bool)
    {
        bool retVal = true;
        bytes32 flightKey = getFlightKey(flightNumber);
        Insurance[] memory insurancesOfFlight = insurances[flightKey];
        for (uint256 i = 0; i < insurancesOfFlight.length; i++) {
            if (insurancesOfFlight[i].insureeAddress == insureeAddress) {
                retVal = false;
                break;
            }
        }
        return retVal;
    }

    function flightExists(bytes32 flightNumber)
        external
        view
        requireIsOperational
        returns (bool)
    {
        bytes32 flightKey = getFlightKey(flightNumber);
        Flight memory flight = flights[flightKey];
        return flight.airlineAddress != address(0);
    }

    function getFlight(bytes32 flightNumber)
        external
        view
        returns (
            address,
            bytes32,
            uint256,
            uint8
        )
    {
        bytes32 flightKey = getFlightKey(flightNumber);
        Flight memory flight = flights[flightKey];
        return (
            flight.airlineAddress,
            flight.flightNumber,
            flight.flightTime,
            flight.flightStatus
        );
    }

    function getInsureeBalance(address insureeAddress)
        external
        view
        requireCallerAuthorized
        returns (uint256)
    {
        return insureeBalances[insureeAddress];
    }

    function getAirlineBalances(address airlineAddress)
        external
        view
        requireCallerAuthorized
        returns (uint256)
    {
        return airlineBalances[airlineAddress];
    }

    function getFlightKey(bytes32 flightNumber) private view returns (bytes32) {
        for (uint8 i = 0; i < flightKeys.length; i++) {
            if (flights[flightKeys[i]].flightNumber == flightNumber) {
                return flightKeys[i];
            }
        }
    }

    function setFlightStatus(bytes32 flightKey, uint8 statusCode)
        external
        requireIsOperational
        requireCallerAuthorized
    {
        flights[flightKey].flightStatus = statusCode;
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
        totalAirlines = totalAirlines.add(1);
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
        requireCallerAuthorized
    {
        airlineBalances[airlineAddress] = airlineBalances[airlineAddress].add(
            amount
        );

        if (airlineBalances[airlineAddress] >= 10) {
            airlines[airlineAddress].isFunded = true;
        } else {
            airlines[airlineAddress].isFunded = false;
        }

        emit AirlineFunded(airlineAddress, amount);
    }

    function registerFlight(
        address airlineAddress,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 flightStatus
    ) external requireIsOperational requireCallerAuthorized {
        bytes32 flightKey = getFlightKey(
            airlineAddress,
            flightNumber,
            flightTime
        );
        flights[flightKey] = Flight(
            airlineAddress,
            flightNumber,
            flightTime,
            flightStatus
        );
        flightKeys.push(flightKey);

        emit FlightRegistered(
            airlineAddress,
            flightNumber,
            flightTime,
            flightStatus
        );
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        bytes32 flightNumber,
        address insureeAddress,
        uint256 amount
    ) external requireIsOperational requireCallerAuthorized {
        bytes32 flightKey = getFlightKey(flightNumber);
        Flight memory flight = flights[flightKey];

        airlineBalances[flight.airlineAddress] = airlineBalances[
            flight.airlineAddress
        ]
        .add(amount);

        Insurance memory insurance = Insurance(
            insureeAddress,
            amount,
            flight.airlineAddress,
            flight.flightNumber,
            false
        );
        insurances[flightKey].push(insurance);

        emit InsurancePurchased(
            insureeAddress,
            amount,
            flight.airlineAddress,
            flight.flightNumber
        );
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 flightNumber)
        external
        requireIsOperational
        requireCallerAuthorized
    {
        bytes32 flightKey = getFlightKey(flightNumber);
        Insurance[] memory insurancesOfFlight = insurances[flightKey];
        for (uint256 i = 0; i < insurancesOfFlight.length; i++) {
            Insurance memory insurance = insurancesOfFlight[i];
            if (
                insurance.flightNumber == flightNumber &&
                insurance.paid == false
            ) {
                uint256 amountToCredit = insurance.amount.mul(150).div(100);
                insureeBalances[insurance.insureeAddress] = insureeBalances[
                    insurance.insureeAddress
                ]
                .add(amountToCredit);
                insurance.paid = true;
                airlineBalances[insurance.airlineAddress] = airlineBalances[
                    insurance.airlineAddress
                ]
                .sub(amountToCredit);
                break;
            }
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address insureeAddress, uint256 amount)
        external
        requireIsOperational
        requireCallerAuthorized
    {
        require(
            insureeBalances[insureeAddress] >= amount,
            "Insufficient funds for given insuree"
        );

        address payable payableInsuree = address(
            uint160(address(insureeAddress))
        );
        uint256 availableAmount = insureeBalances[insureeAddress];
        uint256 updatedAmount = availableAmount.sub(amount);
        insureeBalances[insureeAddress] = updatedAmount;
        payableInsuree.transfer(amount);
    }

    function getFlightKey(
        address airline,
        bytes32 flightNumber,
        uint256 flightTime
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flightNumber, flightTime));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {}
}
