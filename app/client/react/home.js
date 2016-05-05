import React from 'react';
import {mount} from 'react-mounter';
import {EthereumNode} from './EthereumNode.js';

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
  render: function () {
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

          <div id="graph">
            Lorem ipsum dolor sit amet, consectetur
          </div>

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
});

mount(Home);