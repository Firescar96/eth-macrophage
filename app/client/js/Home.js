import React from 'react';
import {NetworkGraph} from './NetworkGraph.js';
import {MessageGraph} from './MessageGraph.js';

let navbar = (
  <nav>
    <h1>Ethereum Macrophage</h1>
  </nav>
);

//TODO: suppress this warning
let NodeButton = React.createClass({
  onClick () {
    this.props.getNetworkGraph().setSelectedNode(this.props.nodeID);
  },
  render () {
    return (
      <button className="nodeReference"
        onClick={this.onClick}>
        {this.props.nodeID.substring(0, 10)}
      </button>
    );
  },
});

var Home = React.createClass({
  getInitialState () {
    return {
      peerIDs:         EthereumNetwork.getNodeIDs(),
      shouldUpdateDOM: true,
    };
  },
  getNetworkGraph () {
    return this.state.networkGraph;
  },
  componentWillMount () {
    let updateNodes = function () {
      let nodeIDs = EthereumNetwork.getNodeIDs();
      let existsDifferentNode = this.state.peerIDs
      .some((v, i) => v.localeCompare(nodeIDs[i]) !== 0);
      if(this.state.peerIDs.length != nodeIDs.length || existsDifferentNode) {
        this.setState({peerIDs: nodeIDs, shouldUpdateDOM: true});
      }else {
        this.setState({peerIDs: nodeIDs, shouldUpdateDOM: false});
      }

      this.updateGraphData();
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
          return {'source': newNode.nodeID, 'target': peer.nodeID};
        }));

        this.state.networkGraph.updateGraphData(graphData);
      });
    });
  },
  addAllPeers () {
    this.state.networkGraph.getSelectedNode().addAllPeers();
  },
  sendMessage () {
    let selectedNode = this.state.networkGraph.getSelectedNode();
    selectedNode.sendTransaction({
      from:  selectedNode.defaultAccount,
      to:    '0x0000000000000000000000000000000000000000',
      value: 1,
    });
  },
  shouldComponentUpdate (nextProps, nextState) {
    return nextState.shouldUpdateDOM;
  },
  render () {
    let nodeButtons = this.state.peerIDs.map((id) => {
      return (<NodeButton key={id} nodeID={id} getNetworkGraph={this.getNetworkGraph}/>);
    });

    let isNodeSelected = this.state.networkGraph && !!this.state.networkGraph.getSelectedNode();

    return (
      <div>
        {navbar}

        <main>
          <div id="nodeSidebar">
            {nodeButtons}
          </div>

          <div id="networkGraph" style={{display: 'none'}}></div>
          <div id="messageGraph"></div>

          <div id="actionSidebar">
            <button className="nodeAction" onClick={this.addNode}>
              add node
            </button>
            <button className="nodeAction" disabled>
              remove node
            </button>
            <button className="nodeAction" onClick={this.addAllPeers} disabled={!isNodeSelected}>
              connect to peers
            </button>
            <button className="nodeAction" onClick={this.sendMessage} disabled={!isNodeSelected}>
              send message
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
      networkGraph:    new NetworkGraph('#networkGraph', graphData, this.forceUpdate.bind(this)),
      messageGraph:    new MessageGraph('#messageGraph', [], this.forceUpdate.bind(this)),
      shouldUpdateDOM: false,
    });
    this.updateGraphData();
  },
  updateGraphData () {
    let ethereumNodes = this.state.peerIDs.map((nodeID) => {
      return EthereumNetwork.getNodeByID(nodeID);
    });

    var getPeersPromises = ethereumNodes.map((node) => {
      return new Promise((fufill, reject1) => {
        node.getPeers().then(([err, peers]) => {
          fufill(peers.map((peer) => {
            return {'source': node.nodeID, 'target': peer.nodeID};
          }));
        });
      });
    });

    Promise.all(getPeersPromises).then((peerLinks) => {
      let graphData = {};
      graphData.nodes = this.state.peerIDs;
      graphData.links = [].concat.apply([], peerLinks);
      this.state.networkGraph.updateGraphData(graphData);
    });
  }
});

export {Home};