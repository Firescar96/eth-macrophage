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
    this.curLinksData = new Set();
    this.curNodesData = new Set();
    ///this.nodeColors = d3.scale.category20();
    this._selectedNode = null;
    this.graphData = this._setupData(data);
    let vis = d3.select(selection)
    .append('svg').attr('width', this.width)
    .attr('height', this.height);
    this.linksG = vis.append('g').attr('id', 'links');
    this.nodesG = vis.append('g').attr('id', 'nodes');
    this.messagesG = vis.append('g').attr('id', 'messages');
    this.force = d3.layout.force()
    .size([this.width, this.height])
    .charge(-500)
    .linkDistance(200)
    .on('tick', this._forceTick.bind(this));
    this._update();
  }
  _setupData (data) {
    data.nodes.forEach((n) => {
      n.x = Math.floor(Math.random() * this.width);
      n.y = Math.floor(Math.random() * this.height);
      //TODO: scale radious based on number of peers
      n.r = 5;
    });
    data.nodes = new Set(data.nodes);
    data.links.forEach((l) => {
      //order statically to prevent duplicates
      let source = l.source.localeCompare(l.target) > 0 ? l.source : l.target;
      let target = l.source.localeCompare(l.target) > 0 ? l.target : l.source;
      l.source = EthereumNetwork.getNodeByID(source);
      l.target = EthereumNetwork.getNodeByID(target);
    });
    data.links = new Set(data.links);
    return data;
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
    let messages = /\{.*\}/.exec(message);
    if(!!messages && messages.length == 1) {
      message = JSON.parse(messages[0]);

      if(!EthereumNetwork.getNodeIDs().includes(message.From)) {
        return;
      }
      this.linksG.selectAll('line.link')
      .filter((d) => {
        let hasSource1 = d.source.nodeID.localeCompare(targetNode.nodeID) === 0;
        let hasTarget1 = d.target.nodeID.localeCompare(message.From) === 0;
        let hasSource2 = d.source.nodeID.localeCompare(message.From) === 0;
        let hasTarget2 = d.target.nodeID.localeCompare(targetNode.nodeID) === 0;
        return (hasSource1 && hasTarget1) || (hasSource2 && hasTarget2);
      }).call((ds) => {
        if(ds.empty()) {
          return;
        }
        this.messagesG
        .append('circle')
        .attr('class', 'message')
        .attr('cx', (d) => { return EthereumNetwork.getNodeByID(message.From).x; })
        .attr('cy', (d) => { return EthereumNetwork.getNodeByID(message.From).y; })
        .attr('r', (d) => { return 10; })
        .style('stroke-width', 1.0)
        .transition()
        .duration(4000)
        .attr('cx', (d) => { return targetNode.x; })
        .attr('cy', (d) => { return targetNode.y; })
        .attr('r', (d) => { return 20; })
        .attr('fill', '#062f99')
        .remove();
      });
    }
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
          ethereumNode.logFilter(this._messageListener.bind(this));
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
      console.log('selected node with id:' + networkGraph._selectedNode.data()[0].nodeID);
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
    this.curNodesData = [...this.graphData.nodes];
    this.curLinksData = [...this.graphData.links];

    this.force.nodes(this.curNodesData);
    this._updateNodes();
    this.force.links(this.curLinksData);
    this._updateLinks();
    this.force.start();
  }
  updateGraphData (newData) {
    this.graphData = this._setupData(newData);
    this._update();
  }
  addGraphData (newData) {
    var graphData = this._setupData(newData);
    graphData.nodes.forEach((node) => {
      this.graphData.nodes.add(node);
    });
    graphData.links.forEach((link) => {
      this.graphData.links.add(link);
    });
    this._update();
  }
  getSelectedNode () {
    if(!this._selectedNode) {
      return null;
    }
    return this._selectedNode.data()[0];
  }
}

export {NetworkGraph};