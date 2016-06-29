import {EthereumNetwork} from './EthereumNetwork.js';

const MICROBE = 'microbe';
const MACROPHAGE = 'macrophage';
const CONNECTION = 'connections';
const GODSNODE = 'godsnode';

let networkGraph;

class NetworkGraph {
  /*
  selection: html element in which to inset the graph
  data: JSON object of the graph data
  updateDOM: function that will triger updates to the containing DOM
  */
  constructor () {
    this.width = 660;
    this.height = 500;
    this.curLinksData = [];
    this.curNodesData = [];
    this._selectedMicrobe = null;
    this._selectedMacrophages = [];
    this._selectedConnection = null;
    this._selectedGodsnode = null;
    this._selectedRole = MICROBE;
    this.graphData = {nodes: [], links: []};
  }

  init (selection, updateDOM) {
    this._updateDOM = updateDOM;
    let vis = d3.select(selection)
    .append('svg').attr('width', this.width)
    .attr('height', this.height);
    this.linksG = vis.append('g').attr('id', 'links');
    this.nodesG = vis.append('g').attr('id', 'nodes');
    this.messagesG = vis.append('g').attr('id', 'messages');
    vis
    .on('click', () => {
      networkGraph.linksG.selectAll('line.mouselink').remove();
      //TODO: investigate if the following line is actually deleting the unfinished connections
      //or whethere they are just becoming broken lines in the svg
      this._selectedConnection = null;
      $('#networkGraph').unbind('mousemove');
      this._selectedGodsnode = null;
      this._updateDOM();
    });
    this.force = d3.layout.force()
    .size([this.width, this.height])
    .charge(-1000)
    .linkDistance(100)
    .on('tick', this._forceTick.bind(this));
    this._update();
  }

  _forceTick (e) {
    let node = this.nodesG.selectAll('circle.node').data(this.curNodesData, function (d) {
      return d.nodeID;
    });

    node
    .attr('cx', (d) => { return d.x; })
    .attr('cy', (d) => { return d.y; });

    let link = this.linksG.selectAll('line.link').data(this.curLinksData, function (d) {
      return d.source.nodeID + '_' + d.target.nodeID;
    });

    link
    .attr('x1', (d) => { return d.source.x; })
    .attr('y1', (d) => { return d.source.y; })
    .attr('x2', (d) => { return d.target.x; })
    .attr('y2', (d) => { return d.target.y; });
  }

  _messageListener (targetNode, message) {
    if(!EthereumNetwork.getNodeIDs().includes(message.from)) {
      return;
    }
    this.linksG.selectAll('line.link')
    .filter((d) => {
      let hasSource1 = d.source.nodeID.localeCompare(targetNode.nodeID) === 0;
      let hasTarget1 = d.target.nodeID.localeCompare(message.from) === 0;
      let hasSource2 = d.source.nodeID.localeCompare(message.from) === 0;
      let hasTarget2 = d.target.nodeID.localeCompare(targetNode.nodeID) === 0;
      return (hasSource1 && hasTarget1) || (hasSource2 && hasTarget2);
    }).call((ds) => {
      if(ds.empty()) {
        return;
      }
      this.messagesG
      .append('circle')
      .attr('class', 'message')
      .attr('cx', (d) => { return EthereumNetwork.getNodeByID(message.from).x; })
      .attr('cy', (d) => { return EthereumNetwork.getNodeByID(message.from).y; })
      .attr('r', (d) => { return 10; })
      .style('stroke-width', 1.0)
      .transition()
      .duration(4000)
      .attrTween('cx', function (d, i, a) {
        return function (t) {
          let cx0 = EthereumNetwork.getNodeByID(message.from).x;
          let cx1 = targetNode.x;
          let terpolater = d3.interpolateRound(cx0, cx1);
          return terpolater(t);
        };
      })
      .attrTween('cy', function (d, i, a) {
        return function (t) {
          let cy0 = EthereumNetwork.getNodeByID(message.from).y;
          let cy1 = targetNode.y;
          let terpolater = d3.interpolateRound(cy0, cy1);
          return terpolater(t);
        };
      })
      .attr('r', (d) => { return 20; })
      .attr('fill', '#5066a1')
      .remove();
    });
  }

  _updateNodes () {
    let node = this.nodesG.selectAll('circle.node')
    .data(this.curNodesData, function (d) {
      return d.nodeID;
    });

    node.enter()
    .call((d) => {
      if(d[0].length > 0) {
        d3.selectAll(d[0]).data().forEach( (ethereumNode) => {
          ethereumNode.txFilter(this._messageListener.bind(this));
        });
      }
    })
    .append('circle')
    .attr('class', 'node')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => d.r)
    //.style('fill', (d) => { return this.nodeColors(d.artist); })
    //.style('stroke', (d) => { return this._strokeFor(d); })
    .style('stroke-width', 1.0)
    .on('mouseup', function (d) {
      if(networkGraph._selectedRole.localeCompare(GODSNODE) === 0) {
        $('#networkGraph').unbind('mousemove');
        d3.event.stopPropagation();
      }
    })
    .on('click', (d) => {
      this.setSelectedNode(d);
    });
    //this.node.on('mouseover', showDetails).on('mouseout', hideDetails);
    node.exit().remove();
  }

  _updateLinks () {
    let link = this.linksG.selectAll('line.link').data(this.curLinksData, function (d) {
      return d.source.nodeID + '_' + d.target.nodeID;
    });
    link
    .enter().append('line')
    .attr('class', 'link')
    .attr('stroke', '#ddd')
    .style('stroke-width', 5)
    .attr('x1', (d) => d.source.x)
    .attr('y1', (d) => d.source.y)
    .attr('x2', (d) => d.target.x)
    .attr('y2', (d) => d.target.y)
    .on('click', (d) => {
      if(this._selectedRole.localeCompare(CONNECTION) === 0) {
        d.source.removePeer(d.target)
        .then(() => {
          return d.target.removePeer(d.source);
        })
        .then(() => {
          this.graphData.links.forEach((curLink, i) => {
            if(curLink === d) {
              this.graphData.links.splice(i, 1);
              this._update();
            }
          });
        });
      }
    });
    link.exit().remove();
  }

  _update () {
    this.curNodesData = this.graphData.nodes;
    this.curLinksData = this.graphData.links;

    this.force.nodes(this.curNodesData);
    this._updateNodes();
    this.force.links(this.curLinksData);
    this._updateLinks();
    this.force.start();
  }

  /**
  * call this with new data for the visualization
  * @param  {json} newData
  */
  upsertGraphData (newData) {
    if(!newData.nodes || !newData.links) {
      return;
    }

    let filteredData = {nodes: [], links: []};
    newData.nodes.forEach((nodeID) => {
      let node = EthereumNetwork.getNodeByID(nodeID);
      if(!this.graphData.nodes.includes(node)) {
        filteredData.nodes.push(nodeID);
      }
    });

    newData.links.forEach((link1) => {
      let source = link1.source.localeCompare(link1.target) > 0 ? link1.source : link1.target;
      let target = link1.source.localeCompare(link1.target) > 0 ? link1.target : link1.source;

      let linkExists = this.graphData.links.some((link2) => {
        return source.localeCompare(link2.source.nodeID) === 0 &&
        target.localeCompare(link2.target.nodeID) === 0;
      });
      if(!linkExists) {
        filteredData.links.push(link1);
      }
    });

    let newNodes = filteredData.nodes.map((nID) => {
      //TODO: fix race condition, sometimes the code gets here without the network having created
      //the node yet.
      let n = EthereumNetwork.getNodeByID(nID);
      n.x = Math.floor(Math.random() * this.width);
      n.y = Math.floor(Math.random() * this.height);
      //TODO: scale radious based on number of peers
      n.r = 10;
      return n;
    });
    this.graphData.nodes.push(...newNodes);
    let newLinks = filteredData.links.map((l) => {
      //order statically to prevent duplicates
      let source = l.source.localeCompare(l.target) > 0 ? l.source : l.target;
      let target = l.source.localeCompare(l.target) > 0 ? l.target : l.source;
      return {
        source: EthereumNetwork.getNodeByID(source),
        target: EthereumNetwork.getNodeByID(target),
      };
    });
    newLinks.forEach((link1, i1, links1) => {
      links1.some((link2, i2, links2) => {
        if(i1 == i2) {
          return false;
        }
        if(link1.source === link2.source && link1.target === link2.target) {
          links1.splice(i2, 1);
          return true;
        }
        return false;
      });
    });
    this.graphData.links.push(...newLinks);

    this._update();
  }

  getSelectedMicrobe () {
    if(!this._selectedMicrobe) {
      return null;
    }
    return this._selectedMicrobe.data()[0];
  }

  getSelectedMacrophages () {
    if(this._selectedMacrophages.length === 0) {
      return [];
    }
    return this._selectedMacrophages.map((macrophage) => {
      return macrophage.data()[0];
    });
  }

  setSelectedNode (selectedNode) {
    if(this._selectedRole.localeCompare(MICROBE) === 0) {

      let selectedMicrobe = this.nodesG.selectAll('circle.node')
      .filter((d) => {
        return selectedNode.nodeID.localeCompare(d.nodeID) == 0;
      });

      let alreadySelected = false;
      this._selectedMacrophages.some((macrophage, i) => {
        if(macrophage.data()[0] === selectedMicrobe.data()[0]) {
          alreadySelected = true;
          return;
        }
      });
      if(alreadySelected) {
        return;
      }
      if(this._selectedMicrobe) {
        this._selectedMicrobe.attr('fill', '#000');
      }

      this._selectedMicrobe = selectedMicrobe;
      this._selectedMicrobe.attr('fill', '#00e0ff');
    }else if(this._selectedRole.localeCompare(MACROPHAGE) === 0) {
      let selectedMacrophage = this.nodesG.selectAll('circle.node')
      .filter((d) => {
        return selectedNode.nodeID.localeCompare(d.nodeID) == 0;
      });

      if(this._selectedMicrobe) {
        if(this._selectedMicrobe.data()[0] === selectedMacrophage.data()[0]) {
          return;
        }
      }

      let macrophageIndex = -1;
      this._selectedMacrophages.forEach((macrophage, i) => {
        if(macrophage.data()[0] === selectedMacrophage.data()[0]) {
          macrophageIndex = i;
          this._selectedMacrophages.splice(macrophageIndex, 1);
          selectedMacrophage.attr('fill', '#000');
          return;
        }
      });
      if(macrophageIndex == -1) {
        this._selectedMacrophages.push(selectedMacrophage);
        selectedMacrophage.attr('fill', '#f00');
      }
    }else if(this._selectedRole.localeCompare(CONNECTION) === 0) {
      if(this._selectedConnection) {
        this._selectedConnection.data()[0].addPeer(selectedNode);
        networkGraph.linksG.selectAll('line.mouselink').remove();
        this._selectedConnection = null;
        $('#networkGraph').unbind('mousemove');
      }else {
        let selectedConnection = this.nodesG.selectAll('circle.node')
        .filter((d) => {
          return selectedNode.nodeID.localeCompare(d.nodeID) == 0;
        });

        let link = networkGraph.linksG.selectAll('line.mouselink').data([selectedNode], (data) => {
          return data.nodeID;
        });
        link
        .enter().append('line')
        .attr('class', 'mouselink')
        .attr('stroke', '#0f0')
        .attr('stroke-width', 4)
        .attr('x1', () => selectedNode.x)
        .attr('y1', () => selectedNode.y)
        .attr('x2', () => selectedNode.x)
        .attr('y2', () => selectedNode.y);
        link.exit().remove();

        $('#networkGraph').mousemove((event) => {
          let x = event.pageX - $('#networkGraph').offset().left;
          let y = event.pageY - $('#networkGraph').offset().top;

          networkGraph.linksG.selectAll('line.mouselink')
          .attr('x1', () => this._selectedConnection.data()[0].x)
          .attr('y1', () => this._selectedConnection.data()[0].y)
          .attr('x2', () => x)
          .attr('y2', () => y);
        });

        this._selectedConnection = selectedConnection;
        d3.event.stopPropagation();
      }
    }
    if(networkGraph._selectedRole.localeCompare(GODSNODE) === 0) {
      if(this._selectedGodsnode) {
        this._selectedGodsnode.data()[0].addPeer(selectedNode);
        this._selectedGodsnode = null;
        $('#networkGraph').unbind('mousemove');
      }else {
        let godsNode = networkGraph.nodesG.selectAll('circle.node')
        .filter((circleNode) => {
          return selectedNode.nodeID.localeCompare(circleNode.nodeID) === 0;
        });

        $('#networkGraph').mousemove((event) => {
          let x = event.pageX - $('#networkGraph').offset().left;
          let y = event.pageY - $('#networkGraph').offset().top;
          godsNode.data()[0].x = x;
          godsNode.data()[0].y = y;
          networkGraph._update();
        });

        this._selectedGodsnode = godsNode;
        d3.event.stopPropagation();
      }
    }

    this._updateDOM();
  }

  getSelectedRole () {
    return this._selectedRole;
  }

  setSelectedRole (role) {
    this._selectedRole = role;
  }
}

networkGraph = new NetworkGraph();
export {networkGraph, NetworkGraph};