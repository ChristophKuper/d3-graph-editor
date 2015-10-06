/**
 * ctor
**/
GraphEditor = function(element, options){
	//data
	this._options 		= typeof options !== 'undefined' 					? options 						: {};
	this._nodes 		= typeof this._options.nodes !== 'undefined' 		? this._options.nodes 			: [];
	this._edges 		= typeof this._options.edges !== 'undefined' 		? this._options.edges 			: [];
	this._lastNodeID 	= typeof this._options.lastNodeID !== 'undefined' 	? this._options.lastNodeID 		: 0;

	//settings
	this._div 			= typeof element !== 'undefined'					? element 						: "";
	this._width 		= typeof this._options.width !== 'undefined'		? this._options.width 			: "100%";
	this._height 		= typeof this._options.height !== 'undefined'		? this._options.height 			: "100%";
	this._charge 		= typeof this._options.carge !== 'undefined'		? this._options.carge 			: -500;
	this._edgeDistance 	= typeof this._options.edgeDistance !== 'undefined' ? this._options.edgeDistance 	: 150;
	this._radius 		= typeof this._options.radius !== 'undefined' 		? this._options.radius 			: 12;
	this._ctrlKey	 	= typeof this._options.ctrlKey !== 'undefined' 		? this._options.ctrlKey 		: 17;
	this._deleteKey 	= typeof this._options.deleteKey !== 'undefined' 	? this._options.deleteKey 		: 46;
	this._leftKey 		= typeof this._options.leftKey !== 'undefined' 		? this._options.leftKey 		: 37;
	this._rightKey 		= typeof this._options.rightKey !== 'undefined' 	? this._options.rightKey 		: 39;
	this._bothKey 		= typeof this._options.bothKey !== 'undefined' 		? this._options.bothKey 		: 66;
	this._reflexsivKey 	= typeof this._options.reflexsivKey !== 'undefined'	? this._options.reflexsivKey 	: 82;
	this._mouseMode 	= typeof this._options.mouseMode !== 'undefined' 	? this._options.mouseMode 		: true;
	this._textMode 		= typeof this._options.textMode !== 'undefined' 	? this._options.textMode 		: true;
	this._onAddNode 	= typeof this._options.onAddNode !== 'undefined' 	? this._options.onAddNode 		: function(){};
	this._onRemoveNode 	= typeof this._options.onRemoveNode !== 'undefined'	? this._options.onRemoveNode	: function(){};
	this._onAddEdge 	= typeof this._options.onAddEdge !== 'undefined' 	? this._options.onAddEdge 		: function(){};
	this._onRemoveEdge 	= typeof this._options.onRemoveEdge !== 'undefined' ? this._options.onRemoveEdge	: function(){};
	this._color 		= d3.scale.category10();

	//container
	this._svg = d3.select(this._div)
		.append('svg')
		.attr('class', 'graphEditor_svg')
		.style('width', '100%')
		.style('height', '100%');

	//read px width and height
	this._width = this._svg[0][0].offsetWidth;
	this._height = this._svg[0][0].offsetHeight;

	//end arrow
	this._svg.append('svg:defs')
		.append('svg:marker')
			.attr('class', 'graphEditor_edge')
			.attr('id', 'end-arrow')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 6)
			.attr('markerWidth', 3)
			.attr('markerHeight', 3)
			.attr('orient', 'auto')
		.append('svg:path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', '#000');

	//start arrow
	this._svg.append('svg:defs')
		.append('svg:marker')
			.attr('class', 'graphEditor_edge')
			.attr('id', 'start-arrow')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 4)
			.attr('markerWidth', 3)
			.attr('markerHeight', 3)
			.attr('orient', 'auto')
		.append('svg:path')
			.attr('d', 'M10,-5L0,0L10,5')
			.attr('fill', '#000');

	//drag line
	this._drag_line = this._svg.append('svg:path')
		.attr('class', 'graphEditor_edge graphEditor_dragline graphEditor_hidden')
		.attr('d', 'M0,0L0,0');

	//layout
	this._force = d3.layout.force()
		.nodes(this._nodes)
		.links(this._edges)
		.size([this._width, this._height])
		.linkDistance(this._edgeDistance)
		.charge(this._charge)
		.on('tick', this.tick.bind(this));

	//node and edge container
	this._edgeContainer = this._svg.append('svg:g').selectAll('path');
	this._nodeContainer = this._svg.append('svg:g').selectAll('g');

	//status saves
	this._selected_node = null;
	this._selected_edge = null;
	this._mousedown_edge = null;
	this._mousedown_node = null;
	this._mouseup_node = null;
	this._lastKeyDown = -1;

	//listener
	this._svg.on('mousedown', this.mousedown.bind(this))
		.on('mouseup', this.mouseup.bind(this));

	d3.select(window)
		.on('mousemove', this.mousemove.bind(this))
		.on('keydown', this.keydown.bind(this))
		.on('keyup', this.keyup.bind(this));

	//initialize
	this.restart();
};

/**
 * method to update nodes and edges
**/
GraphEditor.prototype.tick = function(){
	//update edge position
	this._edgeContainer.attr('d', function(d){
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

	//update node position
	this._nodeContainer.attr('transform', function(d){
		return 'translate(' + d.x + ',' + d.y + ')';
	});
};

/**
 * method to update data (enter / exit / update sections)
**/
GraphEditor.prototype.restart = function restart(){
	var self = this;

	this._edgeContainer = this._edgeContainer.data(this._edges);

	//update section (edge)
	this._edgeContainer.classed('graphEditor_selected', function(d){ return d === self._selected_edge; })
		.style('marker-start', function(d){ return d.left ? 'url(#start-arrow)' : ''; })
		.style('marker-end', function(d){ return d.right ? 'url(#end-arrow)' : ''; });

	//enter section (edge)
	this._edgeContainer.enter().append('svg:path')
		.attr('class', 'graphEditor_edge')
		.classed('graphEditor_selected', function(d){ return d === self._selected_edge; })
		.style('marker-start', function(d){ return d.left ? 'url(#start-arrow)' : ''; })
		.style('marker-end', function(d){ return d.right ? 'url(#end-arrow)' : ''; })
		.on('mousedown', this.mouseEdgeUp.bind(self));

	//exit section (edge)
	this._edgeContainer.exit().remove();

	this._nodeContainer = this._nodeContainer.data(this._nodes, function(d){ return self._nodes.indexOf(d); });

	//update section (node)
	this._nodeContainer.selectAll('circle')
		.style('fill', function(d){ return (d === self._selected_node) ? d3.rgb(self._color(d.id)).brighter().toString() : self._color(d.id); })
		.classed('graphEditor_reflexive', function(d){ return d.reflexive; });

	//enter section (node)
	var g = this._nodeContainer.enter().append('svg:g');

	g.append('svg:circle')
		.attr('class', 'graphEditor_node')
		.attr('r', this._radius)
		.style('fill', function(d){ return (d === self._selected_node) ? d3.rgb(self._color(d.id)).brighter().toString() : self._color(d.id); })
		.style('stroke', function(d){ return d3.rgb(self._color(d.id)).darker().toString(); })
		.classed('graphEditor_reflexive', function(d){ return d.reflexive; })
		.on('mousedown', this.mouseNodeDown.bind(self))
		.on('mouseup', this.mouseNodeUp.bind(self));

	g.append('svg:text')
		.attr('class', 'graphEditor_nodeText graphEditor_nodeID')
		.attr('x', 0)
		.attr('y', 4)
		.text(function(d){ return self._textMode ? d.id : ""; });

	//exit section (node)
	this._nodeContainer.exit().remove();

	//start force
	this._force.start();
};

/**
 * fires if the mouse was clicked on the svg
**/
GraphEditor.prototype.mousedown = function(){
	//return if ctl was pressed / a node or edge is already selected / mouseMode is disabled
	if(d3.event.ctrlKey || this._mousedown_node || this._mousedown_edge || !this._mouseMode) return;

	//add new node
	var point = d3.mouse(this._svg.node());
	this.addNode({x : point[0], y : point[1]});
};

/**
 * fires if the mouse was dragged on the svg
**/
GraphEditor.prototype.mousemove = function(){
	//return if mousedown does not started on a node
	if(!this._mousedown_node) return;

	//draw dragline
	this._drag_line.attr('d', 'M' + this._mousedown_node.x + ',' + this._mousedown_node.y + 'L' + d3.mouse(this._svg.node())[0] + ',' + d3.mouse(this._svg.node())[1]);
};

/**
 * fires if the mouse was released on the svg
**/
GraphEditor.prototype.mouseup = function(){
	//hide draglinge
	if(this._mousedown_node){
		this._drag_line
			.classed('graphEditor_hidden', true)
			.style('marker-end', '');
	}

	this.resetMouseVars();
};

/**
 * fires if the mouse was clicked on a node
**/
GraphEditor.prototype.mouseNodeDown = function(d){
	//return if ctrl is pressed
	if(d3.event.ctrlKey) return;

	//select or deselect node (and deselect edge)
	this._mousedown_node = d;
	if(this._mousedown_node === this._selected_node){
		this._selected_node = null;
	}else{
		this._selected_node = this._mousedown_node;
	}
	this._selected_edge = null;

	//show drag line
	this._drag_line
		.style('marker-end', 'url(#end-arrow)')
		.classed('graphEditor_hidden', false)
		.attr('d', 'M' + this._mousedown_node.x + ',' + this._mousedown_node.y + 'L' + this._mousedown_node.x + ',' + this._mousedown_node.y);

	//restart to show selected status
	this.restart();
};

/**
 * fires if the mouse was released on a node
**/
GraphEditor.prototype.mouseNodeUp = function(d){
	//return if the mousdown does not started on a node
	if(!this._mousedown_node) return;

	//hide drag line and arrow
	this._drag_line
		.classed('graphEditor_hidden', true)
		.style('marker-end', '');

	//return if it is still the same node
	this._mouseup_node = d;
	if(this._mouseup_node === this._mousedown_node){
		this.resetMouseVars();
		return;
	}

	//define source and target node
	var source, target, left, right;
	source = this._mousedown_node;
	target = this._mouseup_node;
	left = false;
	right = true;

	//add new edge
	this.addEdge({source : source, target : target, left : left, right : right});
};

/**
 * fires if the mouse was released on an edge
**/
GraphEditor.prototype.mouseEdgeUp = function(d){
	//select or deselect edge (and also deselect node)
	this._mousedown_edge = d;
	if(this._mousedown_edge === this._selected_edge){
		this._selected_edge = null;
	}else{
		this._selected_edge = this._mousedown_edge;
	}
	this._selected_node = null;

	//restart to show selected status
	this.restart();
};

/**
 * fires if a key was pressed
**/
GraphEditor.prototype.keydown = function(){

	var self = this;

	if(self._lastKeyDown !== -1) return;
	self._lastKeyDown = d3.event.keyCode;

	if(d3.event.keyCode === self._){
		self._nodeContainer.call(self._force.drag);
		self._svg.classed('graphEditor_ctrl', true);
	}

	if(!self._selected_node && !self._selected_edge) return;

	switch(d3.event.keyCode){

		case self._deleteKey:
			if(self._selected_node)
				self.removeNode(self._selected_node);
			if(self._selected_edge)
				self.removeEdge(self._selected_edge)

			break;

		case self._bothKey:
			if(!self._selected_edge.left ||!self._selected_edge.right)
				self.addEdge({source : self._selected_edge.source, target : self._selected_edge.target, left : true, right : true});

			break;

		case self._leftKey:
			if(self._selected_edge.right)
				self.removeEdge(self._selected_edge, true);

			if(!self._selected_edge.left || self._selected_edge.right)
				self.addEdge({source : self._selected_edge.source, target : self._selected_edge.target, left : true, right : false});

			break;

		case self._rightKey:
			if(self._selected_edge.left)
				self.removeEdge(self._selected_edge, true);

			if(self._selected_edge.left || !self._selected_edge.right)
				self.addEdge({source : self._selected_edge.source, target : self._selected_edge.target, left : false, right : true});

			break;

		case self._reflexsivKey:
			if(self._selected_node)
				self._selected_node.reflexive = !self._selected_node.reflexive;

			break;
	}

	self.restart();
};

/**
 * fires if a key was released
**/
GraphEditor.prototype.keyup = function(){
	this._lastKeyDown = -1;

	//do not drag after ctrl was released
	if(d3.event.keyCode === 17){
		this._nodeContainer
		.on('mousedown.drag', null)
		.on('touchstart.drag', null);
		this._svg.classed('graphEditor_ctrl', false);
	}
};

/**
 * method to splice edge for a node
**/
GraphEditor.prototype.spliceEdgesForNode = function(node){
	var self = this;

	//get all edges which are connected
	var toSplice = this._edges.filter(function(l){
		return (l.source === node || l.target === node);
	});

	//remove them from list
	toSplice.map(function(l){
		self._edges.splice(self._edges.indexOf(l), 1);
	});
};

/**
 * method to reset mouse variables
**/
GraphEditor.prototype.resetMouseVars = function(){
	this._mousedown_node = null;
	this._mouseup_node = null;
	this._mousedown_edge = null;
};

/**
 * method to reload a graph
**/
GraphEditor.prototype.reload = function reload(options){
	options 			= typeof options !== 'undefined'				? options 				: {};
	this._nodes 		= typeof options.nodes !== 'undefined'			? options.nodes 		: [];
	this._edges 		= typeof options.edges !== 'undefined'			? options.edges 		: [];
	this._lastNodeID 	= typeof options.lastNodeID !== 'undefined'		? options.lastNodeID 	: 0;

	this._force.stop();
	this._force = d3.layout.force()
		.nodes(this._nodes)
		.links(this._edges)
		.size([this._width, this._height])
		.linkDistance(this._edgeDistance)
		.charge(this._charge)
		.on('tick', this.tick.bind(this));

	//reinitalize
	this.restart();
};

/**
 * method to add a node
**/
GraphEditor.prototype.addNode = function(options){
	options 			= typeof options !== 'undefined'				? options 				: {};
	options.id 			= typeof options.id !== 'undefined'				? options.id 			: ++this._lastNodeID;
	options.x 			= typeof options.x !== 'undefined'				? options.x 			: this._with/2 + Math.random();
	options.y 			= typeof options.y !== 'undefined'				? options.y 			: this._height/2 + Math.random();
	options.reflexive	= typeof options.reflexive !== 'undefined'		? options.reflexive 	: false;

	var node = { id : options.id, reflexive : options.reflexive, x : options.x, y : options.y};

	for(var prop in options)
		node[prop]=options[prop];

	this._nodes.push(node);

	try{
		this._onAddNode(node)
	}finally{
		this.restart();
	};
};

/**
 * method to remove a node
**/
GraphEditor.prototype.removeNode = function(node){
	var self = this

	self._nodes.splice(self._nodes.indexOf(node), 1);
	self.spliceEdgesForNode(node);
	self._selected_node = null;

	try{
		self._onRemoveNode(node)
	}finally{
		self.restart();
	}
}

/**
 * method to add a edge
**/
GraphEditor.prototype.addEdge = function(options){
	options 			= typeof options !== 'undefined'				? options 			: {};
	options.source 		= typeof options.source !== 'undefined'			? options.source 	: {};
	options.target		= typeof options.target !== 'undefined'			? options.target 	: {};
	options.left		= typeof options.left !== 'undefined'			? options.left 		: false;
	options.right		= typeof options.right !== 'undefined'			? options.right		: false;

	//get or create edge
	var edge;
	var edge1 = this._edges.filter(function(l){ return (l.source === options.source && l.target === options.target);})[0];
	var edge2 = this._edges.filter(function(l){ return (l.source === options.target && l.target === options.source);})[0];

	//set edge values
	if(edge1){
		edge1.right = options.right;
		edge1.left = options.left;
		edge = edge1;
	}else if(edge2){
		edge2.left = true;
		var temp = edge2.source;
		edge2.source = edge2.target;
		edge2.target = temp;
		edge = edge2;
	}else{
		var edge = {source: options.source, target: options.target, left: options.left, right: options.right};
		this._edges.push(edge);
	}

	this._selected_edge = edge;
	this._selected_node = null;

	try{
		this._onAddEdge(edge);
	}finally{
		this.restart();
	};
};

/**
 * method to remove an edge
 * if soft equals true only the listener will be called
**/
GraphEditor.prototype.removeEdge = function(edge, soft){
	var self = this;

	if(!soft){
		self._edges.splice(self._edges.indexOf(edge), 1);
		self._selected_edge = null;
	}

	try{
		self._onRemoveEdge(edge);
	}finally{
		self.restart();
		return;
	}
}