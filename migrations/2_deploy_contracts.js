const FlightSuretyApp = artifacts.require('FlightSuretyApp');
const FlightSuretyData = artifacts.require('FlightSuretyData');
const fs = require('fs');

module.exports = async (deployer) => {
  let firstAirline = '0xcC77A6BDd552c69e4c88cd5d9bb26E28126C00Ae';
  await deployer.deploy(FlightSuretyData, firstAirline);
  await deployer.deploy(FlightSuretyApp, FlightSuretyData.address);

  let config = {
    localhost: {
      url: 'http://localhost:8545',
      dataAddress: FlightSuretyData.address,
      appAddress: FlightSuretyApp.address,
    },
  };
  fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
  fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
};
