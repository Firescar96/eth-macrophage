import {EthereumNode} from './EthereumNode.js';

class NetworkGraph {
  constructor (selection, data) {
    this.width = 960;
    this.height = 800;
    this.curLinksData = [];
    this.curNodesData = [];
    this.linkedByIndex = {};
    this.nodeColors = d3.scale.category20();
    this.allData = this._setupData(data);
    let vis = d3.select(selection)
    .append('svg').attr('width', this.width)
    .attr('height', this.height);
    this.linksG = vis.append('g').attr('id', 'links');
    this.nodesG = vis.append('g').attr('id', 'nodes');
    this.force = d3.layout.force()
    .size([this.width, this.height])
    .charge(-200)
    .linkDistance(50)
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
    data.links.forEach((l) => {
      console.log(l.source);
      console.log(l.target);
      console.log(EthereumNode.members);
      l.source = EthereumNode.getNodeByID(l.source);
      l.target = EthereumNode.getNodeByID(l.target);
      console.log(l.source);
      console.log(l.target);
      this.linkedByIndex[l.source.id + ',' + l.target.id] = 1;
    });
    console.log(data);
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
    this.curNodesData = this.allData.nodes;
    this.curLinksData = this.allData.links;

    this.force.nodes(this.curNodesData);
    this._updateNodes();
    this.force.links(this.curLinksData);
    this._updateLinks();
    this.force.start();
  }
  updateData (newData) {
    this.allData = setupData(newData);
    this._update();
  }
}

export {NetworkGraph};