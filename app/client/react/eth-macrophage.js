import {EthereumNode} from './EthereumNode.js';

const GETH_BASE_RPCPORT = 22000;
const NUM_GETH_INSTANCES = 2;

EthereumNode.create(GETH_BASE_RPCPORT).getNodeInfo()
.then(function ([err, bootnode]) {
  for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
    let rpcport = GETH_BASE_RPCPORT + i;

    let newNode = EthereumNode.create(rpcport);
    newNode.addPeer(bootnode.enode);
  }
});