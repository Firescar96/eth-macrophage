
import {EthereumNetwork} from './EthereumNetwork.js';

//this will be used as the minimum time for a message to be sent over the network
//in graphs and calculations, data will be scaled to this instead of 0
const MINIMUM_NETWORK_TIME = 1;

class Analysis {

  constructor () {
    this.payloadHashFrequency = {};
    this.payloadHashMessages = {};

    let ethereumNodes = EthereumNetwork.getNodeIDs().map((nodeID) => {
      return EthereumNetwork.getNodeByID(nodeID);
    });
    ethereumNodes.forEach((node) => {
      this.payloadHashFrequency[node.nodeID] = {};
      this.payloadHashMessages[node.nodeID] = {};
      node.logFilter(this._update.bind(this));
    });

    EthereumNetwork.nodeFilter((node) => {
      this.payloadHashFrequency[node.nodeID] = {};
      this.payloadHashMessages[node.nodeID] = {};
      node.logFilter(this._update.bind(this));
    });
  }

  _update (targetNode, message) {
    if(!EthereumNetwork.getNodeIDs().includes(message.from)) {
      return;
    }

    if(!this.payloadHashFrequency[targetNode.nodeID][message.payloadHash]) {
      this.payloadHashFrequency[targetNode.nodeID][message.payloadHash] = 1;
    }else {
      this.payloadHashFrequency[targetNode.nodeID][message.payloadHash] += 1;
    }

    if(!this.payloadHashMessages[targetNode.nodeID][message.payloadHash]) {
      this.payloadHashMessages[targetNode.nodeID][message.payloadHash] = [message];
    }else {
      this.payloadHashMessages[targetNode.nodeID][message.payloadHash].push(message);
    }
  }

  getPayloadHashFrequency () {
    return this.payloadHashFrequency;
  }

  // getSortedPayloadHashFrequency () {
  //   let payloadKeys = Object.keys(this.payloadHashFrequency);
  //   payloadKeys.sort((a, b) => {
  //     return this.payloadHashFrequency[b] - this.payloadHashFrequency[a];
  //   });
  //   return payloadKeys.map((key) => {
  //     return {
  //       key:   key,
  //       value: this.payloadHashFrequency[key],
  //     };
  //   });
  // }

  /**
  * Call this to ensure the same order is used everytime
  * @param  {string} nodeID
  * @param  {string} message
  * @return {[json]}         a sorted array of json objects, one for each item
  */
  getSortedPayloadHashMessages (nodeID, message) {
    let payloadItems = this.payloadHashMessages[nodeID][message];
    payloadItems.sort((a, b) => a.from.localeCompare(b.from));

    return payloadItems;
  }

  withEM () {
    let sortedDataByNode = Object.keys(this.payloadHashMessages).map((targetNodeID) => {
      let messageGroups =  Object.keys(this.payloadHashMessages[targetNodeID])
      //filter out messages that haven't been received from all known nodes
      .filter((hash) => {
        let messageSenders = this.payloadHashMessages[targetNodeID][hash]
        .map((message) => message.from);

        return EthereumNetwork.getNodeIDs()
        .filter((nodeID) => nodeID.localeCompare(targetNodeID) !== 0)
        .every((nodeID) => messageSenders.includes(nodeID));
      })
      .map((message) => this.getSortedPayloadHashMessages(targetNodeID, message));

      return {
        nodeID:        targetNodeID,
        messageGroups: messageGroups,
      };
    });

    let nonEmptyDataByNode = sortedDataByNode.filter((data) => {
      return data.messageGroups.length > 0;
    });

    nonEmptyDataByNode.forEach((data) => {
      console.log('running EM for', data.nodeID);

      //input data
      let X = data.messageGroups.map((messageGroup) => {
        return messageGroup.map((message) => {
          return Date.parse(message.time);
        });
      });

      X = X.map((point) => {
        let baselineX = Math.min(...point) - MINIMUM_NETWORK_TIME;
        console.log(point.map((t) => t - baselineX));
        return point.map((t) => t - baselineX);
      });
      //simulated input data
      //let X = [[1, 0.5, 0], [0.5, 1, 0], [1, 2, .2], [0.5, 1, 0], [0.2, 1, 0], [1, 0.2, 0]];

      //helper defnitions
      let n = X.length;
      let d = X[0].length;

      //*these are tunable parameters*
      //initial mixing probability
      let partial = new Array(d).fill(1 / d);
      //posterior probability, the numbers here don't matter
      let pjt = new Array(d).fill(new Array(n).fill(0));
      //number of clusters
      let K = d;

      //cluster defnition parameters, *these can be tuned as desired*
      //the initial mean of the cluster, currently defined as along one axis
      let mus = new Array(d).fill(1).map((mu, i) => {
        mu = new Array(d).fill(1);
        mu[i] = 0;
        return mu;
      });

      //the cluster variance
      let sigmas = new Array(d).fill(0.5);

      for(var i = 0; i < 5; i++) {
        //[pjt] = Analysis.e(X, partial, pjt, mu, sigma);
        [pjt, LL] = Analysis.estep(X, K, mus, partial, sigmas);
        [mus, partial, sigmas] = Analysis.mstep(X, K, mus, partial, sigmas, pjt);
      }
      console.log('pjt', pjt);
      console.log('musig', partial, mus, sigmas);
    });

    return nonEmptyDataByNode;
  }
}

//Uses the log domain to mitigate underflow errors
Analysis.logN = function (x, mu, sigma) {
  let d = x.length;
  let squaredDiff = x.reduce((x0, x1, i1) => {
    return x0 + Math.pow((x1 - mu[i1]), 2);
  }, 0);
  let eExponent = -squaredDiff / (2 * sigma);
  let result = eExponent * Math.log(Math.E) - (d / 2 * Math.log(Math.PI * 2 * sigma));
  return result;
};

//Uses the log domain to mitigate underflow errors
Analysis.estep = function (X, K, Mu, P, Sigma) {
  LL = 0.0; //the LogLikelihood
  let n = X.length;
  let post = [];
  for(let i = 0; i < K; i++) {
    post.push(new Array(n).fill(0));
  }
  /*(function (_post) {
  console.log(n, K, _post);
  })(post);
  */
  X.forEach((x, t) => {
    let likelihoods = [];
    for(let j = 0; j < K; j++) {
      let mu = Mu[j];
      let sigma = Sigma[j];
      let logScaledWeightedDensity = Math.log(P[j]) + Analysis.logN(x, mu, sigma);
      likelihoods.push(logScaledWeightedDensity);
    }
    let densityPrime = Math.max(...likelihoods); //logarithm magic follows
    let eLikelihoods = likelihoods.map((density) => {
      return Math.exp(density - densityPrime);
    });
    let shiftedSum = eLikelihoods.reduce((a, b) => {
      return a + b;
    });
    let likelihoodsum = densityPrime + Math.log(shiftedSum);
    LL += likelihoodsum;

    for(let j = 0; j < K; j++) {
      let mu = Mu[j];
      let sigma = Sigma[j];
      let logScaledWeightedDensity = Math.log(P[j]) + Analysis.logN(x, mu, sigma);
      post[j][t] = Math.exp(logScaledWeightedDensity - likelihoodsum);
    }
  });
  return  [post, LL];
};

Analysis.mstep = function (X, K, Mu, P, Sigma, post, minVariance = 0.00000001) {
  let n = X.length;
  let d = K;

  P.forEach((p, j) => {

    let nj = post[j].reduce((a, b) => {
      return a + b;
    });

    P[j] = nj / n;

    newmu = new Array(d).fill(0);
    newmutotal = [];
    X.forEach((x, t) => {
      x.forEach((x0, i) => {
        newmu[i] += x0 * post[j][t];
      });
      newmutotal.push(post[j][t]);
    });

    console.log('newmu', newmu);
    newmu.forEach((mu, t) => {
      Mu[j][t] = mu / nj;
    });

    let newsigma = 0;
    X.forEach((x, t) => {
      let mu = Mu[j];
      let squaredDiff = x.reduce((x0, x1, i1) => {
        return x0 + Math.pow((x1 - mu[i1]), 2);
      }, 0);
      newsigma += post[j][t] * squaredDiff;
    });
    console.log(newsigma, newsigma / (d * nj) ,Math.max(newsigma / (d * nj), minVariance));
    Sigma[j] = Math.max(newsigma / (d * nj), minVariance);
  });
  return [Mu, P, Sigma];
};

let analysis = new Analysis();


window.Analysis = Analysis;
window.analysis = analysis;
export {analysis};