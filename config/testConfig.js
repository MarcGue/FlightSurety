var FlightSuretyApp = artifacts.require('FlightSuretyApp');
var FlightSuretyData = artifacts.require('FlightSuretyData');
var BigNumber = require('bignumber.js');

var Config = async function (accounts) {
  // These test addresses are useful when you need to add
  // multiple users in test scripts
  let testAddresses = [
    '0xf1921F7a27994c6a57c77D4934745c264B7c6449',
    '0x72Ce3C57c56ab4b5655eE115576068Bf3ABe6Ed1',
    '0x82D0B4A9968570bc2Bcd34Fa87F7D18686aF83a3',
    '0xBeBd99e9C4F7aC42D2B070c79B3D0d9D66dF2bA3',
    '0x7BDD577f00B327715EB6e84BDf3580343a7Fb729',
    '0x05DCc08f2F9395700d7F0202D4bA98fA4858D31A',
    '0xcbd22ff1ded1423fbc24a7af2148745878800024',
    '0xc257274276a4e539741ca11b590b9447b26a8051',
    '0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7',
  ];

  let owner = accounts[0];
  let firstAirline = accounts[1];

  let flightSuretyData = await FlightSuretyData.new(firstAirline);
  let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

  return {
    owner: owner,
    firstAirline: firstAirline,
    weiMultiple: new BigNumber(10).pow(18),
    testAddresses: testAddresses,
    flightSuretyData: flightSuretyData,
    flightSuretyApp: flightSuretyApp,
  };
};

module.exports = {
  Config: Config,
};
