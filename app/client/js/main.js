import {EthereumNetwork} from './EthereumNetwork.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';
const NUM_GETH_INSTANCES = 1;
//const REMOTE_IP = '40.77.56.231';
const LOCAL_IP = '127.0.0.1';

const APP_IP = LOCAL_IP;

//Configure to use the server instead of a local geth node
let appURL = 'http://' + APP_IP + ':3000/';

Meteor.connection = Meteor.connect(appURL);
_.each(['subscribe', 'methods', 'call', 'apply', 'status', 'reconnect', 'disconnect'],
function (name) {
  Meteor[name] = _.bind(Meteor.connection[name], Meteor.connection);
});

//Package.reload = APP_IP.localeCompare(LOCAL_IP) == 0;
Package.reload = false;

//Meteor.connection._stream._changeUrl(appURL);
Meteor.absoluteUrl.defaultOptions.rootUrl = appURL;
//Meteor.connection.reconnect();

EthereumNetwork.setIP(APP_IP);
EthereumNetwork.createNode(true).then((bootnode) => {
  EthereumNetwork.setDefaultBootnode(bootnode);
  let createNodePromises = [];
  for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
    let defer = new Promise((resolve, reject) => {
      EthereumNetwork.createNode(false).then( (newNode) => {
        newNode.addPeer().then(() => {
          resolve();
        });
      });
    });

    createNodePromises.push(defer);
  }

  Promise.all(createNodePromises).then( () => {
    mount(Home);
  });
});
