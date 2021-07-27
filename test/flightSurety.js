var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var web3 = require('web3');

contract('Flight Surety Tests', async (accounts) => {
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, 'Incorrect initial operating status value');
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, 'Access not restricted to Contract Owner');
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, 'Access not restricted to Contract Owner');
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, 'Access not blocked for requireIsOperational');

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
    } catch (e) {}

    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) can fund itself using fundAirline if it is registered', async () => {
    // ARRANGE
    const amount = web3.utils.toWei('10', 'ether');

    // ACT
    try {
      await config.flightSuretyApp.fundAirline({
        from: config.firstAirline,
        value: amount,
      });
    } catch (err) {}

    // ASSERT
    const result = await config.flightSuretyData.isAirlineFunded.call(config.firstAirline);
    assert.equal(result, true, 'Airline is not funded');
  });

  it('(airline) cannot fund itself if it is not registered', async () => {
    // ARRANGE
    const newAirline = accounts[2];
    const amount = web3.utils.toWei('10', 'ether');

    // ACT
    try {
      await config.flightSuretyApp.fundAirline({
        from: newAirline,
        value: amount,
      });
    } catch (err) {}

    // ASSERT
    const result = await config.flightSuretyData.isAirlineFunded.call(newAirline);
    assert.equal(result, false, 'Airline is funded');
  });

  it('(airline) can register an Airline using registerAirline if it is registerd, funded and number of airlines is smaller than consesus', async () => {
    // ARRANGE
    const newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
    } catch (err) {}

    // ASSERT
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
    assert.equal(result, true, 'Airline was not registered');
  });

  it('(airline) cannot register an Airline using registerAirline if it`s registered, funded and new Airline has not enough votes', async () => {
    // ARRANGE
    const amount = web3.utils.toWei('10', 'ether');

    const firstAirline = config.firstAirline;

    const secondAirline = accounts[2];
    await config.flightSuretyApp.fundAirline({ from: secondAirline, value: amount });

    const thirdAirline = accounts[3];
    await config.flightSuretyApp.registerAirline(thirdAirline, { from: firstAirline });
    await config.flightSuretyApp.fundAirline({ from: thirdAirline, value: amount });

    const fourthAirline = accounts[4];
    await config.flightSuretyApp.registerAirline(fourthAirline, { from: firstAirline });
    await config.flightSuretyApp.fundAirline({ from: fourthAirline, value: amount });

    const newAirline = accounts[5];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: secondAirline });
    } catch (err) {}

    // ASSERT
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
    assert.equal(result, false, 'Airline was registered');
  });

  it('(airline) can register an Airline using registerAirline if it`s registered, funded and Airline has enough votes', async () => {
    // ARRANGE
    const newAirline = accounts[5];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
    } catch (err) {}

    // ASSERT
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
    assert.equal(result, true, 'Airline was not registered');
  });

  it('(airline) cannot register a flight, if it`s registered but not funded', async () => {
    const airline = accounts[5];
    const flightNumber = web3.utils.utf8ToHex('LH0001');

    try {
      await config.flightSuretyApp.registerFlight(flightNumber, 1122334455, { from: airline });
    } catch (err) {}

    // ASSERT
    const result = await config.flightSuretyData.getFlightNumbers();
    assert.equal(result.length, 0, 'Flight was registered');
  });

  it('(airline) can register a flight, if it`s registered and funded', async () => {
    // ARRANGE
    const firstAirline = config.firstAirline;
    const flightNumber = web3.utils.utf8ToHex('LH0001');

    // ACT
    try {
      await config.flightSuretyApp.registerFlight(flightNumber, 1122334455, { from: firstAirline });
    } catch (err) {}

    // ASSERT
    const result = await config.flightSuretyData.getFlightNumbers();
    assert.equal(web3.utils.hexToUtf8(result[0]), web3.utils.hexToUtf8(flightNumber), 'Flight was not registered');
  });

  it('(passenger) can buy an insurance', async () => {
    const passenger = accounts[6];
    const flightNumber = web3.utils.utf8ToHex('LH0001');
    const amount = web3.utils.toWei('1', 'ether');

    try {
      await config.flightSuretyApp.buyInsurance(flightNumber, { from: passenger, value: amount });
    } catch (err) {
      console.log(err);
    }

    const result = await config.flightSuretyData.isInsurable(flightNumber, passenger);
    assert.equal(result, false, 'Inuree is insurable');
  });

  it('(oracle) credits insurees', async () => {
    const oracle1 = accounts[7];
    const oracle2 = accounts[8];
    const oracle3 = accounts[9];
    const fee = web3.utils.toWei('1', 'ether');
    const flightNumber = web3.utils.utf8ToHex('LH0001');

    try {
      await config.flightSuretyApp.registerOracle({ from: oracle1, value: fee });
      await config.flightSuretyApp.registerOracle({ from: oracle2, value: fee });
      await config.flightSuretyApp.registerOracle({ from: oracle3, value: fee });
    } catch (err) {
      console.log('Could register oracle: ', err);
    }

    const result = await config.flightSuretyApp.fetchFlightStatus(flightNumber, { from: config.owner });

    assert.equal(result.logs[0].event, 'OracleRequest', 'Event is not OracleRequest');
    assert.equal(result.logs[0].args.airlineAddress, config.firstAirline, 'Airline is not firstAirline');
    assert.equal(
      web3.utils.hexToUtf8(result.logs[0].args.flightNumber),
      web3.utils.hexToUtf8(flightNumber),
      'FlightNumber is different'
    );
  });
});
