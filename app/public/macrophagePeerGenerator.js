for(let i = 0; i < 20; i++) {
let hexSpace = new BigNumber(new Array(129).join('f'),16).times(Math.round(Math.random()*Math.pow(10,15))/Math.pow(10,15)).round(0).toString(16);
let pad = new Array(129).join('0')
hexSpace = pad.substring(0, pad.length - hexSpace.length) + hexSpace
EthereumNetwork.getNodeByID(EthereumNetwork.getNodeIDs()[1]).web3.admin.addPeer(hexSpace);
}

microbe2 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:24001'));

analysis.addMicrobeTxHash(microbe2.eth.sendTransaction({
      from:  microbe2.eth.accounts[0],
      to:    '0x0000000000000000000000000000000000000000',
      value: 1,
    }))

microbe2._extend({
      'property': 'admin',
      'methods':  [],
      properties: [new microbe2._extend.Property({
        'name':   'peers',
        'getter': 'admin_peers',
      }), new microbe2._extend.Property({
        'name':   'nodeInfo',
        'getter': 'admin_nodeInfo',
      }), new microbe2._extend.Method({
        'name':   'addPeer',
        'call':   'admin_addPeer',
        'params': 1,
      }), new microbe2._extend.Method({
        'name':   'removePeer',
        'call':   'admin_removePeer',
        'params': 1,
      })],
    });

