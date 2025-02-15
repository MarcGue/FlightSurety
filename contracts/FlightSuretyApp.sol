pragma solidity ^0.5.17;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private AIRLINE_FUND_FEE = 10 ether;
    uint256 private AIRLINE_CONSENSUS = 4;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Status of the contract

    mapping(address => address[]) private airlineVotes;

    FlightSuretyData internal dataContract;

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
        // Modify to call data contract's status
        require(true, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirlineRegistered() {
        require(
            dataContract.isAirlineRegistered(msg.sender),
            "Caller must be a registered airline to call this function"
        );
        _;
    }

    modifier requireAirlineFunded() {
        require(
            dataContract.isAirlineFunded(msg.sender),
            "Caller must be a funded airline, to call this function"
        );
        _;
    }

    modifier requireAirlineFundable() {
        require(
            msg.value >= AIRLINE_FUND_FEE,
            "Caller has provided insofficient liquidity"
        );
        _;
    }

    modifier requireFlightExists(bytes32 flightKey) {
        require(dataContract.flightExists(flightKey));
        _;
    }

    modifier requireIsInsurable(bytes32 flightNumber) {
        require(dataContract.isInsurable(flightNumber, msg.sender));
        _;
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(bool success, uint256 votes);
    event AirlineFunded(address airlineAddress, uint256 amount);
    event FlightRegistered(
        address airlineAddress,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 flightStatus
    );
    event InsurancePurchased(
        address insureeAddress,
        bytes32 flightNumber,
        uint256 amount
    );

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContractAddress) public {
        contractOwner = msg.sender;
        dataContract = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public pure returns (bool) {
        return true; // Modify to call data contract's status
    }

    function setOperational(bool mode) external requireContractOwner {
        require(operational != mode, "Contract is already in this mode");
        operational = mode;
    }

    function getNumberOfAirlines()
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return dataContract.getNumberOfAirlines();
    }

    function getFlightNumbers()
        external
        view
        requireIsOperational
        returns (bytes32[] memory)
    {
        return dataContract.getFlightNumbers();
    }

    function getInsureeBalance()
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return dataContract.getInsureeBalance(msg.sender);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airlineAddress)
        external
        requireIsOperational
        requireAirlineRegistered
        requireAirlineFunded
        returns (bool success, uint256 votes)
    {
        success = false;
        votes = 0;

        // get the actual number of airlines
        uint256 numberOfAirlines = dataContract.getNumberOfAirlines();
        if (AIRLINE_CONSENSUS > numberOfAirlines) {
            dataContract.registerAirline(airlineAddress);
            success = true;
        } else {
            // check votes for new airline
            bool hasVoted = false;

            for (uint256 i = 0; i < airlineVotes[airlineAddress].length; i++) {
                if (airlineVotes[airlineAddress][i] == msg.sender) {
                    hasVoted = true;
                    break;
                }
            }

            if (!hasVoted) {
                airlineVotes[airlineAddress].push(msg.sender);
            }

            // register if new airline has enough votes
            uint256 requiredVotes = numberOfAirlines.mul(AIRLINE_CONSENSUS).div(
                10
            );
            uint256 mod10 = numberOfAirlines.mul(AIRLINE_CONSENSUS).mod(10);

            if (mod10 >= 1) {
                requiredVotes = requiredVotes.add(1);
            }

            votes = airlineVotes[airlineAddress].length;
            if (votes >= requiredVotes) {
                dataContract.registerAirline(airlineAddress);
                success = true;
            }

            emit AirlineRegistered(success, votes);
        }
    }

    function fundAirline()
        external
        payable
        requireIsOperational
        requireAirlineRegistered
        requireAirlineFundable
    {
        address payable dataContractAddress = address(
            uint160(address(dataContract))
        );
        dataContractAddress.transfer(msg.value);
        dataContract.fundAirline(msg.sender, msg.value);
        emit AirlineFunded(msg.sender, msg.value);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(bytes32 flightNumber, uint256 flightTime)
        external
        requireIsOperational
        requireAirlineRegistered
        requireAirlineFunded
    {
        dataContract.registerFlight(
            msg.sender,
            flightNumber,
            flightTime,
            STATUS_CODE_UNKNOWN
        );
        emit FlightRegistered(
            msg.sender,
            flightNumber,
            flightTime,
            STATUS_CODE_UNKNOWN
        );
    }

    function buyInsurance(bytes32 flightNumber)
        external
        payable
        requireIsOperational
        requireIsInsurable(flightNumber)
        requireFlightExists(flightNumber)
    {
        require(msg.value > 0, "You must provide some value");
        require(msg.value <= 1 ether, "You can only pay up to 1 Ether");

        address payable dataContractAddress = address(
            uint160(address(dataContract))
        );
        dataContractAddress.transfer(msg.value);
        dataContract.buy(flightNumber, msg.sender, msg.value);
        emit InsurancePurchased(msg.sender, flightNumber, msg.value);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        bytes32 oracleKey,
        address airlineAddress,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 statusCode
    ) internal {
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            bytes32 flightKey = getFlightKey(
                airlineAddress,
                flightNumber,
                flightTime
            );
            dataContract.creditInsurees(flightKey);
            dataContract.setFlightStatus(flightKey, statusCode);
            oracleResponses[oracleKey].isOpen = false;
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(bytes32 flightNumber)
        external
        requireIsOperational
        requireContractOwner
    {
        address airlineAddress;
        bytes32 fNumber;
        uint256 flightTime;
        uint8 flightStatus;

        (airlineAddress, fNumber, flightTime, flightStatus) = dataContract
        .getFlight(flightNumber);

        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airlineAddress, fNumber, flightTime)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airlineAddress, fNumber, flightTime);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 status
    );

    event OracleReport(
        address airline,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airlineAddress,
        bytes32 flightNumber,
        uint256 flightTime
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes()
        external
        view
        requireIsOperational
        returns (uint8[3] memory)
    {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        bytes32 flight,
        uint256 timestamp,
        uint8 statusCode
    ) external requireIsOperational {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(key, airline, flight, timestamp, statusCode);
        }
    }

    function pay() external pure {}

    function getFlightKey(
        address airline,
        bytes32 flightNumber,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flightNumber, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}

contract FlightSuretyData {
    function authorizeCaller(address callerAddress) external;

    function registerAirline(address airlineAddress) external;

    function fundAirline(address airlineAddress, uint256 amount) external;

    function buy(
        bytes32 flightKey,
        address insureeAddress,
        uint256 amount
    ) external;

    function registerFlight(
        address airlineAddress,
        bytes32 flightNumber,
        uint256 flightTime,
        uint8 flightStatus
    ) external;

    function creditInsurees(bytes32 flightKey) external;

    function pay(address insureeAddress, uint256 amount) external;

    function setFlightStatus(bytes32 flightKey, uint8 flightStatus) external;

    function isAirlineRegistered(address airlineAddress)
        external
        view
        returns (bool);

    function isAirlineFunded(address airlineAddress)
        external
        view
        returns (bool);

    function isInsurable(bytes32 flightNumber, address insureeAddress)
        external
        view
        returns (bool);

    function flightExists(bytes32 flightNumber) external view returns (bool);

    function getNumberOfAirlines() external view returns (uint256);

    function getFlightNumbers() external view returns (bytes32[] memory);

    function getFlight(bytes32 flightNumber)
        external
        view
        returns (
            address,
            bytes32,
            uint256,
            uint8
        );

    function getInsureeBalance(address insureeAddress)
        external
        view
        returns (uint256);
}
