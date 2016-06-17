class MessageGraph {
  /*
  selection: html element in which to inset the graph
  data: JSON object of the graph data
  updateDOM: function that will triger updates to the containing DOM
  */
  constructor (selection, data, updateDOM) {
    this._updateDOM = updateDOM;
    this.margin = {
      top:    40,
      right:  40,
      bottom: 20,
      left:   100,
    };
    this.width = 660;
    this.height = 500;
    ///this.nodeColors = d3.scale.category20();
    this.messageData = [
      {creator: 'placeholder data', hash: 'please?'},
      {creator: 'run EM!', hash: 'pretty please?'},
    ];
    this.svg = d3.select(selection)
    .append('svg')
    .attr('width', this.width)
    .attr('height', this.height);

    this.messagesG = this.svg.append('g')
    .attr('id', 'messages')
    .attr('width', this.width - this.margin.left - this.margin.right)
    .attr('height', this.height - this.margin.top - this.margin.bottom)
    .attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');

    this.messagesG
    .append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', this.margin.right + (this.width - this.margin.left - this.margin.right) / 2)
    .attr('y', -this.margin.top / 2)
    .text('Node Identifier');

    this.messagesG
    .append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('x', -this.margin.top - (this.height - this.margin.top - this.margin.bottom) / 2)
    .attr('y', -this.margin.left / 4)
    .attr('transform', 'rotate(-90)')
    .text('Transaction Hash');

    this._update();
  }
  _update () {

    x = d3.scale.ordinal().domain(this.messageData.map((data) => data.creator))
    .rangeRoundBands([this.margin.left, this.width - this.margin.left - this.margin.right], 0.1);
    y = d3.scale.ordinal().domain(this.messageData.map((data) => data.hash))
    .rangeRoundBands([this.margin.top, this.height - this.margin.top - this.margin.bottom], 0.1);
    xAxis = d3.svg.axis().scale(x).orient('top')
    .tickSubdivide(true)
    .tickSize(0);
    yAxis = d3.svg.axis().scale(y)
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

    this.messagesG.select('.x-axis').remove();
    this.messagesG.append('g')
    .attr('class', 'x-axis')
    .attr('transform', 'translate(0, ' + this.margin.top/2 + ')')
    .transition()
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-20)');

    this.messagesG.select('.y-axis').remove();
    this.messagesG.append('g')
    .attr('class', 'y-axis')
    .attr('transform', 'translate(' + this.margin.left + ', 0)')
    .transition()
    .call(yAxis);

  }
  setGraphData (newData) {
    this._setupData(newData);
    this._update();
  }
  updateData (newData) {
    let flatData = newData
    .reduce((a, b) => a.concat(b), [])
    .map((data) => {
      return {
        creator: data.creator.substring(0, 10),
        hash:    data.hash.substring(0, 10),
      };
    });

    this.messageData = flatData;
    /*flatData.forEach((_message) => {
      if(!this.messageData.some((message) => {
        let sameCreator = message.creator.localeCompare(_message.creator) === 0;
        let sameHash =  message.hash.localeCompare(_message.hash) === 0;
        return sameCreator && sameHash;
      })) {
        this.messageData.push(_message);
      }
    });*/


    this._update();
  }
}

export {MessageGraph};