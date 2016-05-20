import React from 'react';
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
    return {peerIDs: [], updateDOM: true};
  },
  componentWillMount () {
    let updateNodes = function () {
      let nodeIDs = EthereumNetwork.getNodeIDs();

      let sameIDs = this.state.peerIDs.every((v, i) => v === nodeIDs[i]);
      if(this.state.peerIDs.length !== nodeIDs.length || !sameIDs) {
        this.setState({peerIDs: nodeIDs, updateDOM: true});
      }
    };
    setInterval(updateNodes.bind(this), 1000);
  },
  addNode () {
    EthereumNetwork.createNode().then((newNode) => {
      newNode.addPeer();
      let graphData = {};
      graphData.nodes = [newNode];
      graphData.links = [];
      newNode.getPeers().then(([err, peers]) => {
        graphData.links.push(...peers.map((peer) => {
          return {'source': newNode.id, 'target': peer.id};
        }));
          console.log(peers);

        this.state.networkGraph.addGraphData(graphData);
        this.setState({peerIDs: EthereumNetwork.getNodeIDs(), updateDOM: false});
      });
    });
  },
  shouldComponentUpdate (nextProps, nextState) {
    return nextState.updateDOM;
  },
  render () {
    let nodeButtons = this.state.peerIDs.map((id) => {
      return (<NodeButton key={id} id={id}/>);
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
            <button className="nodeAction" disabled>
              remove Node
            </button>
          </div>
        </main>

      </div>
    );
  },
  componentDidMount () {
    let graphData = {};
    graphData.nodes = [];
    graphData.links = [];
    this.setState({
      networkGraph: new NetworkGraph('#graph', graphData),
      updateDOM:    false,
    });
    this.componentDidUpdate();
  },
  componentDidUpdate () {
    let graphData = {};
    graphData.nodes = EthereumNetwork.getNodeIDs().map((nodeID) => {
      return EthereumNetwork.getNodeByID(nodeID);
    });
    graphData.links = [];

    var getPeersPromises = graphData.nodes.map((node) => {
      return new Promise((fufill, reject1) => {
        node.getPeers().then(([err, peers]) => {
          graphData.links.push(...peers.map((peer) => {
            return {'source': node.id, 'target': peer.id};
          }));
          fufill();
        });
      });
    });

    Promise.all(getPeersPromises).then(() => {
      this.state.networkGraph.updateGraphData(graphData);
    });

  },
});

export {Home};