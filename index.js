'use strict'; 
var os = require('os')

// https://github.com/diversario/node-ssdp/issues/34

var http = require('http');
var Raumkernel = require('./lib/lib.raumkernel');

var SsdpClient = require("node-ssdp").Client;

var raumkernel = new Raumkernel();

raumkernel.createLogger(4);
raumkernel.init();



function execute(){
   //code to execute
   //client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
}

setInterval(execute,1000);