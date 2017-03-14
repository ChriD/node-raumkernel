'use strict'; 
var Raumkernel = require('./lib/lib.raumkernel');

var raumkernel = new Raumkernel();

raumkernel.createLogger(2);
raumkernel.init();


raumkernel.on("systemReady", function(_ready){
        raumkernel.logInfo("System ready: " + _ready);
        
        //
        
        raumkernel.logWarning("Try create playlist");
        //raumkernel.nativePlaylistController.createPlaylist("RAUMKERNELTEST").then(function(){
            //raumkernel.logWarning("Try rename playlist");
            //raumkernel.nativePlaylistController.renamePlaylist("RAUMKERNELTEST", "RAUMKERNELTEST X")
            
            raumkernel.logWarning("Add a container item to playlist");
            //raumkernel.nativePlaylistController.addItemToPlaylist("RAUMKERNELTEST", "0/My Music/Artists/4%20Non%20Blondes/4%20Non%20Blondes+What%27s%20Up", 294967295, true);
            
            raumkernel.logWarning("Add one item to playlist");
            //raumkernel.nativePlaylistController.addItemToPlaylist("RAUMKERNELTEST", "0/My Music/Artists/Dido/Dido+No%20Angel/c7e7ad4423927a75c5017b2640db6574");
            
            raumkernel.logWarning("Mobe item in playlist");
            raumkernel.nativePlaylistController.moveItemInPlaylist("RAUMKERNELTEST", "0/Playlists/MyPlaylists/RAUMKERNELTEST/31990", 1);
            
            //raumkernel.logWarning("remove items from playlist");
            raumkernel.nativePlaylistController.removeItemsFromPlaylist("RAUMKERNELTEST", 1, 1);
            
            
            
            
        //});
        //raumkernel.nativePlaylistController.deletePlaylist("RAUMKERNELTEST (2)").catch(function(){});
        //raumkernel.nativePlaylistController.deletePlaylist("RAUMKERNELTEST");
        //raumkernel.nativePlaylistController.deletePlaylist("RAUMKERNELTEST X");
        
    });
    
raumkernel.on("mediaListReady", function(_listId, _data){
        raumkernel.logInfo("MediaList ready: " + _listId);
        //raumkernel.logWarning(JSON.stringify(_data));
    });
 
raumkernel.on("rendererMediaItemDataChanged", function(_mediaRenderer, _data){
        raumkernel.logInfo("MediaItem changed: " + JSON.stringify(_data));
        //raumkernel.logWarning(JSON.stringify(_data));
    }); 
    
raumkernel.on("mediaRendererPlaylistReady", function(_rendererUdn, _data){
        raumkernel.logInfo("mediaRendererPlaylistReady ready: " + _rendererUdn);
        //raumkernel.logWarning(JSON.stringify(_data));
    });

raumkernel.on("mediaServerRaumfeldAdded", function(_udn, _mediaServer){
        
        //raumkernel.logWarning("Raumfeld Media Server found!");
        /*
        _mediaServer.browse("0").then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            })
            
        _mediaServer.browse("0/My Music").then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            })
        */
        
        /*
        raumkernel.managerDisposer.mediaListManager.getMediaList("0", 0).then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            }).catch(function(_data){
                raumkernel.logError(JSON.stringify(_data));
            });
            */

    });


function execute(){

}

setInterval(execute,1000);