class EthereumNetwork {}

EthereumNetwork._members = {};
EthereumNetwork._defaultBootnode;
//TODO: key this by id not port, but atm port is readily available
EthereumNetwork.getNodeIDs = function () {
  return Object.keys(EthereumNetwork._members);
};

//TODO: key this by id not port, but atm port is readily available
EthereumNetwork.getNodeByID = function (id) {
  return EthereumNetwork._members[id];
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