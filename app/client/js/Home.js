import React from 'react';
import {networkGraph} from './NetworkGraph.js';
import {messageGraph} from './MessageGraph.js';
import {EthereumNetwork} from './EthereumNetwork.js';
import {analysis} from './Analysis.js';
import {MICROBE, MACROPHAGE, CONNECTION, GODSNODE} from './lib/globals.js';
require('../sass/home.scss');

let headline = (
  <header>
    <h1>Ethereum Macrophage</h1>
    <p>Macrophage is a visual simulation of go-ethereum (geth) node. It is used for 
    research & development. </p> 
  </header>
);

/*eslint-disable no-unused-vars*/
let NodeButton = React.createClass({
/*eslint-enable no-unused-vars*/
  onClick () {
    switch (this.props.role) {
      case MICROBE:
        EthereumNetwork.toggleMicrobe(EthereumNetwork.getNodeByID(this.props.nodeID));
        break;
      case MACROPHAGE:
        EthereumNetwork.toggleMacrophage(EthereumNetwork.getNodeByID(this.props.nodeID));
        break;
      default:
    }
    networkGraph.setSelectedNode(EthereumNetwork.getNodeByID(this.props.nodeID));
  //  this.setState({selected:!this.state.selected});
    this.props.getSelected(this.props.nodeID);
   },
  render () {
    const click = (this.props.selectedId===this.props.nodeID) ? 'active':'nodeReference';
    return (
      <button className={click}
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
      selectorType:    MICROBE,
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
    EthereumNetwork.getSelectedMicrobe().addAllPeers();
  },
  changeSelectorType (event) {
    this.setState({selectorType: event.target.value, shouldUpdateDOM: true});
    networkGraph.setSelectorType(event.target.value);
  },
  sendMessage () {
    let selectedNode = EthereumNetwork.getMicrobe();
    selectedNode.sendTransaction({
      from:  selectedNode.defaultAccount,
      to:    '0x0000000000000000000000000000000000000000',
      value: 1,
    })
    .then(([err, result]) => {
      console.log(result);
      analysis.addMicrobeTxHash(result);
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
  setSelectedID(Id){
    this.setState({selectedID: Id});
  },
  render () {
    let nodeButtons = this.state.peerIDs.map((id) => {
      return (<NodeButton key={id} nodeID={id} role={this.state.selectorType} selectedId={this.state.selectedID} getSelected={this.setSelectedID.bind(this)} />);
    });

    let isNodeSelected = !!EthereumNetwork.getMicrobe();

    return (
      <div>
        {headline}

        <main>
          <div id="nodeSidebar">
          <h2>Nodes list</h2>
          <p>You can select nodes by clicking its ID.</p>
            {nodeButtons}
          </div>

          <div id="graphs">
            <div id="networkGraph"></div>
            <div id="messageGraph"></div>
          </div>

          <div id="actionSidebar">
          <h3>Action Panel</h3>
            <button className="nodeAction" onClick={this.addNode}>
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
              checked={this.state.selectorType.localeCompare(MICROBE) === 0 ? 'checked' : ''}
              onChange={this.changeSelectorType} value={MICROBE}/>
            <label htmlFor="microbeSelector" className="tgl-btn"></label>
            <input id="macrophageSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.selectorType.localeCompare(MACROPHAGE) === 0 ? 'checked' : ''}
              onChange={this.changeSelectorType} value={MACROPHAGE}/>
            <label htmlFor="macrophageSelector" className="tgl-btn"></label>
            <input id="connectionsSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.selectorType.localeCompare(CONNECTION) === 0 ? 'checked' : ''}
              onChange={this.changeSelectorType} value={CONNECTION}/>
            <label htmlFor="connectionsSelector" className="tgl-btn"></label>
            <input id="godsnodeSelector" type="checkbox" className="tgl tgl-flat"
              checked={this.state.selectorType.localeCompare(GODSNODE) === 0 ? 'checked' : ''}
              onChange={this.changeSelectorType} value={GODSNODE}/>
            <label htmlFor="godsnodeSelector" className="tgl-btn"></label>
          </div>
        </main>

      </div>
    );
  },
  componentDidMount () {
    networkGraph.init('#networkGraph', this.forceUpdate.bind(this));
    networkGraph.setSelectorType(MICROBE);
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
