import React from 'react';
import {networkGraph} from './NetworkGraph.js';
import {messageGraph} from './MessageGraph.js';
import {analysis} from './Analysis.js';

const MICROBE = 'microbe';
const MACROPHAGE = 'macrophage';
const CONNECTION = 'connections';
const GODSNODE = 'godsnode';

let navbar = (
  <nav>
    <h1>Ethereum Macrophage</h1>
  </nav>
);

/*eslint-disable no-unused-vars*/
let NodeButton = React.createClass({
/*eslint-enable no-unused-vars*/
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
      role:            MICROBE,
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
    });
  },
  addAllPeers () {
    networkGraph.getSelectedMicrobe().addAllPeers();
  },
  changeRole (event) {
    this.setState({role: event.target.value, shouldUpdateDOM: true});
    networkGraph.setSelectedRole(event.target.value);
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
  resetAnalysis () {
    analysis.reset();
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
          </div>

          <div id="graphs">
            <div id="networkGraph"></div>
            <div id="messageGraph"></div>
          </div>

          <div id="actionSidebar">
            <button className="nodeAction" onClick={this.addNode} disabled>
              add node
            </button>
            <button className="nodeAction" disabled>
              remove node
            </button>
            <button className="nodeAction" onClick={this.addAllPeers} disabled={!isNodeSelected}>
              connect to all peers
            </button>
            <button className="nodeAction" onClick={this.sendMessage} disabled={!isNodeSelected}>
              send message
            </button>
            <button className="nodeAction" onClick={this.runEMAnalysis}>
              run EM analysis
            </button>
            <button className="nodeAction" onClick={this.resetAnalysis}>
              reset analysis
            </button>
            <input id="microbeSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.role.localeCompare(MICROBE) === 0 ? 'checked' : ''}
              onChange={this.changeRole} value={MICROBE}/>
            <label htmlFor="microbeSelector" className="tgl-btn"></label>
            <input id="macrophageSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.role.localeCompare(MACROPHAGE) === 0 ? 'checked' : ''}
              onChange={this.changeRole} value={MACROPHAGE}/>
            <label htmlFor="macrophageSelector" className="tgl-btn"></label>
            <input id="connectionsSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.role.localeCompare(CONNECTION) === 0 ? 'checked' : ''}
              onChange={this.changeRole} value={CONNECTION}/>
            <label htmlFor="connectionsSelector" className="tgl-btn"></label>
            <input id="godsnodeSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.role.localeCompare(GODSNODE) === 0 ? 'checked' : ''}
              onChange={this.changeRole} value={GODSNODE}/>
            <label htmlFor="godsnodeSelector" className="tgl-btn"></label>
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
          fufill(
            peers.filter((peer) => this.state.peerIDs.includes(peer.id))
            .map((peer) => {
              return {'source': node.nodeID, 'target': peer.id};
            })
          );
        });
      });
    });

    Promise.all(getPeersPromises).then((peerLinks) => {
      let graphData = {};
      graphData.nodes = this.state.peerIDs;
      graphData.links = [].concat.apply([], peerLinks);
      networkGraph.upsertGraphData(graphData);
    });
  },
});

export {Home};