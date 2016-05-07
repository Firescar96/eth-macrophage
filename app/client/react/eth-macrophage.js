import {EthereumNode} from './EthereumNode.js';
import {Home} from './Home.js';
import {mount} from 'react-mounter';
const GETH_BASE_RPCPORT = 22000;
const NUM_GETH_INSTANCES = 10;

EthereumNode.create(GETH_BASE_RPCPORT).then((bootnode) => {
  bootnode.getNodeInfo().then(function ([err, bootnodeInfo]) {
    let createNodePromises = [];
    for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
      let rpcport = GETH_BASE_RPCPORT + i;

      let defer = new Promise((resolve, reject) => {
        EthereumNode.create(rpcport).then( (newNode) => {
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