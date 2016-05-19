import {EthereumNetwork} from './EthereumNetwork.js';

class NetworkGraph {
  constructor (selection, data) {
    this.width = 960;
    this.height = 800;
    this.curLinksData = new Set();
    this.curNodesData = new Set();
    this.linkedByIndex = {};
    this.nodeColors = d3.scale.category20();
    this.graphData = this._setupData(data);
    let vis = d3.select(selection)
    .append('svg').attr('width', this.width)
    .attr('height', this.height);
    this.linksG = vis.append('g').attr('id', 'links');
    this.nodesG = vis.append('g').attr('id', 'nodes');
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
      var source = l.source.localeCompare(l.target) ? l.source : l.target;
      var target = l.source.localeCompare(l.target) ? l.target : l.source;
      this.linkedByIndex[source + ',' + target] = 1;
      l.source = EthereumNetwork.getNodeByID(source);
      l.target = EthereumNetwork.getNodeByID(target);
    });
    data.links = new Set(data.links);
    return data;
  }
  _forceTick (e) {
    let node = this.nodesG.selectAll('circle.node').data(this.curNodesData, function (d) {
      return d.id;
    });

    node
    .attr('cx', (d) => { return d.x; })
    .attr('cy', (d) => { return d.y; });

    let link = this.linksG.selectAll('line.link').data(this.curLinksData, function (d) {
      return d.source.id + '_' + d.target.id;
    });

    link
    .attr('x1', (d) => { return d.source.x; })
    .attr('y1', (d) => { return d.source.y; })
    .attr('x2', (d) => { return d.target.x; })
    .attr('y2', (d) => { return d.target.y; });
  }
  /*_strokeFor (d) {
    return d3.rgb(this.nodeColors(d.artist)).darker().toString();
  }*/
  _updateNodes () {
    let node = this.nodesG.selectAll('circle.node').data(this.curNodesData, function (d) {
      return d.id;
    });

    node.enter()
    .append('circle')
    .attr('class', 'node')
    .attr('cx', (d) => { return d.x; })
    .attr('cy', (d) => { return d.y; })
    .attr('r', (d) => { return d.r; })
    //.style('fill', (d) => { return this.nodeColors(d.artist); })
    //.style('stroke', (d) => { return this._strokeFor(d); })
    .style('stroke-width', 1.0);
    //this.node.on('mouseover', showDetails).on('mouseout', hideDetails);
    node.exit().remove();
  }
  _updateLinks () {
    let link = this.linksG.selectAll('line.link').data(this.curLinksData, function (d) {
      return d.source.id + '_' + d.target.id;
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
    this.graphData = _setupData(newData);
    this._update();
  }
  addGraphData (newData) {
    var graphData = _setupData(newData);
    this.graphData.nodes.add(...graphData.nodes);
    this.graphData.links.add(...graphData.links);
    this._update();
  }
}

export {NetworkGraph};