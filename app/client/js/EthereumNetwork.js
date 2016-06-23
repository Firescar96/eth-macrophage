class EthereumNetwork {}

EthereumNetwork._ip = '127.0.0.1';
//using multiple data structures to store nodeIDs for better lookup
EthereumNetwork._members = {};
EthereumNetwork._nodeIDCollection = new Mongo.Collection('networkMemberIDs');
Meteor.subscribe('networkMemberIDs', () => {
  EthereumNetwork._nodeIDCollection.find().forEach((data) => {
    EthereumNetwork._nodeIDCollection.remove(data._id);
  });
});

EthereumNetwork._defaultBootnode;
EthereumNetwork._currentNonce = 0;

/**
 * sets the ip address of the server to connect to to manage nodes
 * @param {sting} ip
 */
EthereumNetwork.setIP = function (ip) {
  EthereumNetwork._ip = ip;
};

EthereumNetwork.getIP = function () {
  return EthereumNetwork._ip;
};

/**
 * get an array of all node IDs
 * @return {[string]}
 */
EthereumNetwork.getNodeIDs = function () {
  return Object.keys(EthereumNetwork._members);
};

/**
 * get a singular EthereumNode
 * @param  {string} id
 * @return {EthereumNode}
 */
EthereumNetwork.getNodeByID = function (id) {
  return EthereumNetwork._members[id];
};

/**
 * Does the work of creating an EthereumNode and fufils the Promise with
 * the node when complete
 * @return {Promise}
 */
EthereumNetwork.createNode = function (isMiner) {
  let currentNonce = EthereumNetwork._currentNonce++;
  let defer = new Promise((resolve, reject) => {
    let newNode = new EthereumNode(currentNonce);
    Meteor.call('createGethInstance',
    {nonce: currentNonce, isMiner: isMiner},
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

/**
 * @param {EthereumNode} node
 */
EthereumNetwork.addNode = function (node) {
  if(EthereumNetwork._members[node.nodeID]) {
    return;
  }
  EthereumNetwork._members[node.nodeID] = node;
  EthereumNetwork._nodeIDCollection.insert({id: node.nodeID});
};

/**
 * @param {EthereumNode} bootnode
 */
EthereumNetwork.setDefaultBootnode = function (bootnode) {
  EthereumNetwork._defaultBootnode = bootnode;
};

/**
 * @return {EthereumNode}
 */
EthereumNetwork.getDefaultBootnode = function () {
  return EthereumNetwork._defaultBootnode;
};

/**
 * Provide a callback to be invoked whenever a new node is created
 * @param  {Function} callback(theNewNode)
 */
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