exports = module.exports = function (server) {
  const spawn = require('child_process').spawn;
  const exec = require('child_process').exec;
  const tailStream = require('tail-stream');
  const WebSocketServer = require('ws').Server;
  const wss = new WebSocketServer({ server: server });
  const GETH_BASE_PORT = 23000;
  const GETH_BASE_RPCPORT = 24000;
  function getUserHome () {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  }
  const GETH_BASE_DATADIR = getUserHome() + '/.ethereum/';
  const ASSETS_BASE_DATADIR = process.cwd() + '/private/';
  const MAX_GETH_INSTANCES = 4;

  //tracks how many instances have been created so far
  let usedNonces = {};

  //contains the log Collections for all the nodes
  let txData = {};

  exec('mkdir ' + GETH_BASE_DATADIR);
  //base configuration for a geth instance
  var gethConfig = {
    datadir:       GETH_BASE_DATADIR,
    genesis:       ASSETS_BASE_DATADIR + 'genesis.json',
    js:            ASSETS_BASE_DATADIR + 'periodicmine.js',
    logfile:       'log.log',
    minerthreads:  1,
    maxpeers:      25,
    networkid:     2,
    password:      ASSETS_BASE_DATADIR + 'password',
    port:          GETH_BASE_PORT,
    rpc:           true,
    rpcport:       GETH_BASE_RPCPORT,
    rpcaddr:       '0.0.0.0',
    rpcapi:        'admin,web3,eth,net',
    rpccorsdomain: '"http://127.0.0.1:4000,http://localhost:4000,http://40.77.56.231:4000"',
    testnet:       true,
    fast:          true,
  };

  /**
  * creates a new geth node and increments the curNonceState
  * @return undefined
  */
  function createGethInstance (isMiner, nonce) {
    let curNonce = nonce;
    //need an instance so the callback below will use this version and not changes
    let gethInstanceConfig = {};
    for(let attr in gethConfig) {
      if(gethConfig.hasOwnProperty(attr)) gethInstanceConfig[attr] = gethConfig[attr];
    }

    gethInstanceConfig.port = GETH_BASE_PORT + curNonce;
    gethInstanceConfig.rpcport = GETH_BASE_RPCPORT + curNonce;
    gethInstanceConfig.datadir = GETH_BASE_DATADIR + 'node' + curNonce + '/';
    gethInstanceConfig.logfile = gethInstanceConfig.datadir + 'output.log';
    gethInstanceConfig.js = ASSETS_BASE_DATADIR  + isMiner ? 'pendmine.js' : 'periodicmine.js';

    //this database is used on the client to get this node's received txs
    //
    txData[curNonce] = [];
    wss.on('connection', function connection (conn) {
      txData[curNonce].push(conn);
      conn.on('close', function (code, reason) {
        console.log(conn.host + ' Connection closed: ' + reason);
      });

      conn.on('error', (err) => {
        //the client disappeared, and that's ok
        //this should be an ETIMEDOUT error
      });
    });

    //TODO: turn this callback into a promise
    exec('mkdir ' + gethInstanceConfig.datadir);
    exec('touch ' + gethInstanceConfig.logfile, () => {
      console.log(gethInstanceConfig.logfile);
      let logStream = tailStream.createReadStream(gethInstanceConfig.logfile, {});
      logStream.on('data', (data) => {
        let messages = /\{.*\}/.exec(data);
        if(!!messages && messages.length == 1) {
          let message = JSON.parse(messages[0]);
          if(message.txHash) {
            let returnObj = {flag: 'txData', nonce: curNonce, data: message};
            wss.clients.forEach((client) => {
              client.send(JSON.stringify(returnObj), () => {});
            });
          }
        }
      });
    });

    exec('geth --datadir=' + gethInstanceConfig.datadir + ' --testnet --password=' +
    gethInstanceConfig.password + ' account new', function () {
      //exec('geth --datadir=' + gethInstanceConfig.datadir +
      //' init ' + gethInstanceConfig.genesis, () => {

      let cmd = spawn('geth', ['--datadir=' + gethInstanceConfig.datadir,
      '--port=' + gethInstanceConfig.port, '--rpc', '--logfile=' + gethInstanceConfig.logfile,
      '--rpcport=' + gethInstanceConfig.rpcport, '--rpcaddr=' + gethInstanceConfig.rpcaddr,
      '--rpcapi=' + gethInstanceConfig.rpcapi, '--networkid=' + gethInstanceConfig.networkid,
      '--rpccorsdomain=' + gethInstanceConfig.rpccorsdomain, '--unlock=0',
      '--password=' + gethInstanceConfig.password, '--testnet', '--fast',
      '--maxpeers=' + gethInstanceConfig.maxpeers, 'js ' + gethInstanceConfig.js]);

      //For some reason geth flips the out and err output..or something
      cmd.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      cmd.stderr.on('data', (err) => {
        console.error(err.toString());
      });
    });

    usedNonces[nonce] = true;
  }

  wss.on('connection', function connection (ws) {
    ws.on('message', function incoming (data) {
      console.log('received: %s', data);
      data = JSON.parse(data);
      switch (data.flag) {
        case 'createGethInstance':
          var nonce = data.nonce;
          var isMiner = data.isMiner;
          if(nonce >= MAX_GETH_INSTANCES) {
            let returnObj = {
              flag:        'createGethInstance',
              uniqueIdent: data.uniqueIdent,
              err:         'number of instances exceeded',
            };
            ws.send(JSON.stringify(returnObj));
          }

          if(!usedNonces[nonce]) {
            createGethInstance(isMiner, nonce);
          }
          let returnObj = {
            flag:        'createGethInstance',
            uniqueIdent: data.uniqueIdent,
            err:         null,
            rpcport:     GETH_BASE_RPCPORT + nonce,
          };
          ws.send(JSON.stringify(returnObj));
          break;
        case 'clearTxData':
          var nonce = data.nonce;
          //   //TODO: save txData so the client can get it when they reconnect
          //   //txData[nonce].remove({});
          break;
        default:
      }
    });
  });
};
