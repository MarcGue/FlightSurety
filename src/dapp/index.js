import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

const App = {
  web3: null,
  account: null,
  appContract: null,
  dataContract: null,
  numberOfAirlines: 0,

  start: async function () {
    const { web3 } = this;
    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = FlightSuretyApp.networks[networkId];
      const deployedDataNetwork = FlightSuretyData.networks[networkId];
      this.appContract = new web3.eth.Contract(FlightSuretyApp.abi, deployedNetwork.address);
      this.dataContract = new web3.eth.Contract(FlightSuretyData.abi, deployedDataNetwork.address);

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];

      this.bindEvents();
      this.isOperational();
      this.getNumberOfAirlines();
      this.appContract.events.allEvents(
        {
          fromBlock: 'latest',
        },
        async (err, event) => {
          console.log(err, event);
        }
      );

      DOM.elid('owner-app-contract-address').value = deployedNetwork.address;
    } catch (error) {
      console.log(error);
      console.error('Could not connect to contract or chain.');
    }
  },

  bindEvents: function () {
    const {
      isOperational,
      registerAirline,
      registerFlight,
      fundAirline,
      getFlightNumbers,
      getNumberOfAirlines,
      buyInsurance,
      fetchFlightStatus,
    } = this.appContract.methods;

    DOM.elid('owner-authorize-submit').addEventListener('click', async () => {
      const { authorizeCaller } = this.dataContract.methods;
      const appContractAddress = DOM.elid('owner-app-contract-address').value;
      console.log(this.account, appContractAddress);
      try {
        await authorizeCaller(appContractAddress).send({ from: this.account });
      } catch (err) {
        console.log(err);
      }
    });

    DOM.elid('airline-register-submit').addEventListener('click', async () => {
      const airlineAddress = DOM.elid('airline-register-address').value;
      try {
        await registerAirline(airlineAddress).send({ from: this.account });
      } catch (err) {
        console.log(err);
      }
    });

    DOM.elid('airline-fund-submit').addEventListener('click', async () => {
      const amount = DOM.elid('airline-fund-amount').value;
      try {
        await fundAirline().send({
          from: this.account,
          value: this.web3.utils.toWei(amount, 'ether'),
        });
      } catch (err) {
        console.log(err);
      }
    });

    DOM.elid('flight-register-submit').addEventListener('click', async () => {
      const flightNumber = DOM.elid('flight-register-number').value;
      const flightTime = DOM.elid('flight-register-time').value;
      try {
        if (flightNumber) {
          const fNumber = this.web3.utils.fromAscii(flightNumber);
          await registerFlight(fNumber, flightTime).send({ from: this.account });
        }
      } catch (err) {
        console.log(err);
      }
    });

    DOM.elid('insurance-flights-refresh').addEventListener('click', async () => {
      try {
        const selectELement = DOM.elid('insurance-flights-select');
        const childs = selectELement.childNodes;
        childs.forEach((child) => selectELement.removeChild(child));
        const flightNumbers = await getFlightNumbers().call({ from: this.account });
        flightNumbers.forEach((flight) => {
          console.log(flight);
          const convertedFlight = this.web3.utils.toUtf8(flight);
          selectELement.appendChild(DOM.option({ value: convertedFlight }, convertedFlight));
        });
        if (flightNumbers.length > 0) {
          selectELement.value = this.web3.utils.toUtf8(flightNumbers[0]);
          selectELement.dispatchEvent(new Event('change'));
        }
      } catch (err) {
        console.log(err);
      }
    });

    // DOM.elid('insurance-flights-select').addEventListener('change', async () => {
    //   console.log(DOM.elid('insurance-flights-select').value);
    // });

    DOM.elid('insurance-buy-submit').addEventListener('click', async () => {
      try {
        const flightKey = DOM.elid('insurance-flights-select').value;
        const amount = DOM.elid('insurance-flights-amount').value;
        console.log('### Buy Insurance: ', this.web3.utils.fromAscii(flightKey));
        const result = await buyInsurance(this.web3.utils.fromAscii(flightKey)).send({
          from: this.account,
          value: this.web3.utils.toWei(amount, 'ether'),
        });
        console.log(result);
      } catch (err) {
        console.log(err);
      }
    });

    DOM.elid('oracle-flights-refresh').addEventListener('click', async () => {
      const selectElement = DOM.elid('oracle-flights-select');
      const childs = selectElement.childNodes;
      childs.forEach((child) => selectElement.removeChild(child));
      const flightNumbers = await getFlightNumbers().call({ from: this.account });
      flightNumbers.forEach((flight) => {
        console.log(flight);
        const convertedFlight = this.web3.utils.toUtf8(flight);
        selectElement.appendChild(DOM.option({ value: convertedFlight }, convertedFlight));
      });
      if (flightNumbers.length > 0) {
        selectElement.value = this.web3.utils.toUtf8(flightNumbers[0]);
        selectElement.dispatchEvent(new Event('change'));
      }
    });

    DOM.elid('oracle-flights-select').addEventListener('change', async () => {
      // TODO get flight info
    });

    DOM.elid('oracle-flights-check-submit').addEventListener('click', async () => {
      const selectedFlightNumber = DOM.elid('oracle-flights-select').value;
      const result = await fetchFlightStatus(this.web3.utils.fromAscii(selectedFlightNumber)).send({
        from: this.account,
      });
      console.log(result);
    });
  },

  isOperational: async function () {
    const { isOperational } = this.appContract.methods;
    const result = await isOperational().call({ from: this.account });
  },

  getNumberOfAirlines: async function () {
    const { getNumberOfAirlines } = this.appContract.methods;
    const result = await getNumberOfAirlines().call();
    console.log('Number of Airlines: ', result);
  },
};

window.App = App;

window.addEventListener('load', function () {
  if (window.ethereum) {
    // use appContractMask's provider
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
