import React from 'react';
import {mount} from 'react-mounter';
import {EthereumNode} from './EthereumNode.js';

const GETH_BASE_RPCPORT = 22000;

let navbar = (
  <nav>
    <h1>Ethereum Macrophage</h1>
  </nav>
);

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
      peerIDs: [],
    };
  },
  componentWillMount () {
    var thisReact = this;
    EthereumNode.getNodeByPort(GETH_BASE_RPCPORT).getPeers().then(function ([, peers]) {
      thisReact.setState({peerIDs: peers.map( (peer) => peer.id ) });
    });

  },
  render: function () {
    let nodeButtons = this.state.peerIDs.map( (id) => {
      return (
        <NodeButton key={id} id={id} />
      );
    });
    //console.log(peersP);
    return (
      <div>
        {navbar}
        {nodeButtons}
      </div>
    );
  },
});

mount(Home);