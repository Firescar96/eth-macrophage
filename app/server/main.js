import { Meteor } from 'meteor/meteor';

//import levelup from 'levelup';
const spawn = Npm.require('child_process').spawn;
const exec = Npm.require('child_process').exec;
//const NUM_GETH_INSTANCES = 5;
const GETH_BASE_PORT = 21000;
const GETH_BASE_RPCPORT = 22000;
const GETH_BASE_DATADIR = '/tmp/eth-macrophage/';

let curInstanceNonce = 0;

exec('mkdir ' + GETH_BASE_DATADIR);
var web3Conns = [];

//base configuration for a geth instance
var gethInstanceConfig = {
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

function createGethInstance () {
  //use a lock on this whole function and curInstanceNonce
  gethInstanceConfig.port = GETH_BASE_PORT + curInstanceNonce;
  gethInstanceConfig.rpcport = GETH_BASE_RPCPORT + curInstanceNonce;
  gethInstanceConfig.datadir = GETH_BASE_DATADIR + 'node' + curInstanceNonce;
  curInstanceNonce++;
  exec('mkdir ' + gethInstanceConfig.datadir);

  cmd = spawn('geth', ['--datadir=' + gethInstanceConfig.datadir, '--logfile=' +
  gethInstanceConfig.logfile, '--port=' + gethInstanceConfig.port, '--rpc', '--rpcport=' +
  gethInstanceConfig.rpcport, '--rpcaddr=' + gethInstanceConfig.rpcaddr, '--rpcapi=' +
  gethInstanceConfig.rpcapi, '--networkid=' + gethInstanceConfig.networkid,
  '--rpccorsdomain=' + gethInstanceConfig.rpccorsdomain, '--minerthreads=' +
  gethInstanceConfig.minerthreads, '--genesis=' + gethInstanceConfig.genesis, '--password='
  + gethInstanceConfig.password, '--bootnodes=' + gethInstanceConfig.bootnodes]);

  //For some reason geth flips the out and err output
  cmd.stdout.on('data', (data) => {
    console.error(data.toString());
  });
  cmd.stderr.on('data', (err) => {
    console.log(err.toString());
  });

  web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:' +
  gethInstanceConfig.rpcport));
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
}

/*for(var i = 0; i < NUM_GETH_INSTANCES; i++) {
createGethInstance();
}*/

Meteor.methods({
  createGethInstance ({nonce}) {
    if(nonce >= curInstanceNonce) {
      createGethInstance();
      return GETH_BASE_RPCPORT + curInstanceNonce;
    }
    console.log(nonce);
    return GETH_BASE_RPCPORT + nonce;
  },
});