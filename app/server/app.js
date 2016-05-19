//import levelup from 'levelup';
const spawn = Npm.require('child_process').spawn;
const exec = Npm.require('child_process').exec;
const NUM_GETH_INSTANCES = 5;
const GETH_BASE_PORT = 21000;
const GETH_BASE_RPCPORT = 22000;
const GETH_BASE_DATADIR = '/tmp/eth-macrophage/';

exec('mkdir ' + GETH_BASE_DATADIR);
var web3Conns = [];

//base configuration for a geth instance
var gethInstance = {
  datadir:       GETH_BASE_DATADIR,
  logfile:       'log.log',
  port:          GETH_BASE_PORT,
  rpc:           true,
  rpcport:       GETH_BASE_RPCPORT,
  rpcaddr:       '127.0.0.1',
  rpcapi:        'admin,web3',
  networkid:     35742222,
  rpccorsdomain: 'http://127.0.0.1:3000',
  minerthreads:  1,
  genesis:       Assets.absoluteFilePath('genesis.json'),
  password:      Assets.absoluteFilePath('password'),
  bootnodes:     '',
};

for(var i = 0; i < NUM_GETH_INSTANCES; i++) {
  gethInstance.port = GETH_BASE_PORT + i;
  gethInstance.rpcport = GETH_BASE_RPCPORT + i;
  gethInstance.datadir = GETH_BASE_DATADIR + 'node' + i;
  exec('mkdir ' + gethInstance.datadir);

  cmd = spawn('geth', ['--datadir=' + gethInstance.datadir, '--logfile=' +
  gethInstance.logfile, '--port=' + gethInstance.port, '--rpc', '--rpcport=' +
  gethInstance.rpcport, '--rpcaddr=' + gethInstance.rpcaddr, '--rpcapi=' +
  gethInstance.rpcapi, '--networkid=' + gethInstance.networkid,
  '--rpccorsdomain=' + gethInstance.rpccorsdomain, '--minerthreads=' +
  gethInstance.minerthreads, '--genesis=' + gethInstance.genesis, '--password='
  + gethInstance.password, '--bootnodes=' + gethInstance.bootnodes]);

  cmd.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  cmd.stderr.on('data', (err) => {
    console.error(err.toString());
  });

  web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:' +
  gethInstance.rpcport));
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

  this.web3.admin.getNodeInfo( function (err, nodeInfo) {
    console.log(nodeInfo.id);
  });
}
