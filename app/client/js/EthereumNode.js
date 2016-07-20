import {EthereumNetwork} from './EthereumNetwork.js';

class EthereumNode {

  //TODO: for some reason using constructor doesn't work with nodejs
  constructor (id, serverIP, serverPort) {
    this.id = id;
    this._serverIP = serverIP;
    this._serverPort = serverPort;
    this._txFilterCallbacks = [];
    this._wsCallbacks = [];
    this._ws = new WebSocket('ws:' + this._serverIP + ':' + this._serverPort);
    this._ws.onopen = () => {}; //WebSocket might break without this line
    this._ws.onmessage = (data) => {
      data = JSON.parse(data.data);
      switch (data.flag) {
        case 'txData':
          this._txFilterCallbacks.forEach((callback) => {
            callback(this, data);
          });
          break;
        default:
          if(this._wsCallbacks[data.uniqueIdent]) {
            this._wsCallbacks[data.uniqueIdent](this, data);
            this._wsCallbacks.splice(data.uniqueIdent, 1);
          }
      }
    };
    this.web3 = null;
    this.nodeID = '';
    this.filter = null;
    this.defaultAccount = null;
    this._role = '';
  }

  getServerURL () {
    return 'http://' + this._serverIP + ':' + this._serverPort;
  }

  setRole (_role) {
    this._role = _role;
  }

  getRole () {
    return this._role;
  }

  callWS (data, callback) {
    data.uniqueIdent = this._wsCallbacks.length;
    if(callback) {
      this._wsCallbacks.push(callback);
    }
    let waitForInit = setInterval(
      () => {
        if(this._ws && this._ws.readyState) {
          clearInterval(waitForInit);
          this._ws.send(JSON.stringify(data));
        }
      },
      500
    );
  }

  /**
  * use this function to establish a connection for a node to web3,
  * when the connection is established the promise if fufilled
  * @param  {int} port
  * @return {Promise}
  */
  initializeConnection (port) {
    let web3 = new Web3(new Web3.providers.HttpProvider('http://' +
    this._serverIP + ':' + port));
    web3._extend({
      'property': 'admin',
      'methods':  [new web3._extend.Method({
        'name':   'addPeer',
        'call':   'admin_addPeer',
        'params': 1,
      }),
      new web3._extend.Method({
        'name':   'removePeer',
        'call':   'admin_removePeer',
        'params': 1,
      }),
      new web3._extend.Method({
        'name': 'findMorePeers',
        'call': 'admin_findMorePeers',
      }) ],
      properties: [new web3._extend.Property({
        'name':   'peers',
        'getter': 'admin_peers',
      }),
      new web3._extend.Property({
        'name':   'nodeInfo',
        'getter': 'admin_nodeInfo',
      }) ],
    });

    this.web3 = web3;

    let defer = new Promise( (resolve, reject) => {
      let nodeInfoTimer = setInterval(() => {
        this.getListening()
        .then( ([err, connected]) => {
          if(connected) {
            clearInterval(nodeInfoTimer);
            return this.getNodeInfo();
          }

          return Promise.reject('node is not connected');
        })
        .then(([err, nodeInfo]) => {
          this.nodeID = nodeInfo.id;
          return this.getAccounts();
        })
        .then(([err, accounts]) => {
          this.defaultAccount = accounts[0];
          resolve(this);
        });
      }, 1000);
    });

    this.filter = this.web3.eth.filter('pending');

    return defer;
  }

  getListening () {
    let defer = new Promise((resolve, reject) => {
      this.web3.net.getListening( (err, listening) => {
        resolve([err, listening]);
      });
    });

    return defer;
  }

  getNodeInfo () {
    let defer = new Promise( (fufill, reject) => {
      this.web3.admin.getNodeInfo(function (err, nodeInfo) {
        fufill([err, nodeInfo]);
      });
    });

    return defer;
  }

  getAccounts () {
    let defer = new Promise( (fufill, reject) => {
      this.web3.eth.getAccounts(function (err, accounts) {
        fufill([err, accounts]);
      });
    });

    return defer;
  }

  /*Adds a peer node. If no node is given adds the bootnode*/
  addPeer (nodeID) {
    nodeID = nodeID || EthereumNetwork.getDefaultBootnode().nodeID;
    let defer = new Promise( (fufill, reject) => {
      this.web3.admin.addPeer(nodeID, (err, result)=>{
        fufill();
      });
    });
    return defer;
  }

  /*Adds all the peers that have been created so far*/
  addAllPeers () {
    let addPeerPromises = [];

    EthereumNetwork.getNodeIDs().forEach((nodeID) => {
      let node = EthereumNetwork.getNodeByID(nodeID);
      let defer  = new Promise( (fufill, reject) => {
        node.getNodeInfo().then(([err, nodeInfo]) => {

          this.addPeer(nodeInfo.id).then(() => fufill());
        });
      });
      addPeerPromises.push(defer);
    });

    let defer = new Promise( (fufill, reject) => {
      Promise.all(addPeerPromises).then( () => {
        fufill();
      });
    });
    return defer;
  }

  /*Removes a peer node. If no node is given adds the bootnode*/
  removePeer (node) {
    node = node || EthereumNetwork.getDefaultBootnode();
    let defer = new Promise( (fufill, reject) => {
      node.getNodeInfo().then(([err, nodeInfo]) => {
        this.web3.admin.removePeer(nodeInfo.enode, ()=>{
          fufill();
        });
      });
    });
    return defer;
  }

  getPeers () {
    let defer = new Promise( (fufill, reject) => {
      this.web3.admin.getPeers( function (err, peers) {
        fufill([err, peers]);
      });
    });

    return defer;
  }

  sendTransaction (txObj) {
    let defer = new Promise( (fufill, reject) => {
      this.web3.eth.sendTransaction(txObj, (err, result) => {
        fufill([err, result]);
      });
    });

    return defer;
  }

  /**
  * use this to setup a callback to listen for new transactions
  * @param  {Function} callback(this, theData)
  */
  txFilter (callback) {
    this._txFilterCallbacks.push(callback);
  }
}

//window.EthereumNode = EthereumNode
export {EthereumNode};
