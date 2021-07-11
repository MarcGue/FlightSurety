import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

const App = {
  web3: null,
  account: null,
  meta: null,
  numberOfAirlines: 0,

  start: async function () {
    const { web3 } = this;

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = FlightSuretyApp.networks[networkId];
      this.meta = new web3.eth.Contract(FlightSuretyApp.abi, deployedNetwork.address);

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];

      this.bindEvents();
      this.isOperational();
      this.getNumberOfAirlines();
    } catch (error) {
      console.error('Could not connect to contract or chain.');
    }
  },

  bindEvents: function () {
    DOM.elid('airline-register-submit').addEventListener('click', async () => {
      const airlineAddress = DOM.elid('airline-register-address').value;
      try {
        await App.registerAirline(airlineAddress);
      } catch (err) {
        console.log(err);
      }
    });

    DOM.elid('airline-fund-submit').addEventListener('click', async () => {
      const amount = DOM.elid('airline-fund-amount').value;
      try {
        await App.fundAirline(amount);
      } catch (err) {
        console.log(err);
      }
    });
  },

  isOperational: async function () {
    const { isOperational } = this.meta.methods;
    const result = await isOperational().call({ from: this.account });
    console.log('IsOperational: ', result);
    if (result) {
    }
  },

  registerAirline: async function (airlineAddress) {
    const { registerAirline } = this.meta.methods;
    const result = await registerAirline(airlineAddress);
  },

  fundAirline: async function (amount) {
    const { fundAirline } = this.meta.methods;
    const result = await fundAirline().send({
      from: this.account,
      value: this.web3.utils.toWei(amount, 'ether'),
    });
  },

  getNumberOfAirlines: async function () {
    const { getNumberOfAirlines } = this.meta.methods;
    const result = await getNumberOfAirlines();
    console.log('Number of Airlines: ', result);
  },
};

window.App = App;

window.addEventListener('load', function () {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn(
      'No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live'
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    App.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
  }

  App.start();
});

// (async () => {
//   let result = null;

//   let contract = new Contract('localhost', () => {
//     // Read transaction
//     contract.isOperational((error, result) => {
//       console.log(error, result);
//       display('Operational Status', 'Check if contract is operational', [
//         { label: 'Operational Status: ', error: error, value: result },
//       ]);
//     });

//     // User-submitted transaction
//     DOM.elid('submit-oracle').addEventListener('click', () => {
//       let flight = DOM.elid('flight-number').value;
//       // Write transaction
//       contract.fetchFlightStatus(flight, (error, result) => {
//         display('Oracles', 'Trigger oracles', [
//           { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp },
//         ]);
//       });
//     });

//     DOM.elid('submit-register-airline').addEventListener('click', async () => {
//       const airlineAddress = DOM.elid('register-airline-address').value;
//       try {
//         await contract.registerAirline(airlineAddress, '0xD0637B3A7035225BeD46f95eEFaC0D9b296972E8');
//       } catch (err) {
//         console.log(err);
//       }
//     });

//     DOM.elid('airline-fund-submit').addEventListener('click', async () => {
//       const airlineAddress = DOM.elid('airline-fund-address').value;
//       const amount = DOM.elid('airline-fund-amount').value;
//       try {
//         await contract.fundAirline(airlineAddress, amount);
//       } catch (err) {
//         console.log(err);
//       }
//     });
//   });
// })();

// function display(title, description, results) {
//   let displayDiv = DOM.elid('display-wrapper');
//   let section = DOM.section();
//   section.appendChild(DOM.h2(title));
//   results.map((result) => {
//     const row = section.appendChild(DOM.div({ className: 'row' }));
//     const col = DOM.div({ className: 'col-sm-12' });
//     const par = col.appendChild(DOM.p(result.label));
//     const span = DOM.span({ className: 'field-value' }, result.error ? String(result.error) : String(result.value));

//     par.appendChild(span);
//     row.appendChild(col);
//     section.appendChild(row);
//   });
//   displayDiv.append(section);
// }
