import './lib/lib.js';
import {EthereumNetwork} from './EthereumNetwork.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';

const MICROBE_ADDR = {ip: '127.0.0.1', port: 4000};
const MACROPHAGE_ADDRS = [
  {ip: 'macrophage1.westus.cloudapp.azure.com', port: 4000},
  {ip: 'macrophage2.canadacentral.cloudapp.azure.com', port: 4000},
  {ip: 'macrophage3.southcentralus.cloudapp.azure.com', port: 4000},
  {ip: 'macrophage4.brazilsouth.cloudapp.azure.com', port: 4000},
];

EthereumNetwork.createNode(false, MICROBE_ADDR.ip, MICROBE_ADDR.port).then((bootnode) => {
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
