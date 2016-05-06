import React from 'react';
import {mount} from 'react-mounter';
import {EthereumNode} from './EthereumNode.js';
import {Network} from './Network.js'

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
    var self = this;
    let updateNodes = function () {
      self.setState({peerIDs: EthereumNode.getNodeIDs() });
    };
    setTimeout(updateNodes, 1000);
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
            <button className="nodeAction">
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
      return new Network('#graph', json);
    });
  },
});

mount(Home);