var HDWalletProvider = require('truffle-hdwallet-provider');
var mnemonic = 'wild stick pluck dinosaur uncle school night valley hazard return soccer mimic';

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
  },
  compilers: {
    solc: {
      version: '^0.5.17',
    },
  },
};
