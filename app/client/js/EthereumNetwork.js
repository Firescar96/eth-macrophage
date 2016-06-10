class EthereumNetwork {}

EthereumNetwork._members = {};
EthereumNetwork._nodeIDCollection = new Mongo.Collection('networkMemberIDs');
Meteor.subscribe('networkMemberIDs', () => {
  EthereumNetwork._nodeIDCollection.find().forEach((data) => {
    EthereumNetwork._nodeIDCollection.remove(data._id);
  });
});

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
  let defer = new Promise((resolve, reject) => {
    let newNode = new EthereumNode(currentNonce);
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
  if(EthereumNetwork._members[node.nodeID]) {
    return;
  }
  EthereumNetwork._members[node.nodeID] = node;
  EthereumNetwork._nodeIDCollection.insert({id: node.nodeID});
};

EthereumNetwork.setDefaultBootnode = function (bootnode) {
  EthereumNetwork._defaultBootnode = bootnode;
};
EthereumNetwork.getDefaultBootnode = function (bootnode) {
  return EthereumNetwork._defaultBootnode;
};

EthereumNetwork.nodeFilter = function (callback) {
  EthereumNetwork._nodeIDCollection.find().observeChanges({
    added: (id, data) => {
      let ethereumNode = EthereumNetwork.getNodeByID(data.id);
      if(ethereumNode) {
        callback(ethereumNode);
      }
    },
  });
};

window.EthereumNetwork = EthereumNetwork;
export {EthereumNetwork};