class EthereumNetwork {}

// const GETH_BASE_RPCPORT = 22000;

EthereumNetwork._members = {};
EthereumNetwork._defaultBootnode;
EthereumNetwork._currentNonce = 0;
//TODO: key this by id not port, but atm port is readily available
EthereumNetwork.getNodeIDs = function () {
  return Object.keys(EthereumNetwork._members);
};

//TODO: key this by id not port, but atm port is readily available
EthereumNetwork.getNodeByID = function (id) {
  return EthereumNetwork._members[id];
};

EthereumNetwork.createNode = function () {
  //TODO put this increment in a lock
  let currentNonce = EthereumNetwork._currentNonce++;
  console.log(EthereumNetwork._currentNonce);
  let defer = new Promise((resolve, reject) => {
    var newNode = new EthereumNode();
    Meteor.call('createGethInstance',
    {nonce: currentNonce},
    (err, rpcport) => {
      if(err) {
        console.error(err);
      }else {
        newNode.initializeConnection(rpcport)
        .then( () => {
          EthereumNetwork.addNode(newNode);
          resolve(newNode);
        });
      }
    });
  });

  return defer;
};

EthereumNetwork.addNode = function (node) {
  EthereumNetwork._members[node.id] = node;
};

EthereumNetwork.setDefaultBootnode = function (bootnode) {
  EthereumNetwork._defaultBootnode = bootnode;
};
EthereumNetwork.getDefaultBootnode = function (bootnode) {
  return EthereumNetwork._defaultBootnode;
};

window.EthereumNetwork = EthereumNetwork;
export {EthereumNetwork};