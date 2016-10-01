import './lib/lib.js';
import {EthereumNetwork} from './EthereumNetwork.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';
import {DEFAULT_ADDR} from './lib/globals.js';

const MICROBE_ADDR = DEFAULT_ADDR;
const MACROPHAGE_ADDRS = [
  DEFAULT_ADDR,
];

EthereumNetwork.createNode(true, MICROBE_ADDR.ip, MICROBE_ADDR.port).then((bootnode) => {
  EthereumNetwork.toggleMicrobe(bootnode);

  EthereumNetwork.setDefaultBootnode(bootnode);
  let createNodePromises = [];
  MACROPHAGE_ADDRS.forEach((macrophageAddr) => {
    let defer = new Promise((resolve, reject) => {
      EthereumNetwork.createNode(false, macrophageAddr.ip, macrophageAddr.port)
      .then( (newNode) => {
        EthereumNetwork.toggleMacrophage(newNode);
        resolve();
      });
    });
    createNodePromises.push(defer);
  });
  Promise.all(createNodePromises).then( () => {
    mount(Home);
  });
});
