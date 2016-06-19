import {EthereumNetwork} from './EthereumNetwork.js';

class NetworkGraph {
  /*
  selection: html element in which to inset the graph
  data: JSON object of the graph data
  updateDOM: function that will triger updates to the containing DOM
  */
  constructor (selection, data, updateDOM) {
    this._updateDOM = updateDOM;
    this.width = 660;
    this.height = 500;
    this.curLinksData = [];
    this.curNodesData = [];
    ///this.nodeColors = d3.scale.category20();
    this._selectedNode = null;
    this.graphData = {nodes: [], links: []};
    let vis = d3.select(selection)
    .append('svg').attr('width', this.width)
    .attr('height', this.height);
    this.linksG = vis.append('g').attr('id', 'links');
    this.nodesG = vis.append('g').attr('id', 'nodes');
    this.messagesG = vis.append('g').attr('id', 'messages');
    this.force = d3.layout.force()
    .size([this.width, this.height])
    .charge(-500)
    .linkDistance(400)
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

    let networkGraph = this;
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
    .attr('cx', (d) => { return d.x; })
    .attr('cy', (d) => { return d.y; })
    .attr('r', (d) => { return d.r; })
    //.style('fill', (d) => { return this.nodeColors(d.artist); })
    //.style('stroke', (d) => { return this._strokeFor(d); })
    .style('stroke-width', 1.0)
    .on('click', function () {
      networkGraph.nodesG.selectAll('circle.node').attr('fill', '#000');
      networkGraph._selectedNode = d3.select(this);
      networkGraph._selectedNode.attr('fill', '#f00');
      networkGraph._updateDOM();
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
    .attr('x1', (d) => { return d.source.x; })
    .attr('y1', (d) => { return d.source.y; })
    .attr('x2', (d) => { return d.target.x; })
    .attr('y2', (d) => { return d.target.y; });
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
  updateGraphData (newData) {
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
      let n = EthereumNetwork.getNodeByID(nID);
      n.x = Math.floor(Math.random() * this.width);
      n.y = Math.floor(Math.random() * this.height);
      //TODO: scale radious based on number of peers
      n.r = 5;
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

  getSelectedNode () {
    if(!this._selectedNode) {
      return null;
    }
    return this._selectedNode.data()[0];
  }

  setSelectedNode (selectedNodeID) {
    this.nodesG.selectAll('circle.node').attr('fill', '#000');
    this._selectedNode = this.nodesG.selectAll('circle.node')
    .filter((d) => {
      return selectedNodeID.localeCompare(d.nodeID) == 0;
    })
    .attr('fill', '#f00');
    this._updateDOM();
  }
}

export {NetworkGraph};