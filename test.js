'use strict'; 
var Raumkernel = require('./lib/lib.raumkernel');

var raumkernel = new Raumkernel();

raumkernel.createLogger(4);
raumkernel.init();


function execute(){

}

setInterval(execute,1000);