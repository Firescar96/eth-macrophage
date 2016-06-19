
import {EthereumNetwork} from './EthereumNetwork.js';

//this will be used as the minimum time for a message to be sent over the network
//in graphs and calculations, data will be scaled to this instead of 0
const MINIMUM_NETWORK_TIME = 1;

/**
*This class constains all the function available to do an Eth-Macrophage
*analysis on the EthereumNetwork
*/
class Analysis {

  constructor () {
    this.networkGraph = null;
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
  setNetworkGraph (graph) {
    this.networkGraph = graph;
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

  /**
  * reset (clear) the storage maps and the collection of txs
  */
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

  /**
  * Call this to ensure the same order of messages is used everytime
  * @param  {string} nodeID
  * @param  {string} message
  * @return {[json]}         a sorted array of json objects, one for each message
  */
 /*
  getSortedTxHashMessages (nodeID, hash) {
    let items = this.txHashMessages[nodeID][hash];
    items.sort((a, b) => a.from.localeCompare(b.from));

    return items;
  }*/

  /**
  * run the Expectation Maximization Algorithm
  * @return {json} nested array of message assignments, one for each node in the
  * EthereumNetwork
  */
  withEM () {
    //it's very important to be able to handle missing data to work with
    //sorted data.
    let sortedAllNodeIDs = EthereumNetwork.getNodeIDs().sort();
    let macrophageNodeIDs = this.networkGraph.getSelectedMacrophages().map((node) => node.nodeID);

    let posteriorProbabilities = Object.keys(this.txHashMessages).map((targetNodeID) => {
      let messageGroups =  Object.keys(this.txHashMessages[targetNodeID])
      //filter out messages that were sent to a macrophage
      .map((hash) => {
        return this.txHashMessages[targetNodeID][hash]
        .filter((message) => {
          return macrophageNodeIDs.every((macNodeID) => {
            return macNodeID.localeCompare(message.from) !== 0;
          });
        })
        .sort((a, b) => a.from.localeCompare(b.from));
      })
      //the algorithm will break without filtering out empty message groups
      .filter((messsageGroup) => messsageGroup.length);

      return {
        nodeID:        targetNodeID,
        messageGroups: messageGroups,
      };
    })
    //it's no use computing on non existent data
    .filter((data) => {
      return data.messageGroups.length > 0;
    })
    //after cleaning the data into a computable format, let's do some computation
    .map((data) => {
      //console.log('running EM for', data.nodeID);

      //input data converted from the messages into numbers
      let X = data.messageGroups.map((messageGroup) => {
        return sortedAllNodeIDs.map((nodeID) => {
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
      //independently in this way, try other normalization functions
      ////normalize points down to the MINIMUM_NETWORK_TIME
      X = X.map((point) => {
        let baselineX = Math.min(...point.filter((p) => p)) - MINIMUM_NETWORK_TIME;
        return point.map((t) => {
          return t ? t / baselineX : null;
        });
      });
      //simulated input data
      //let X = [[1, 0.5, 0], [0.5, 1, 0], [1, 2, .2], [0.5, 1, 0], [0.2, 1, 0], [1, 0.2, 0]];

      //helper defnitions
      let n = X.length;
      let d = sortedAllNodeIDs.length;

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

      //the LogLikelihood
      let LL = 0.0;
      let oldLL = 1.0;

      while(Math.abs(LL - oldLL) > (Math.pow(10, -4) * Math.abs(LL))) {
        oldLL = LL;
        //[pjt] = Analysis.e(X, partial, pjt, mu, sigma);
        [pjt, LL] = Analysis.estep(X, K, mus, partial, sigmas);
        [mus, partial, sigmas] = Analysis.mstep(X, K, mus, partial, sigmas, pjt);
      }
      //console.log('pjt', pjt);
      //console.log('musig', partial, mus, sigmas);

      //find the softmax of the assignments
      //removed in favor of sending all the data
      /*let assignmentClusters = new Array(n).fill(0);
      pjt.forEach((jt, j) => {
      jt.forEach((prob, i) => {
      assignmentClusters[i] = prob > pjt[assignmentClusters[i]][i] ? j : assignmentClusters[i];
      });
      });*/

      let assignments = [];
      pjt.forEach((jt, j) => {
        jt.forEach((prob, i) => {
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



    return posteriorProbabilities;
  }
}

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
    return x0 + Math.pow((x1 - mu[i1]), 2);
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