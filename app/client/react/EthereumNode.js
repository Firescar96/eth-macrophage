function EthereumNode (web3) {
  this.web3 = web3;
}

EthereumNode.members = {};

EthereumNode.create = function (port) {
  let web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:' + port));
  web3._extend({
    'property': 'admin',
    'methods':  [],
    properties: [new web3._extend.Property({
      'name':   'peers',
      'getter': 'admin_peers',
    }), new web3._extend.Property({
      'name':   'nodeInfo',
      'getter': 'admin_nodeInfo',
    }), new web3._extend.Method({
      'name':   'addPeer',
      'call':   'admin_addPeer',
      'params': 1,
    })],
  });

  let newNode = new EthereumNode(web3);
  web3.admin.getNodeInfo( function (err, nodeInfo) {
    EthereumNode.members[nodeInfo.id] = newNode;
  });

  return newNode;
};

//TODO: key this by id not port, but atm port is readily available
EthereumNode.getNodeIDs = function () {
  return Object.keys(EthereumNode.members);
};

//TODO: key this by id not port, but atm port is readily available
EthereumNode.getNodeByID = function (id) {
  return this.members[id];
};

EthereumNode.prototype.getNodeInfo = function () {
  var node = this;
  let defer = new Promise( function (fufill, reject) {
    node.web3.admin.getNodeInfo( function (err, nodeInfo) {
      fufill([err, nodeInfo]);
    });
  });

  return defer;
};

EthereumNode.prototype.addPeer = function (enode) {
  this.web3.admin.addPeer(enode);
};

EthereumNode.prototype.getPeers = function () {
  var node = this;
  let defer = new Promise( function (fufill, reject) {
    node.web3.admin.getPeers( function (err, peers) {
      fufill([err, peers]);
    });
  });

  return defer;
};

export {EthereumNode};