'use strict'; 

// https://github.com/diversario/node-ssdp/issues/34

var http = require('http');
var Raumkernel = require('./lib/lib.raumkernel');

var SsdpClient = require("node-ssdp").Client;

var raumkernel = new Raumkernel();

raumkernel.createLogger(5);
raumkernel.init();

/*
raumkernel.managerDisposer.deviceManager.on("mediaRendererRaumfeldVirtualAdded", function (_usn, _device){
        raumkernel.logWarning("Event Emitted for device: " + _usn);
        _device.changeVolume(-10).then(function (_volume){
            raumkernel.logWarning("###### Done");
            }).catch(function ()
            {
            raumkernel.logError("###### Get Info error");
            }
            
            );
    });
    
    
    raumkernel.managerDisposer.deviceManager.on("mediaRendererAdded", function (_usn, _device){
        raumkernel.logWarning("Event Emitted for device: " + _usn);
        
        _device.setVolume(80).then(function (_volume){
            raumkernel.logWarning("###### SETVolume: " + JSON.stringify(_volume));
            }).catch(function ()
            {
            raumkernel.logError("###### Set Volume error");
            }
            
            );
        
        
        _device.getVolume().then(function (_volume){
            raumkernel.logWarning("###### Volume: " + _volume);
            }).catch(function ()
            {
            raumkernel.logError("###### Get Volume error");
            }
            
            );
    });

*/
function execute(){
   //code to execute
   //client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
}

setInterval(execute,1000);