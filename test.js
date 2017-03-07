'use strict'; 
var Raumkernel = require('./lib/lib.raumkernel');

var raumkernel = new Raumkernel();

raumkernel.createLogger(2);
raumkernel.init();


raumkernel.on("mediaServerRaumfeldAdded", function(_udn, _mediaServer){
        
        raumkernel.logWarning("Raumfeld Media Server found!");
        /*
        _mediaServer.browse("0").then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            })
            
        _mediaServer.browse("0/My Music").then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            })
        */
        
        raumkernel.managerDisposer.mediaListManager.getMediaList(0).then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            }).catch(function(_data){
                raumkernel.logError(JSON.stringify(_data));
            });

    });


function execute(){

}

setInterval(execute,1000);