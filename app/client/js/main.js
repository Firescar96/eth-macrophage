import './lib/lib.js';
import {EthereumNetwork} from './EthereumNetwork.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';

const MICROBE_ADDR = {ip: '127.0.0.1', port: 4000};
const MACROPHAGE_ADDRS = [
  {ip: '127.0.0.1', port: 4000},
  // {ip: '40.77.56.231', port: 4000},
];

EthereumNetwork.createNode(false, MICROBE_ADDR.ip, MICROBE_ADDR.port).then((bootnode) => {
  EthereumNetwork.toggleMicrobe(bootnode);

  EthereumNetwork.setDefaultBootnode(bootnode);
  let createNodePromises = [];
  let test = 0;
  MACROPHAGE_ADDRS.forEach((macrophageAddr) => {
    test = 1;
    let defer = new Promise((resolve, reject) => {
      EthereumNetwork.createNode(false, macrophageAddr.ip, macrophageAddr.port)
      .then( (newNode) => {
        EthereumNetwork.toggleMacrophage(newNode);
        newNode.addPeer().then(() => {
          resolve();
        });
      });
    });
    createNodePromises.push(defer);
  });
  Promise.all(createNodePromises).then( () => {
    mount(Home);
  });
});
