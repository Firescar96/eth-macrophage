
import {EthereumNetwork} from './EthereumNetwork.js';

//this will be used as the minimum time for a message to be sent over the network
//in graphs and calculations, data will be scaled to this instead of 0
const MINIMUM_NETWORK_TIME = 1;

class Analysis {

  constructor () {
    this.txHashFrequency = {};
    this.txHashMessages = {};

    EthereumNetwork.getNodeIDs().map((nodeID) => {
      return EthereumNetwork.getNodeByID(nodeID);
    })
    .forEach((node) => {
      this.txHashFrequency[node.nodeID] = {};
      this.txHashMessages[node.nodeID] = {};
      node.txFilter(this._update.bind(this));
    });

    EthereumNetwork.nodeFilter((node) => {
      this.txHashFrequency[node.nodeID] = {};
      this.txHashMessages[node.nodeID] = {};
      node.txFilter(this._update.bind(this));
    });
  }

  _update (targetNode, message) {
    if(!EthereumNetwork.getNodeIDs().includes(message.from)) {
      return;
    }

    if(!this.txHashFrequency[targetNode.nodeID][message.txHash]) {
      this.txHashFrequency[targetNode.nodeID][message.txHash] = 1;
    }else {
      this.txHashFrequency[targetNode.nodeID][message.txHash] += 1;
    }

    if(!this.txHashMessages[targetNode.nodeID][message.txHash]) {
      this.txHashMessages[targetNode.nodeID][message.txHash] = [message];
    }else {
      this.txHashMessages[targetNode.nodeID][message.txHash].push(message);
    }
  }

  reset () {
    Object.keys(this.txHashFrequency).forEach((nodeID) => {
      this.txHashFrequency[nodeID] = {};
    });
    Object.keys(this.txHashMessages).forEach((nodeID) => {
      this.txHashMessages[nodeID] = {};
    });

    EthereumNetwork.getNodeIDs().map((nodeID) => {
      return EthereumNetwork.getNodeByID(nodeID);
    })
    .forEach((node) => {
      node.TxData.find().fetch().forEach((tx) => {
        node.TxData.remove(tx._id);
      });
    });
  }

  getPayloadHashFrequency () {
    return this.txHashFrequency;
  }

  //function needs to be updaed to new maps
  /*getSortedPayloadHashFrequency () {
  let payloadKeys = Object.keys(this.txHashFrequency);
  payloadKeys.sort((a, b) => {
  return this.txHashFrequency[b] - this.txHashFrequency[a];
  });
  return payloadKeys.map((key) => {
  return {
  key:   key,
  value: this.txHashFrequency[key],
  };
  });
  }*/

  /**
  * Call this to ensure the same order is used everytime
  * @param  {string} nodeID
  * @param  {string} message
  * @return {[json]}         a sorted array of json objects, one for each item
  */
  getSortedPayloadHashMessages (nodeID, message) {
    let items = this.txHashMessages[nodeID][message];
    items.sort((a, b) => a.from.localeCompare(b.from));

    return items;
  }

  withEM () {
    //it's very important to be able to handle missing data to work with
    //sorted data
    let sortedNodeIDs = EthereumNetwork.getNodeIDs().sort();

    let sortedDataByNode = Object.keys(this.txHashMessages).map((targetNodeID) => {
      let messageGroups =  Object.keys(this.txHashMessages[targetNodeID])
      //filter out messages that haven't been received from all known nodes
      .filter((hash) => {
        return sortedNodeIDs
        .filter((nodeID) => nodeID.localeCompare(targetNodeID) !== 0);
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

    let posteriorProbabilities = nonEmptyDataByNode.map((data) => {
      console.log('running EM for', data.nodeID);

      //input data
      let X = data.messageGroups.map((messageGroup) => {
        return sortedNodeIDs.map((nodeID) => {
          let time = null;
          messageGroup.forEach((message) => {
            if(message.from.localeCompare(nodeID) === 0) {
              time = Date.parse(message.time);
            }
          });
          return time;
        });
      });

      //TODO: evaluate whether it's okay to normalize all the points
      //independently in this way
      X = X.map((point) => {
        let baselineX = Math.min(...point.filter((p) => p)) - MINIMUM_NETWORK_TIME;
        return point.map((t) => {
          return t ? t - baselineX : null;
        });
      });
      console.log(X);
      //simulated input data
      //let X = [[1, 0.5, 0], [0.5, 1, 0], [1, 2, .2], [0.5, 1, 0], [0.2, 1, 0], [1, 0.2, 0]];

      //helper defnitions
      let n = X.length;
      let d = sortedNodeIDs.length;

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
        mu = new Array(d).fill(500);
        mu[i] = 0;
        return mu;
      });

      //the cluster variance
      let sigmas = new Array(d).fill(0.5);

      let LL = 0.0;
      let oldLL = 1.0;  //the LogLikelihood

      while(Math.abs(LL - oldLL) > (Math.pow(10, -6) * Math.abs(LL))) {
        oldLL = LL;
        //[pjt] = Analysis.e(X, partial, pjt, mu, sigma);
        [pjt, LL] = Analysis.estep(X, K, mus, partial, sigmas);
        [mus, partial, sigmas] = Analysis.mstep(X, K, mus, partial, sigmas, pjt);
      }
      console.log('pjt', pjt);
      console.log('musig', partial, mus, sigmas);

      let assignmentClusters = new Array(n).fill(0);
      pjt.forEach((jt, j) => {
        jt.forEach((prob, i) => {
          assignmentClusters[i] = prob > pjt[assignmentClusters[i]][i] ? j : assignmentClusters[i];
        });
      });

      let assignments = assignmentClusters.map((cluster, i) => {
        return {
          creator: sortedNodeIDs[cluster],
          hash:    data.messageGroups[i][0].txHash,
        };
      });

      return assignments;
    });



    return posteriorProbabilities;
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

  X.forEach((x, t) => {
    let delta = x.map((x0) => x0 ? 1 : 0);
    x = x.filter((x0, e) => delta[e] == 1);

    let likelihoods = [];
    for(let j = 0; j < K; j++) {
      let mu = Mu[j].filter((x0, e) => delta[e] == 1);
      let sigma = Sigma[j];
      let logScaledWeightedDensity = Math.log(P[j]) + Analysis.logN(x, mu, sigma);
      likelihoods.push(logScaledWeightedDensity);
    }
    let densityPrime = Math.max(...likelihoods); //logarithm magic follows
    let eLikelihoods = likelihoods.map((density) => Math.exp(density - densityPrime));
    let shiftedSum = eLikelihoods.reduce((a, b) => a + b);
    let likelihoodsum = densityPrime + Math.log(shiftedSum);
    LL += likelihoodsum;

    for(let j = 0; j < K; j++) {
      let mu = Mu[j].filter((x0, e) => delta[e] == 1);
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

    let nj = post[j].reduce((a, b) => a + b);

    P[j] = nj / n;

    let newmu = new Array(n).fill(1).map((mu, i) => {
      return new Array(d).fill(0);
    });
    let newmutotal = [];
    X.forEach((x, t) => {
      let delta = x.map((x0) => x0 ? 1 : 0);
      x.forEach((x0, i) => {
        newmu[t][i] += delta[i] * x0 * post[j][t];
      });
      newmutotal = newmutotal.map((mu, i) => delta[i] * post[j][t]);
    });

    newmutotal.forEach((total, t) => {
      Mu[j][t] = newmu[t].map((mu, i) => mu / total);
    });

    let newsigma = 0;
    let newsigmatotal = 0;
    X.forEach((x, t) => {
      let delta = x.map((x0) => x0 ? 1 : 0);
      x = x.map((x0, e) => {
        return x0 ? x0 * delta[e] : delta[e];
      });
      let mu = Mu[j].map((x0, e) => x0 * delta[e]);
      let squaredDiff = x.reduce((x0, x1, i1) => {
        return x0 + Math.pow((x1 - mu[i1]), 2);
      }, 0);

      newsigma += post[j][t] * squaredDiff;
      let deltasize = delta.filter((e) => e !== 0).length;
      newsigmatotal += deltasize * post[j][t];
    });
    Sigma[j] = Math.max(newsigma / newsigmatotal || minVariance, minVariance);
  });
  return [Mu, P, Sigma];
};

let analysis = new Analysis();


window.Analysis = Analysis;
window.analysis = analysis;
export {analysis};