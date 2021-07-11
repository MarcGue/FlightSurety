var HDWalletProvider = require('truffle-hdwallet-provider');
var mnemonic = 'anger carbon recipe enrich loop suit dash start impact slice three mom';

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
