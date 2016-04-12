const GETH_BASE_RPCPORT = 22000;
const NUM_GETH_INSTANCES = 5;
var web3Conns = [];
window.web3Conns = web3Conns;

let web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:' +
GETH_BASE_RPCPORT));

web3._extend({
  'property': 'admin',
  'methods':  [],
  properties: [new web3._extend.Property({
    'name':   'peers',
    'getter': 'admin_peers',
  }), new web3._extend.Property({
    'name':   'nodeInfo',
    'getter': 'admin_nodeInfo',
  })],
});

web3Conns.push(web3);

let bootnodePromise = new Promise( function (fufill, reject) {
  web3.admin.getNodeInfo( function (err, nodeInfo) {
    console.log(err);
    fufill(nodeInfo.enode);
  });
});

bootnodePromise.then(function (bootnodes) {
  for(var i = 1; i < NUM_GETH_INSTANCES; i++) {
    let rpcport = GETH_BASE_RPCPORT + i;
    web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:' +
    rpcport));

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

    web3Conns.push(web3);

    console.log('bootnode', bootnodes);
    web3.admin.addPeer(bootnodes);
    console.log("hello");
    web3.admin.getPeers(function (err, peers) {
      console.log(peers);
    });
  }
});

export {web3Conns};