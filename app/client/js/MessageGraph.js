class MessageGraph {
  /*
  selection:
  data:
  updateDOM:
  */
  /**
  * [constructor description]
  * @param  {string} selection    html element in which to inset the graph
  * @param  {json} data           JSON object of the graph data
  * @param  {Function} updateDOM  function that will triger updates to the containing DOM
  */
  constructor (selection, updateDOM) {
    this.margin = {
      top:    100,
      right:  40,
      bottom: 20,
      left:   200,
    };
    this.width = 400;
    this.height = 400;
  }

  init (selection, updateDOM) {
    this._updateDOM = updateDOM;
    this.messageData = [];
    this.svg = d3.select(selection)
    .append('svg')
    .attr('width', this.width)
    .attr('height', this.height);

    this.messagesG = this.svg.append('g')
    .attr('id', 'messages')
    .attr('width', this.width - this.margin.left - this.margin.right)
    .attr('height', this.height - this.margin.top - this.margin.bottom)
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');

    this.svg
    .append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', this.width / 2)
    .attr('y', this.margin.top / 2)
    .text('Node Identifier');

    this.svg
    .append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('x', -this.height / 2)
    .attr('y', this.margin.left / 2)
    .attr('transform', 'rotate(-90)')
    .text('Transaction Hash');

    this._update();
  }

  _update () {
    let uniqueCreators = this.messageData
    .map((data) => data.creator)
    .unique();
    let uniqueCreatorsSpacing = 80 * uniqueCreators.length;

    this.svg.attr('width', this.margin.left + this.margin.right + uniqueCreatorsSpacing);
    this.messagesG.attr('width', uniqueCreatorsSpacing);

    let uniqueAssignors = this.messageData
    .map((data) => data.assignors);

    let uniqueHashes = this.messageData
    .map((data) => data.hash)
    .unique();
    let uniqueHashesSpacing = 80 * uniqueHashes.length;

    this.svg.attr('height', this.margin.top + this.margin.bottom + uniqueHashesSpacing);
    this.messagesG.attr('height', uniqueHashesSpacing);

    let x = d3.scale.ordinal().domain(uniqueCreators)
    .rangeRoundBands([0, uniqueCreatorsSpacing], 0.1);
    let y = d3.scale.ordinal().domain(uniqueHashes)
    .rangeRoundBands([0, uniqueHashesSpacing], 0.1);

    let xAxis = d3.svg.axis().scale(x).orient('top')
    .tickSubdivide(true)
    .tickSize(0);
    let yAxis = d3.svg.axis().scale(y)
    .orient('left')
    .tickSize(0);

    var rectTransform = function (d) {
      return 'translate(' + x(d.creator) + ',' + y(d.hash) + ')';
    };

    this.messagesG.selectAll('rect').remove();
    let rect = this.messagesG.selectAll('rect')
    .data(this.messageData);


    rect.enter()
    .append('rect')
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('x', 0)
    .attr('y', 0)
    .attr('transform', rectTransform)
    .attr('width', (d) => x.rangeBand())
    .attr('height', (d) => y.rangeBand())
    .attr('fill', '#000')
    .attr('fill-opacity', (d, i) => {
      //console.log(d.prob / uniqueAssignors[i].length);
      return d.prob / uniqueAssignors[i].length;
    })
    .append('text')
    .text((d) => d.hash)
    /*.on('mouseover', function(e){
    var tag = "<strong><em><u>" + d3.select(this).data()[0].creator + "</u></em></strong><br>";

    var output = document.getElementById("tag");
    console.log(x(d3.select(this).data()[0].startDate));
    console.log(y(d3.select(this).data()[0].taskName));
    var xVal = x(d3.select(this).data()[0].startDate) + 168;
    var yVal = y(d3.select(this).data()[0].taskName) + 230;
    output.innerHTML = tag;
    output.style.top = yVal + "px";
    output.style.left = xVal+ "px";
    output.style.display = "block";
    })
    .on('mouseout', function() {
    var output = document.getElementById("tag");
    output.style.display = "none";}
    )*/;

    this.svg.select('.x-axis').remove();
    this.svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top * 6 / 7 + ')')
    .transition()
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-20)');

    this.svg.select('.y-axis').remove();
    this.svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')')
    .transition()
    .call(yAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-45)');
  }

  /**
  * call this with new data from the analysis for the visualization
  * @param  {json} newData
  */
  updateData (newData) {
    let flatDataMap = {};
    newData.forEach((assignorData) => {
      assignorData.forEach((data) => {
        if(!flatDataMap[data.creator + data.hash]) {
          flatDataMap[data.creator + data.hash] = {
            assignors: [],
            creator:   data.creator.substring(0, 10),
            hash:      data.hash.substring(0, 10),
            prob:      0,
          };
        }
        flatDataMap[data.creator + data.hash].prob += data.prob;
        flatDataMap[data.creator + data.hash].assignors.push({
          assignor: data.assignor,
          prob:     data.prob,
        });
      });
    });

    let flatData = Object.keys(flatDataMap)
    .map((key) => {
      return flatDataMap[key];
    });
    //.filter((data) => data.prob > 0);

    this.messageData = flatData;

    this._update();
  }
}

let messageGraph = new MessageGraph();
export {messageGraph};