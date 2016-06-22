import React from 'react';
import {networkGraph} from './NetworkGraph.js';
import {messageGraph} from './MessageGraph.js';
import {analysis} from './Analysis.js';

const MICROBE = 'microbe';
const MACROPHAGE = 'macrophage';

let navbar = (
  <nav>
    <h1>Ethereum Macrophage</h1>
  </nav>
);

//TODO: suppress this warning
let NodeButton = React.createClass({
  onClick () {
    networkGraph.setSelectedNode(EthereumNetwork.getNodeByID(this.props.nodeID));
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
      role:                         MICROBE,
    };
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

      this.updateNetworkGraphData();
    };
    setInterval(updateNodes.bind(this), 1000);
  },
  addNode () {
    EthereumNetwork.createNode(false).then((newNode) => {
      newNode.addPeer();
      let graphData = {};
      graphData.nodes = [newNode];
      graphData.links = [];
      newNode.getPeers().then(([err, peers]) => {
        graphData.links.push(...peers.map((peer) => {
          return {'source': newNode.nodeID, 'target': peer.nodeID};
        }));

        networkGraph.updateGraphData(graphData);
      });
    });
  },
  addAllPeers () {
    networkGraph.getSelectedMicrobe().addAllPeers();
  },
  changeRole (event) {
    if(event.target.checked) {
      this.setState({role: MACROPHAGE, shouldUpdateDOM: true});
      networkGraph.setSelectedRole(MACROPHAGE);
    }else {
      this.setState({role: MICROBE, shouldUpdateDOM: true});
      networkGraph.setSelectedRole(MICROBE);
    }
  },
  sendMessage () {
    let selectedNode = networkGraph.getSelectedMicrobe();
    selectedNode.sendTransaction({
      from:  selectedNode.defaultAccount,
      to:    '0x0000000000000000000000000000000000000000',
      value: 1,
    });
  },
  runEMAnalysis () {
    messageGraph.updateData(analysis.withEM());
  },
  shouldComponentUpdate (nextProps, nextState) {
    return nextState.shouldUpdateDOM;
  },
  render () {
    let nodeButtons = this.state.peerIDs.map((id) => {
      return (<NodeButton key={id} nodeID={id}/>);
    });

    let isNodeSelected = !!networkGraph.getSelectedMicrobe();

    return (
      <div>
        {navbar}

        <main>
          <div id="nodeSidebar">
            {nodeButtons}
            <input id="roleSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.role.localeCompare(MACROPHAGE) === 0 ? 'checked' : ''}
              onChange={this.changeRole}/>
            <label htmlFor="roleSelector" className="tgl-btn"></label>
          </div>

          <div id="graphs">
            <div id="networkGraph"></div>
            <div id="messageGraph"></div>
          </div>

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
            <button className="nodeAction" onClick={this.runEMAnalysis}>
              run EM analysis
            </button>
          </div>
        </main>

      </div>
    );
  },
  componentDidMount () {
    networkGraph.init('#networkGraph', this.forceUpdate.bind(this));
    messageGraph.init('#messageGraph', this.forceUpdate.bind(this));
    this.setState({
      shouldUpdateDOM: false,
    });
    this.updateNetworkGraphData();
  },
  updateNetworkGraphData () {
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
      networkGraph.updateGraphData(graphData);
    });
  }
});

export {Home};