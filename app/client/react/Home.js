import React from 'react';
import {EthereumNode} from './EthereumNode.js';
import {NetworkGraph} from './NetworkGraph.js';

let navbar = (
  <nav>
  <h1>Ethereum Macrophage</h1>
  </nav>
);

//TODO: suppress this warning
let NodeButton = React.createClass({
  render () {
    return (
      <button className="nodeReference">
      {this.props.id.substring(0, 10)}
      </button>
    );
  },
});

var Home = React.createClass({
  getInitialState () {
    return {
      peerIDs:      [],
      networkGraph: null,
    };
  },
  componentWillMount () {
    var self = this;
    let updateNodes = function () {
      self.setState({peerIDs: EthereumNetwork.getNodeIDs() });
    };
    setTimeout(updateNodes, 1000);
  },
  addNode () {
    console.log("hool");
  },
  render () {
    let nodeButtons = this.state.peerIDs.map( (id) => {
      return (
        <NodeButton key={id} id={id} />
      );
    });

    return (
      <div>
      {navbar}

      <main>
      <div id="nodeSidebar">
      {nodeButtons}
      </div>

      <div id="graph"></div>

      <div id="actionSidebar">
      <button className="nodeAction" onClick={this.addNode}>
      add Node
      </button>
      <button className="nodeAction">
      remove Node
      </button>
      </div>
      </main>

      </div>
    );
  },
  componentDidMount () {
    d3.json('data/call_me_al.json', function (json) {
      //return new Network('#graph', json);
    });
    let graphData = {};
    graphData.nodes = EthereumNetwork.getNodeIDs().map((nodeID) => {
      return EthereumNetwork.getNodeByID(nodeID);
    });
    graphData.links = [];
    new Promise((fufill, reject) => {
      var getPeersPromises = graphData.nodes.map((node) => {
        return new Promise((fufill2, reject1) => {
          node.getPeers().then(([err, peers]) => {
            graphData.links.push(...peers.map((peer) => {
              return {'source': node.id, 'target': peer.id};
            }));
            //TODO: rewrite this section more cleanly if possible
            fufill2();
          });
        });
      });

      Promise.all(getPeersPromises).then( () => {
        fufill();
      });
    })
    .then(() => {
      this.networkGraph = new NetworkGraph('#graph', graphData);
    });
  },
});

export {Home};