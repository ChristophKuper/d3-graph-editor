#Changelog

###Version 1.0
- nodes
- edges (bi-directonal)
- force
- add / delete / select node
- add / delete / select edge
- move graph

###Version 2.0
- graph reload
- store additonal node data

#ToDo
- priority#1
	- catch listener errors
	- improve demo and make sample application more powerfull
	- rename source/target to node1/node2
	- make edge existence-check implicit
	- make lastnodeid completly implicit
	- center graph after width or height changes
	- reflexive edges listener (only call onAddEdge/onRemoveEdge but do not store a link)
	- addEdge and also addNode implicit(with parameters) which might depend on linkMode
- priority#2
	- editable edge weighting & other link properties
	- refactor link datastructure
	- id or index mode (unique id)
	- bounding box
	- gravity
	- zoom
	- multigraph
	- visualize graph algorithms
	- custom coloring
	- stop charge and drag