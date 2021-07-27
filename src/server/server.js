import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const oracleIndexMap = new Map();
const statusCodes = [0, 10, 20, 30, 40, 50];

const init = async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    for (let i = 10; i < 40; i++) {
      await registerOracle(accounts[i]);
      const indexes = await getIndexes(accounts[i]);
      oracleIndexMap.set(accounts[i], indexes);
    }
  } catch (err) {
    console.log(err);
  }
};

const registerOracle = async (account) => {
  const result = await flightSuretyApp.methods.registerOracle().send({
    from: account,
    value: web3.utils.toWei('1', 'ether'),
    gas: 3000000,
  });
};

const getIndexes = async (account) => {
  const result = await flightSuretyApp.methods.getMyIndexes().call({ from: account, gas: 300000 });
  return result;
};

const submitOracleResponse = async (oracleAddress, index, airlineAddress, flightNumber, flightTime) => {
  const statusCode = statusCodes[Math.floor(Math.random() * Math.floor(5)) + 1];
  const result = await flightSuretyApp.methods
    .submitOracleResponse(index, airlineAddress, flightNumber, flightTime, statusCode)
    .send({ from: oracleAddress, gas: 100000 });
};

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) console.log(error);
    console.log('### Event: ', event);

    const oracles = [];
    for (let [oracleAddress, indexes] of oracleIndexMap) {
      indexes.forEach((index) => {
        if (index == event.returnValues.index) {
          oracles.push(oracleAddress);
        }
      });
    }

    try {
      const { index, airlineAddress, flightNumber, flightTime } = event.returnValues;
      console.log(index, airlineAddress, flightNumber, flightTime);
      oracles.forEach((oracle) => submitOracleResponse(oracle, index, airlineAddress, flightNumber, flightTime));
    } catch (err) {
      console.log(err);
    }
  }
);

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!',
  });
});

init();

export default app;
