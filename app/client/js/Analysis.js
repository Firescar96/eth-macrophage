import {EthereumNetwork} from './EthereumNetwork.js';
require('./lib/lib.js');

//this will be used as the minimum time for a message to be sent over the network
//in graphs and calculations, data will be scaled to this instead of 0
const MINIMUM_NETWORK_TIME = 1;
const PROB_THRESHOLD = 0.00001;
const INIT_EM_MEAN = 1.01;
const INIT_EM_VARIANCE = 0.00000001;

/**
*This class constains all the function available to do an Eth-Macrophage
*analysis on the EthereumNetwork
*/
class Analysis {

  constructor () {
    this.txHashFrequency = {};
    this.txHashMessages = {};
    this._networkNodeIDs = {};
    this._microbeTxHashes = [];

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

  _update (targetNode, data) {
    let message = data.data;
    this._networkNodeIDs[message.from] = true;

    if(!this.txHashMessages[targetNode.nodeID][message.txHash]) {
      this.txHashMessages[targetNode.nodeID][message.txHash] = [message];
    }else {
      let alreadyReceived = this.txHashMessages[targetNode.nodeID][message.txHash]
      .some((m) => m.from.localeCompare(message.from) == 0);
      if(alreadyReceived) {
        return;
      }
      this.txHashMessages[targetNode.nodeID][message.txHash].push(message);
    }

    if(!this.txHashFrequency[targetNode.nodeID][message.txHash]) {
      this.txHashFrequency[targetNode.nodeID][message.txHash] = 1;
    }else {
      this.txHashFrequency[targetNode.nodeID][message.txHash] += 1;
    }
  }

  /**
  * reset (clear) the storage maps and the collection of txs
  */
  reset () {
    this._microbeTxHashes = [];
    this._networkNodeIDs = {};

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
      node.callWS({flag: 'clearTxData', nonce: node.id});
    });
  }

  getPayloadHashFrequency () {
    return this.txHashFrequency;
  }

  addMicrobeTxHash (hash) {
    this._microbeTxHashes.push(hash);
  }

  /**
  * run the Expectation Maximization Algorithm
  * @return {json} nested array of message assignments, one for each node in the
  * EthereumNetwork
  */
  withEM () {
    //it's very important to be able to handle missing data to work with
    //sorted data.
    let sortedAllNodeIDs = Object.keys(this._networkNodeIDs).sort();
    let macrophageNodeIDs = EthereumNetwork.getMacrophages().map((node) => node.nodeID);
    let allNodeIDs = EthereumNetwork.getNodeIDs();
    let evaluateNodeIDs = macrophageNodeIDs.length > 0 ? macrophageNodeIDs : allNodeIDs;
    window.sortedAllNodeIDs = sortedAllNodeIDs;
    let probabilityAssignments =
    evaluateNodeIDs.map((targetNodeID) => {
      let messageGroups =  Object.keys(this.txHashMessages[targetNodeID])
      //only look at messages that were related to the microbe
      .filter((hash) => this._microbeTxHashes.includes(hash))
      .map((hash) => {
        return this.txHashMessages[targetNodeID][hash]
        //filter out messages that were sent by an evaluating node
        .filter((message) => {
          return evaluateNodeIDs.every((macNodeID) => {
            return macNodeID.localeCompare(message.from) !== 0;
          });
        })
        .sort((a, b) => a.from.localeCompare(b.from));
      })
      //the algorithm will break without filtering out empty message groups
      .filter((messsageGroup) => messsageGroup.length > 0);

      return {
        nodeID:        targetNodeID,
        messageGroups: messageGroups,
      };
    })
    //it's no use computing on non existent data
    .filter((data) => {
      return data.messageGroups.length > 0;
    })
    .map((data) => {
      //input data converted from the messages into numbers
      let X = data.messageGroups.map((messageGroup) => {
        return sortedAllNodeIDs.map((nodeID) => {
          let time = null;
          messageGroup.forEach((message) => {
            if(message.from.localeCompare(nodeID) === 0) {
              let milliSeconds = Date.parse(message.time).toString();
              let nanoSeconds = milliSeconds
              .substr(7, milliSeconds.length - 10) +
              message.time.match(/\d*/g)[12].rpad('0', 9);
              time =  parseInt(nanoSeconds);
            }
          });
          return time;
        });
      });

      //TODO: evaluate whether it's okay to normalize all the points
      //independently in this way, try other normalization functions

      ////normalize points down to the MINIMUM_NETWORK_TIME
      X = X.map((point) => {
        let baselineX = Math.max(Math.min(...point.filter((p) => p)), MINIMUM_NETWORK_TIME);
        return point.map((t) => t ? (t / baselineX) : null);
      });

      let pjt = Analysis.runEM(X);

      //flatten the assignments if they are greater than the threshold
      let assignments = [];
      pjt.forEach((jt, j) => {
        jt.forEach((prob, i) => {
          if(prob < PROB_THRESHOLD) {
            return;
          }

          if(!this._microbeTxHashes.includes(data.messageGroups[i][0].txHash)) {
            return;
          }

          assignments.push({
            assignor: data.nodeID,
            creator:  sortedAllNodeIDs[j],
            hash:     data.messageGroups[i][0].txHash,
            prob:     prob,
          });
        });
      });

      return assignments;
    });

    return probabilityAssignments;
  }

}

Analysis.runEM = function (X) {
  window.X = X;
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
  let mus = new Array(d).fill(1).map((m, i) => {
    let mu = new Array(d).fill(INIT_EM_MEAN);
    mu[i] = 1;
    return mu;
  });

  //the cluster variance
  let sigmas = new Array(d).fill(INIT_EM_VARIANCE);

  //the LogLikelihood
  let LL = 0.0;
  let oldLL = 1.0;

  while(Math.abs(LL - oldLL) > (Math.pow(10, -4) * Math.abs(LL))) {
    oldLL = LL;
    //[pjt] = Analysis.e(X, partial, pjt, mu, sigma);
    [pjt, LL] = Analysis.estep(X, K, mus, partial, sigmas);
    [mus, partial, sigmas] = Analysis.mstep(X, K, mus, partial, sigmas, pjt);
  }

  return pjt;
};

/**
* Expectation Maximization likelihood calculator,
* uses the log domain to mitigate underflow errors
* *Note: sigma must be non zero
* @param  {[float]} x     one row of input data
* @param  {[float]} mu    the average mean for one cluster
* @param  {float} sigma the variance for one cluster
* @return {float}       a single value estimate
*/
Analysis.logN = function (x, mu, sigma) {
  let d = x.length;
  let squaredDiff = x.reduce((x0, x1, i1) => {
    return x1 ? x0 + Math.pow((x1 - mu[i1]), 2) : x0;
  }, 0);
  let eExponent = -squaredDiff / (2 * sigma);
  let result = eExponent * Math.log(Math.E) - (d / 2 * Math.log(Math.PI * 2 * sigma));
  return result;
};

/**
* Expectation Maximization e step, uses the log domain to mitigate underflow errors
* @param  {[[float]]} X    2d array of input values, each row is a d dimensional array
* @param  {int} K          number of clusters to estimate with
* @param  {[[float]]} Mu     Kx1 dimensional array of means for each cluster
* @param  {[float]} P      Kx1 array of mixing proportions for each cluster
* @param  {[float]} Sigma  Kxd array of variances for each cluster
* @return {[[float], float]} returns the new posterior probabilities and mixing proportions
*/
Analysis.estep = function (X, K, Mu, P, Sigma) {
  let LL = 0.0; //the LogLikelihood
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

/**
* [mstep description]
* @param  {[[float]]} X      2d array of input values, each row is a d dimensional array
* @param  {int} K            number of clusters to estimate with
* @param  {[[float]]} Mu     Kxd dimensional array of means for each cluster
* @param  {[float]} P        Kx1 array of mixing proportions for each cluster
* @param  {[float]} Sigma    Kx1 array of variances for each cluster
* @param  {[[float]]} post   posterior probabilities for each cluster
* @param  {float} minVariance = 0.00000001       minimum variance allowed (non zero)
* @return {[[[float]], [float], [float]]}        return [Mu, P, Sigma]
*/
Analysis.mstep = function (X, K, Mu, P, Sigma, post, minVariance = 0.00000001) {
  let n = X.length;
  let d = X[0].length;

  P.forEach((p, j) => {

    let nj = post[j].reduce((a, b) => a + b);

    P[j] = nj / n;

    let newmu = new Array(d).fill(0);
    let newmutotal = new Array(d).fill(0);

    X.forEach((x, t) => {
      let delta = x.map((x0) => x0 ? 1 : 0);
      x.forEach((x0, i) => {
        newmu[t] += delta[i] * x0 * post[j][t];
        newmutotal[t] += delta[i] * post[j][t];
      });
    });
    newmutotal.forEach((total, i) => {
      Mu[j][i] = total > 0 ? newmu[i] / total : Mu[j][i];
    });

    let newsigma = 0;
    let newsigmatotal = 0;
    X.forEach((x, t) => {
      let delta = x.map((x0) => x0 ? 1 : 0);

      let mu = Mu[j].map((x0, e) => x0 * delta[e]);
      let squaredDiff = x.reduce((x0, x1, i1) => {
        return x1 ? x0 + Math.pow((x1 - mu[i1]), 2) : x0;
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
