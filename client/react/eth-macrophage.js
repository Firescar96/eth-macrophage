import {EthereumNode} from './EthereumNode.js';

const GETH_BASE_RPCPORT = 22000;
const NUM_GETH_INSTANCES = 5;

EthereumNode.create(GETH_BASE_RPCPORT);


let bootnodePromise = EthereumNode.getNodeByPort(GETH_BASE_RPCPORT).getNodeInfo();

bootnodePromise.then(function ([err, bootnode]) {
  for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
    let rpcport = GETH_BASE_RPCPORT + i;

    let newNode = EthereumNode.create(rpcport);
    newNode.addPeer(bootnode.enode);
  }
});