import React from 'react';
import {networkGraph} from './NetworkGraph.js';
import {messageGraph} from './MessageGraph.js';
import {EthereumNetwork} from './EthereumNetwork.js';
import {analysis} from './Analysis.js';
import {MICROBE, MACROPHAGE, CONNECTION, GODSNODE, DEFAULT_ADDR} from './lib/globals.js';
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
    switch (this.props.getSelectorType()) {
      case MICROBE:
        EthereumNetwork.toggleMicrobe(EthereumNetwork.getNodeByID(this.props.nodeID));
        break;
      case MACROPHAGE:
        EthereumNetwork.toggleMacrophage(EthereumNetwork.getNodeByID(this.props.nodeID));
        break;
      default:
    }
    this.props.updateDOM();
  },
  render () {
    let node = EthereumNetwork.getNodeByID(this.props.nodeID);
    return (
      <button className={'nodeReference ' + node.getRole()}
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
    EthereumNetwork.createNode(false, DEFAULT_ADDR.ip, DEFAULT_ADDR.port);
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
      if(err) {
        console.error(err);
        return;
      }
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
  updateDOM () {
    this.setState({shouldUpdateDOM: true});
  },
  getSelectorType () {
    return this.state.selectorType;
  },
  render () {
    let nodeButtons = this.state.peerIDs.map((id) => {
      return (<NodeButton key={id} nodeID={id} getSelectorType={this.getSelectorType}
        updateDOM={this.updateDOM} />);
    });

    let isNodeSelected = !!EthereumNetwork.getMicrobe();

    return (
      <div>
        {headline}

        <main>
          <div id="networkDashboard">
            <div id="nodeSidebar">
              <h2>Nodes list</h2>
              {nodeButtons}
            </div>

            <div id="networkGraph"></div>

            <div id="actionSidebar">
             <h2>Action Panel</h2>
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
          </div>
          <div id="messageGraph"></div>
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
