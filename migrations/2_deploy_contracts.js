const FlightSuretyApp = artifacts.require('FlightSuretyApp');
const FlightSuretyData = artifacts.require('FlightSuretyData');
const fs = require('fs');

module.exports = async (deployer) => {
  let firstAirline = '0xD0637B3A7035225BeD46f95eEFaC0D9b296972E8';
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
