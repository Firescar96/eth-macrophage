import {EthereumNetwork} from './EthereumNetwork.js';

class MessageGraph {
  /*
  selection: html element in which to inset the graph
  data: JSON object of the graph data
  updateDOM: function that will triger updates to the containing DOM
  */
  constructor (selection, data, updateDOM) {
    this._updateDOM = updateDOM;
    this.margin = {
      top:    20,
      right:  40,
      bottom: 20,
      left:   50,
    };
    this.width = 660;
    this.height = 500;
    ///this.nodeColors = d3.scale.category20();
    this.messageData = [{creator: 'asd', hash: 'asdfad'},{creator: 'asd', hash: 'asd'},{creator: 'gahh4d', hash: 'asd'}];
    this._setupData(this.messageData);
    this.svg = d3.select(selection)
    .append('svg')
    .attr('width', this.width)
    .attr('height', this.height);

    this.messagesG = this.svg.append('g')
    .attr('id', 'messages')
    .attr('width', this.width - this.margin.left - this.margin.right)
    .attr('height', this.height - this.margin.top - this.margin.bottom)
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');

    this._update();
  }
  _setupData (data) {
  }
  _update () {

    x = d3.scale.ordinal().domain(this.messageData.map((data) => data.creator))
    .rangeRoundBands([0, this.width - this.margin.left - this.margin.right], 0.1);
    y = d3.scale.ordinal().domain(this.messageData.map((data) => data.hash))
    .rangeRoundBands([0, this.height - this.margin.top - this.margin.bottom], 0.1);
    xAxis = d3.svg.axis().scale(x).orient('top')
    .tickSubdivide(true)
    .tickSize(0);
    yAxis = d3.svg.axis().scale(y)
    .orient('left')
    .tickSize(0);

    var rectTransform = function (d) {
      return 'translate(' + x(d.creator) + ',' + y(d.hash) + ')';
    };

    let rect = this.messagesG.selectAll('react')
    .data(this.messageData);

    rect.enter()
    .append('rect')
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('y', 0)
    .attr('transform', rectTransform)
    .attr('width', (d) => x.rangeBand())
    .attr('height', (d) => y.rangeBand())
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


    rect.transition()
    .attr('transform', rectTransform)
    .attr('width', (d) => x.rangeBand())
    .attr('height', (d) => y.rangeBand());

    rect.exit().remove();

    this.svg.append('g')
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')')
    .transition()
    .call(xAxis);

    this.svg.append('g')
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')')
    .transition()
    .call(yAxis);

  }
  setGraphData (newData) {
    this._setupData(newData);
    this._update();
  }
  updateGraphData (newData) {
    newData.forEach((_message) => {
      if(!this.graphData.some((message) => {
        let sameCreator = message.creator.localeCompare(_message.creator);
        let sameHash =  message.hash.localeCompare(_message.hash);
        return sameCreator && sameHash;
      })) {
        this.graphData.push(_message);
      }
    });

    this._update();
  }
}

export {MessageGraph};