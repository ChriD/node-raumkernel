Welcome to node-raumkernel
===================

node-raumkernel is a nodeJs lib to control the raumfeld multiroom system with.
It has events where you can hook on and it allows you to send actions to the raumfeld system like 'play', 'pause', aso..

----------

Installation
-------------
```
npm install node-raumkernel
```

Following example shows you how to initialize the kernel  for your usage
```
var RaumkernelLib = require('node-raumkernel');
var raumkernel = new RaumkernelLib.Raumkernel();
raumkernel.createLogger();
raumkernel.init();
```
----------

Events
-------------
