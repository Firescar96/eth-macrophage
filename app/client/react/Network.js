class Network {
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
    console.log(vis);
    this.linksG = vis.append('g').attr('id', 'links');
    this.nodesG = vis.append('g').attr('id', 'nodes');
    this.force = d3.layout.force()
    .size([this.width, this.height])
    .charge(-200)
    .linkDistance(50)
    .on('tick', this._forceTick.bind(this));
    this._update();
  }

  _mapNodes (nodes) {
    let nodesMap = d3.map();
    nodes.forEach(function (n) {
      return nodesMap.set(n.id, n);
    });
    return nodesMap;
  }
  _setupData (data) {
    let countExtent = d3.extent(data.nodes, function (d) {
      return d.playcount;
    });
    let circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
    data.nodes.forEach((n) => {
      n.x = Math.floor(Math.random() * this.width);
      n.y = Math.floor(Math.random() * this.height);
      n.radius = circleRadius(n.playcount);
    });
    let nodesMap = this._mapNodes(data.nodes);
    data.links.forEach((l) => {
      l.source = nodesMap.get(l.source);
      l.target = nodesMap.get(l.target);
      this.linkedByIndex[l.source.id + ',' + l.target.id] = 1;
    });
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
  _strokeFor (d) {
    return d3.rgb(this.nodeColors(d.artist)).darker().toString();
  }
  _updateNodes () {
    let node = this.nodesG.selectAll('circle.node').data(this.curNodesData, function (d) {
      return d.id;
    });

    node.enter()
    .append('circle')
    .attr('class', 'node')
    .attr('cx', (d) => { return d.x; })
    .attr('cy', (d) => { return d.y; })
    .attr('r', (d) => { return d.radius; })
    .style('fill', (d) => { return this.nodeColors(d.artist); })
    .style('stroke', (d) => { return this._strokeFor(d); })
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
    .attr('stroke-opacity', 0.8)
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

export {Network};