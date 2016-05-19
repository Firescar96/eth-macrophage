class EthereumNode {

  constructior () {
    this.web3 = null;
    this.id = '';
    this.members = {};
  }

  initializeConnection (port) {
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

    this.web3 = web3;

    let defer = new Promise( (resolve, reject) => {
      web3.admin.getNodeInfo( (err, nodeInfo) => {
        EthereumNode.members[nodeInfo.id] = this;
        this.id = nodeInfo.id;
        resolve(this);
      });
    });

    return defer;
  }

  getNodeInfo () {
    let defer = new Promise( (fufill, reject) => {
      this.web3.admin.getNodeInfo( function (err, nodeInfo) {
        fufill([err, nodeInfo]);
      });
    });

    return defer;
  }

  addPeer (enode) {
    this.web3.admin.addPeer(enode, ()=>{});
  }

  getPeers () {
    var node = this;
    let defer = new Promise( function (fufill, reject) {
      node.web3.admin.getPeers( function (err, peers) {
        fufill([err, peers]);
      });
    });

    return defer;
  }
}
EthereumNode.members = {};
//TODO: key this by id not port, but atm port is readily available
EthereumNode.getNodeIDs = function () {
  return Object.keys(EthereumNode.members);
};

//TODO: key this by id not port, but atm port is readily available
EthereumNode.getNodeByID = function (id) {
  return EthereumNode.members[id];
};

window.EthereumNode = EthereumNode;
export {EthereumNode};