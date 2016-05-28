import { Meteor } from 'meteor/meteor';

//import levelup from 'levelup';
const spawn = Npm.require('child_process').spawn;
const exec = Npm.require('child_process').exec;
//const NUM_GETH_INSTANCES = 5;
const GETH_BASE_PORT = 21000;
const GETH_BASE_RPCPORT = 22000;
const GETH_BASE_DATADIR = '/tmp/eth-macrophage/';

let curNonce = 0;

exec('mkdir ' + GETH_BASE_DATADIR);

//base configuration for a geth instance
var gethConfig = {
  datadir:       GETH_BASE_DATADIR,
  logfile:       'log.log',
  port:          GETH_BASE_PORT,
  rpc:           true,
  rpcport:       GETH_BASE_RPCPORT,
  rpcaddr:       '127.0.0.1',
  rpcapi:        'admin,web3,eth,net',
  networkid:     35742222,
  rpccorsdomain: 'http://127.0.0.1:3000',
  minerthreads:  1,
  genesis:       Assets.absoluteFilePath('genesis.json'),
  password:      Assets.absoluteFilePath('password'),
  bootnodes:     '',
};

function createGethInstance () {
  //need an instance so the callback below will use this version and not changes
  let gethInstanceConfig = {};
  for(let attr in gethConfig) {
    if(gethConfig.hasOwnProperty(attr)) gethInstanceConfig[attr] = gethConfig[attr];
  }

  gethInstanceConfig.port = GETH_BASE_PORT + curNonce;
  gethInstanceConfig.rpcport = GETH_BASE_RPCPORT + curNonce;
  gethInstanceConfig.datadir = GETH_BASE_DATADIR + 'node' + curNonce;
  exec('mkdir ' + gethInstanceConfig.datadir);
  exec('geth --datadir ' + gethInstanceConfig.datadir + ' --password ' +
  gethInstanceConfig.password + ' account new', () => {

    let cmd = spawn('geth', ['--datadir=' + gethInstanceConfig.datadir, '--logfile=' +
    gethInstanceConfig.logfile, '--port=' + gethInstanceConfig.port, '--rpc', '--rpcport=' +
    gethInstanceConfig.rpcport, '--rpcaddr=' + gethInstanceConfig.rpcaddr, '--rpcapi=' +
    gethInstanceConfig.rpcapi, '--networkid=' + gethInstanceConfig.networkid,
    '--rpccorsdomain=' + gethInstanceConfig .rpccorsdomain, '--minerthreads=' +
    gethInstanceConfig.minerthreads, '--genesis=' + gethInstanceConfig.genesis, '--unlock=0',
    '--password=' + gethInstanceConfig.password, '--bootnodes=' + gethInstanceConfig.bootnodes,
    'js', Assets.absoluteFilePath('mine.js')]);

    //For some reason geth flips the out and err output..or something
    cmd.stdout.on('data', (data) => {
      console.error(data.toString());
    });
    cmd.stderr.on('data', (err) => {
      console.log(err.toString());
    });
  });

  curNonce++;
}

Meteor.methods({
  createGethInstance ({nonce}) {
    console.log('entry', curNonce);
    if(nonce >= curNonce) {
      createGethInstance();
      console.log('exit', curNonce);
      return GETH_BASE_RPCPORT + (curNonce - 1);
    }
    console.log(nonce);
    return GETH_BASE_RPCPORT + nonce;
  },
});