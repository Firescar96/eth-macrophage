import {MACROPHAGE} from './lib/globals.js';

const MaxPeerConnections = 1;

class MacrophageManager {
  constructor () {
    this._macrophages = [];
    this._knownPeersConnections = {};
    //setInterval(pruneDuplicatePeers, 360000)
  }

  toggleMacrophage (_macrophage) {
    if(_macrophage.getRole() === MACROPHAGE) {
      let macrophageIndex = this._macrophages.map((m) => m.nodeID).indexOf(_macrophage.nodeID);
      this._macrophages.splice(macrophageIndex, 1);
      _macrophage.setRole('');
      return;
    }

    this._macrophages.push(_macrophage);
    _macrophage.setRole(MACROPHAGE);
  }

  getMacrophages () {
    return this._macrophages;
  }

  isMacrophage (_macrophage) {
    return this._macrophages.map((m) => m.nodeID).indexOf(_macrophage.nodeID) > -1;
  }

  pruneDuplicatePeers () {
    this._knownPeersConnections = {};

    this._macrophages.forEach((macrophage) => {
      macrophage.getPeers()
      .then(([err, peers]) => {
        peers.forEach((peer) => {
          if(!this._knownPeersConnections[peer.ID]) {
            this._knownPeersConnections[peer.ID] = 0;
          }

          if(this._knownPeersConnections[peer.ID] >= MaxPeerConnections) {
            console.log(macrophage);
            macrophage.removePeer(peer.ID);
            return;
          }

          this._knownPeersConnections[peer.ID] += 1;

        });
      });
    });
  }

}

let macrophageManager = new MacrophageManager();
export {macrophageManager};