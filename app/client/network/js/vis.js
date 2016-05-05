let networkFactory = function () {
  let allData = [];
  let width = 960;
  let height = 800;
  let curLinksData = [];
  let curNodesData = [];
  let linkedByIndex = {};
  let nodesG = null;
  let linksG = null;
  let node = null;
  let link = null;
  let force = d3.layout.force();
  let nodeColors = d3.scale.category20();
  /*let charge = function (_node) {
  return -Math.pow(_node.radius, 2.0) / 2;
  };*/

  let mapNodes = function (nodes) {
    var nodesMap;
    nodesMap = d3.map();
    nodes.forEach(function (n) {
      return nodesMap.set(n.id, n);
    });
    return nodesMap;
  };
  let setupData = function (data) {
    let circleRadius;
    let countExtent;
    let nodesMap;
    countExtent = d3.extent(data.nodes, function (d) {
      return d.playcount;
    });
    circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
    data.nodes.forEach(function (n) {
      n.x = Math.floor(Math.random() * width);
      n.y = Math.floor(Math.random() * height);
      n.radius = circleRadius(n.playcount);
    });
    nodesMap = mapNodes(data.nodes);
    data.links.forEach(function (l) {
      l.source = nodesMap.get(l.source);
      l.target = nodesMap.get(l.target);
      linkedByIndex[l.source.id + ',' + l.target.id] = 1;
    });
    return data;
  };
  let forceTick = function (e) {
    node.attr('cx', function (d) {
      return d.x;
    }).attr('cy', function (d) {
      return d.y;
    });
    return link.attr('x1', function (d) {
      return d.source.x;
    }).attr('y1', function (d) {
      return d.source.y;
    }).attr('x2', function (d) {
      return d.target.x;
    }).attr('y2', function (d) {
      return d.target.y;
    });
  };
  let setLayout = function (newLayout) {
    force.on('tick', forceTick).charge(-200).linkDistance(50);
  };
  let setFilter = function (newFilter) {
    filter = newFilter;
  };
  let setSort = function (newSort) {
    sort = newSort;
  };
  let strokeFor = function (d) {
    return d3.rgb(nodeColors(d.artist)).darker().toString();
  };
  let filterLinks = function (allLinks, curNodes) {
    curNodes = mapNodes(curNodes);
    return allLinks.filter(function (l) {
      return curNodes.get(l.source.id) && curNodes.get(l.target.id);
    });
  };
  let updateNodes = function () {
    node = nodesG.selectAll('circle.node').data(curNodesData, function (d) {
      return d.id;
    });
    node.enter().append('circle').attr('class', 'node').attr('cx', function (d) {
      return d.x;
    }).attr('cy', function (d) {
      return d.y;
    }).attr('r', function (d) {
      return d.radius;
    }).style('fill', function (d) {
      return nodeColors(d.artist);
    }).style('stroke', function (d) {
      return strokeFor(d);
    }).style('stroke-width', 1.0);
    //node.on('mouseover', showDetails).on('mouseout', hideDetails);
    return node.exit().remove();
  };
  let updateLinks = function () {
    link = linksG.selectAll('line.link').data(curLinksData, function (d) {
      return d.source.id + '_' + d.target.id;
    });
    link
    .enter().append('line')
    .attr('class', 'link')
    .attr('stroke', '#ddd')
    .attr('stroke-opacity', 0.8)
    .attr('x1', function (d) {
      return d.source.x;
    }).attr('y1', function (d) {
      return d.source.y;
    }).attr('x2', function (d) {
      return d.target.x;
    }).attr('y2', function (d) {
      return d.target.y;
    });
    link.exit().remove();
  };
  let update = function () {
    curNodesData = allData.nodes;
    curLinksData = allData.links;

    force.nodes(curNodesData);
    updateNodes();
    force.links(curLinksData);
    updateLinks();
    return force.start();
  };
  let network = function (selection, data) {
    var vis;
    allData = setupData(data);
    vis = d3.select(selection).append('svg').attr('width', width).attr('height', height);
    linksG = vis.append('g').attr('id', 'links');
    nodesG = vis.append('g').attr('id', 'nodes');
    force.size([width, height]);
    setLayout('force');
    setFilter('all');
    update();
  };
  network.toggleLayout = function (newLayout) {
    force.stop();
    setLayout(newLayout);
    return update();
  };
  network.toggleFilter = function (newFilter) {
    force.stop();
    setFilter(newFilter);
    return update();
  };
  network.toggleSort = function (newSort) {
    force.stop();
    setSort(newSort);
    return update();
  };
  network.updateData = function (newData) {
    allData = setupData(newData);
    link.remove();
    node.remove();
    return update();
  };
  return network;
};

let myNetwork = networkFactory();

d3.json('data/call_me_al.json', function (json) {
  return myNetwork('#vis', json);
});
