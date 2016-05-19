import {EthereumNode} from './EthereumNode.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';
const GETH_BASE_RPCPORT = 22000;
const NUM_GETH_INSTANCES = 10;

var bootnode = new EthereumNode();
bootnode.initializeConnection(GETH_BASE_RPCPORT).then(() => {
  bootnode.getNodeInfo().then(function ([err, bootnodeInfo]) {
    let createNodePromises = [];
    for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
      let rpcport = GETH_BASE_RPCPORT + i;

      let defer = new Promise((resolve, reject) => {
        var newNode = new EthereumNode();
        newNode.initializeConnection(rpcport).then( () => {
          newNode.addPeer(bootnodeInfo.enode);
          resolve();
        });
      });

      createNodePromises.push(defer);
    }

    Promise.all(createNodePromises).then( () => {
      console.log('promises', createNodePromises);
      mount(Home);
    });
  });
});