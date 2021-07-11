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
    } catch (e) {
      console.log('### ERROR: ', e);
    }
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) can fund itself using fundAirline if it is registered', async () => {
    const amount = web3.utils.toWei('10', 'ether');

    try {
      await config.flightSuretyApp.fundAirline({
        from: config.firstAirline,
        value: amount,
      });
    } catch (err) {
      console.log('### Error: ', err);
    }

    const result = await config.flightSuretyData.isAirlineFunded.call(config.firstAirline);

    assert.equal(result, true, 'Airline is not funded');
  });

  it('(airline) can register an Airline using registerAirline if it is registerd, funded and number of airlines is smaller than consesus', async () => {
    // ARRANGE
    const newAirline = accounts[2];
    const amount = web3.utils.toWei('10', 'ether');
    await config.flightSuretyData.fundAirline(config.firstAirline, amount);

    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
    } catch (err) {
      console.log('### ERROR: ', err);
    }

    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

    assert.equal(result, true, 'Airline was not registered');
  });

  it('(airline) can register an Airline using registerAirline if it`s registered, funded and new Airline has enough votes', async () => {
    // Arrange
    const amount = web3.utils.toWei('10', 'ether');

    const firstAirline = config.firstAirline;
    await config.flightSuretyData.fundAirline(firstAirline, amount);

    const secondAirline = accounts[3];
    await config.flightSuretyData.registerAirline(secondAirline);
    await config.flightSuretyData.fundAirline(secondAirline, amount);

    const thirdAirline = accounts[4];
    await config.flightSuretyData.registerAirline(thirdAirline);
    await config.flightSuretyData.fundAirline(thirdAirline, amount);

    const fourthAirline = accounts[5];
    await config.flightSuretyData.registerAirline(fourthAirline);
    await config.flightSuretyData.fundAirline(fourthAirline, amount);

    const fithAirline = accounts[6];
    await config.flightSuretyData.registerAirline(fithAirline);
    await config.flightSuretyData.fundAirline(fithAirline, amount);

    const newAirline = accounts[7];

    // Act
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: firstAirline });
      await config.flightSuretyApp.registerAirline(newAirline, { from: secondAirline });
    } catch (err) {
      console.log('#ERROR: ', err);
    }

    // Assert
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
    assert.equal(result, true, 'Airline was not registered');
  });
});
