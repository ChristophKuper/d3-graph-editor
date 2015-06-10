$(function(){
    var editor = new GraphEditor("#graphEditor");
});

GraphEditor = function(element, options){

    this._options = options || {};

    this._div           = element                    || "";
    this._width         = this._options.width        || 500;
    this._height        = this._options.height       || 500;
    this._charge        = this._options.carge        || -500;
    this._linkDistance  = this._options.linkDistance || 150;

    this._color = colors = d3.scale.category10();

    this._svg = d3.select(this._div)
        .append('svg')
        .attr('width', this._width)
        .attr('height', this._height);

    this._lastNodeId = 2;

    this._nodes = [
        {id: 0, reflexive: false},
        {id: 1, reflexive: true },
        {id: 2, reflexive: false}
    ];

    this._links = [
        {source: this._nodes[0], target: this._nodes[1], left: false, right: true },
        {source: this._nodes[1], target: this._nodes[2], left: false, right: true }
    ];

    this._svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
        .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#000');

    this._svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
      .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .attr('fill', '#000');

    this._drag_line = this._svg.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0');

    this._force = d3.layout.force()
        .nodes(this._nodes)
        .links(this._links)
        .size([this._width, this._height])
        .linkDistance(this._linkDistance)
        .charge(this._charge)
        .on('tick', this.tick.bind(this));

    this._path = this._svg.append('svg:g').selectAll('path');
    this._circle = this._svg.append('svg:g').selectAll('g');

    this._selected_node = null;
    this._selected_link = null;
    this._mousedown_link = null;
    this._mousedown_node = null;
    this._mouseup_node = null;
    this._lastKeyDown = -1;

    this._svg.on('mousedown', this.mousedown.bind(this))
        .on('mousemove', this.mousemove.bind(this))
        .on('mouseup', this.mouseup.bind(this));

    d3.select(window)
        .on('keydown', this.keydown.bind(this))
        .on('keyup', this.keyup.bind(this));

    this.restart();
};

GraphEditor.prototype.resetMouseVars = function() {
    this._mousedown_node = null;
    this._mouseup_node = null;
    this._mousedown_link = null;
};

GraphEditor.prototype.tick = function() {
    this._path.attr('d', function(d) {
        var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourcePadding = d.left ? 17 : 12,
            targetPadding = d.right ? 17 : 12,
            sourceX = d.source.x + (sourcePadding * normX),
            sourceY = d.source.y + (sourcePadding * normY),
            targetX = d.target.x - (targetPadding * normX),
            targetY = d.target.y - (targetPadding * normY);

        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });

    this._circle.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });
};

GraphEditor.prototype.restart = function restart() {
    var self = this;

    this._path = this._path.data(this._links);

    this._path.classed('selected', function(d) { return d === self._selected_link; })
        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });

    this._path.enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', function(d) { return d === self._selected_link; })
        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
        .on('mousedown', this.mousePathUp.bind(self));

    this._path.exit().remove();

    this._circle = this._circle.data(this._nodes, function(d) { return d.id; });

    this._circle.selectAll('circle')
        .style('fill', function(d) { return (d === self._selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
        .classed('reflexive', function(d) { return d.reflexive; });

    var g = this._circle.enter().append('svg:g');

    g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', 12)
        .style('fill', function(d) { return (d === self._selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
        .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
        .classed('reflexive', function(d) { return d.reflexive; })
        .on('mousedown', this.mouseCircleDown.bind(self))
        .on('mouseup', this.mouseCircleUp.bind(self));

    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('class', 'id')
        .text(function(d) { return d.id; });

    this._circle.exit().remove();

    this._force.start();
};

GraphEditor.prototype.mousedown = function() {
    this._svg.classed('active', true);

    if(d3.event.ctrlKey || this._mousedown_node || this._mousedown_link) return;

    var point = d3.mouse(this._svg.node()),
        node = {id: ++this._lastNodeId, reflexive: false};
        node.x = point[0];
        node.y = point[1];
        this._nodes.push(node);

    this.restart();
};

GraphEditor.prototype.mousemove = function() {
    if(!this._mousedown_node) return;

    this._drag_line.attr('d', 'M' + this._mousedown_node.x + ',' + this._mousedown_node.y + 'L' + d3.mouse(this._svg.node())[0] + ',' + d3.mouse(this._svg.node())[1]);
    this.restart();
};

GraphEditor.prototype.mouseup = function() {
    if(this._mousedown_node) {
        this._drag_line
        .classed('hidden', true)
        .style('marker-end', '');
    }

    this._svg.classed('active', false);
    this.resetMouseVars();
};

GraphEditor.prototype.mouseCircleDown = function(d){
    if(d3.event.ctrlKey) return;

    this._mousedown_node = d;
    if(this._mousedown_node === this._selected_node) this._selected_node = null;
    else this._selected_node = this._mousedown_node;
    this._selected_link = null;

    this._drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + this._mousedown_node.x + ',' + this._mousedown_node.y + 'L' + this._mousedown_node.x + ',' + this._mousedown_node.y);

    this.restart();
};

GraphEditor.prototype.mouseCircleUp = function(d){
    if(!this._mousedown_node) return;

    this._drag_line
        .classed('hidden', true)
        .style('marker-end', '');

    this._mouseup_node = d;
    if(this._mouseup_node === this._mousedown_node) { this.resetMouseVars(); return; }


    var source, target, direction;
    if(this._mousedown_node.id < this._mouseup_node.id) {
        source = this._mousedown_node;
        target = this._mouseup_node;
        direction = 'right';
    } else {
        source = this._mouseup_node;
        target = this._mousedown_node;
        direction = 'left';
    }

    var link;
    link = this._links.filter(function(l) {
        return (l.source === source && l.target === target);
    })[0];

    if(link) {
        link[direction] = true;
    } else {
        link = {source: source, target: target, left: false, right: false};
        link[direction] = true;
        this._links.push(link);
    }

    this._selected_link = link;
    this._selected_node = null;
    this.restart();
};

GraphEditor.prototype.mousePathUp = function(d){
    if(d3.event.ctrlKey) return;
    this._mousedown_link = d;
    if(this._mousedown_link === this._selected_link) this._selected_link = null;
    else this._selected_link = this._mousedown_link;
    this._selected_node = null;
    this.restart();
};

GraphEditor.prototype.spliceLinksForNode = function(node) {
    var self = this;
    var toSplice = this._links.filter(function(l) {
        return (l.source === node || l.target === node);
    });

    toSplice.map(function(l) {
        self._links.splice(self._links.indexOf(l), 1);
    });
};

GraphEditor.prototype.keydown = function() {

    //general
    d3.event.preventDefault();
    if(this._lastKeyDown !== -1) return;
    this._lastKeyDown = d3.event.keyCode;

    // ctrl
    if(d3.event.keyCode === 17) {
        this._circle.call(this._force.drag);
        this._svg.classed('ctrl', true);
    }

    if(!this._selected_node && !this._selected_link) return;

    switch(d3.event.keyCode) {
        //delete or backsprace
        case 8:
        case 46:
            if(this._selected_node) {
                this._nodes.splice(this._nodes.indexOf(this._selected_node), 1);
                this.spliceLinksForNode(this._selected_node);
            } else if(this._selected_link) {
                this._links.splice(this._links.indexOf(this._selected_link), 1);
            }

            this._selected_link = null;
            this._selected_node = null;
            this.restart();
            break;

        //B (both)
        case 66:
            if(this._selected_link) {
                this._selected_link.left = true;
                this._selected_link.right = true;
            }
            this.restart();
            break;

        //L (left)
        case 76:
            if(this._selected_link) {
                this._selected_link.left = true;
                this._selected_link.right = false;
            }
            this.restart();
            break;

        //R (right)
        case 82:
            if(this._selected_node) {
                this._selected_node.reflexive = !this._selected_node.reflexive;
            } else if(this._selected_link) {
                this._selected_link.left = false;
                this._selected_link.right = true;
            }
        this.restart();
        break;
    }
};

GraphEditor.prototype.keyup = function() {
    this._lastKeyDown = -1;

    if(d3.event.keyCode === 17) {
        this._circle
        .on('mousedown.drag', null)
        .on('touchstart.drag', null);
        this._svg.classed('ctrl', false);
    }
};
