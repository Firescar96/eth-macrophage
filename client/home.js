import React from 'react';
import {mount} from 'react-mounter';
import {web3Conns} from  './eth-macrophage.js';

var Home = React.createClass({
  getInitialState () {
    return {
      peerIDs: [],
    };
  },
  componentWillMount () {
    var thisReact = this;
    web3Conns[0].admin.getPeers(function (err, peers) {
      thisReact.setState({peerIDs: peers.map( (peer) => peer.id ) });
    });
  },
  render: function () {
    // console.log(this.state.peerIDs);

    var peersP = this.state.peerIDs.map( (id) => {
      return (<p key={id}> {id}</p>);
    });
    // console.log(peersP);
    return (
      <div>
        {peersP}
      </div>
    );
  },
});

mount(Home);