import {EthereumNode} from './EthereumNode.js';
import {EthereumNetwork} from './EthereumNetwork.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';
const GETH_BASE_RPCPORT = 22000;
const NUM_GETH_INSTANCES = 5;

var bootnode = new EthereumNode();
bootnode.initializeConnection(GETH_BASE_RPCPORT).then(() => {
  EthereumNetwork.addNode(bootnode);
  EthereumNetwork.setDefaultBootnode(bootnode);
  let createNodePromises = [];
  for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
    let rpcport = GETH_BASE_RPCPORT + i;

    let defer = new Promise((resolve, reject) => {
      var newNode = new EthereumNode();
      newNode.initializeConnection(rpcport).then( () => {
        EthereumNetwork.addNode(newNode);
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


//export {EthMacrophage};