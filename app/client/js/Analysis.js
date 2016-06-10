import {EthereumNetwork} from './EthereumNetwork.js';

class Analysis {}

Analysis.init = function () {
  this.payloadHashFrequency = {};

  let ethereumNodes = EthereumNetwork.getNodeIDs().map((nodeID) => {
    return EthereumNetwork.getNodeByID(nodeID);
  });
  ethereumNodes.forEach((node) => {
    node.logFilter(this._updatePayloadHashFrequency.bind(this));
  });

  EthereumNetwork.nodeFilter((node) => {
    node.logFilter(this._updatePayloadHashFrequency.bind(this));
  });
};
Analysis.init();

Analysis._updatePayloadHashFrequency = function (targetNode, message) {
  if(!EthereumNetwork.getNodeIDs().includes(message.from)) {
    return;
  }

  if(!this.payloadHashFrequency[message.payloadHash]) {
    this.payloadHashFrequency[message.payloadHash] = 1;
  }else {
    this.payloadHashFrequency[message.payloadHash] += 1;
  }
};

Analysis.getPayloadHashFrequency = function () {
  return this.payloadHashFrequency;
};

Analysis.getSortedPayloadHashFrequency = function () {
  let payloadKeys = Object.keys(this.payloadHashFrequency);
  payloadKeys.sort((a, b) => {
    return this.payloadHashFrequency[b] - this.payloadHashFrequency[a];
  });
  return payloadKeys.map((key) => {
    return {
      key:   key,
      value: this.payloadHashFrequency[key],
    };
  });
};

window.Analysis = Analysis;
export {Analysis};