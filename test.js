'use strict'; 
var Raumkernel = require('./lib/lib.raumkernel');

var raumkernel = new Raumkernel();

//raumkernel.settings.raumfeldHost = "10.0.0.203"

raumkernel.createLogger(2);
raumkernel.init();


raumkernel.on("systemReady", function(_ready){
        raumkernel.logInfo("System ready: " + _ready);
        
        //
        
        //raumkernel.logWarning("Try create playlist");
        //raumkernel.nativePlaylistController.createPlaylist("RAUMKERNELTEST").then(function(){
            //raumkernel.logWarning("Try rename playlist");
            //raumkernel.nativePlaylistController.renamePlaylist("RAUMKERNELTEST", "RAUMKERNELTEST X")
            
            //raumkernel.logWarning("Add a container item to playlist");
            //raumkernel.nativePlaylistController.addItemToPlaylist("RAUMKERNELTEST", "0/My Music/Artists/4%20Non%20Blondes/4%20Non%20Blondes+What%27s%20Up", 294967295, true);
            
            //raumkernel.logWarning("Add one item to playlist");
            //raumkernel.nativePlaylistController.addItemToPlaylist("RAUMKERNELTEST", "0/My Music/Artists/Dido/Dido+No%20Angel/c7e7ad4423927a75c5017b2640db6574");
            
            //raumkernel.logWarning("Mobe item in playlist");
            //raumkernel.nativePlaylistController.moveItemInPlaylist("RAUMKERNELTEST", "0/Playlists/MyPlaylists/RAUMKERNELTEST/31990", 1);
            
            //raumkernel.logWarning("remove items from playlist");
            //raumkernel.nativePlaylistController.removeItemsFromPlaylist("RAUMKERNELTEST", 1, 1);
            
            var mediaRenderer = raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer("Küche")

            //var rendererUdns = mediaRenderer.getRoomRendererUDNs();
            //console.log(JSON.stringify(rendererUdns));
            //mediaRenderer.loadPlaylist("Rock", 2).catch(function(_data){
            //    console.log(_data.toString());
            //});
            
            /*mediaRenderer.loadUri("http://mp3channels.webradio.rockantenne.de/heavy-metal").catch(function(_data){
                console.log(_data.toString());
            });*/
            
            /*
            if (source == "recentartists")
                source = "0/Playlists/Shuffles/RecentArtists";
            if (source == "topartists")
                source = "0/Playlists/Shuffles/TopArtists";
            if (source == "all")
                source = "0/Playlists/Shuffles/All";
            // on following types we can add selections
            if (source == "genre")
                source = "0/Playlists/Shuffles/Genre";
            if (source == "genre")
                source = "0/Playlists/Shuffles/Artists";

            
            object.container.playlistContainer.shuffle 0/Playlists/Shuffles/RecentArtists
            object.container.playlistContainer.shuffle 0/Playlists/Shuffles/TopArtists
            object.container.playlistContainer.shuffle 0/Playlists/Shuffles/All
            object.container.playlistContainer.shuffle.search 0/Playlists/Shuffles/Genre
            object.container.playlistContainer.shuffle.search 0/Playlists/Shuffles/Artists
            */


            //mediaRenderer.loadShuffle("0/Playlists/Shuffles/All", "").catch(function(_data){
            //    console.log(_data.toString());
            //});

            
            setTimeout(function(){
                /*
                raumkernel.logWarning("Trying to add a media item to a zone playlist");
                raumkernel.zonePlaylistController.addItemToPlaylist(mediaRenderer.udn(), "0/My Music/Artists/Dido/Dido+No%20Angel/c7e7ad4423927a75c5017b2640db6574", 0).then(function(_data){
                    raumkernel.logWarning(_data);
                }).catch(function(_data){
                    raumkernel.logWarning(_data);
                });
                */

                /*

                var mediaRendererK = raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer("Küche")
                var mediaRendererB = raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer("Bad")
                //var rendererUdns = mediaRenderer.getRoomRendererUDNs();
                //console.log(JSON.stringify(rendererUdns));
                //mediaRenderer.loadLineIn("Schlafzimmer");

                mediaRendererB.pause(true).then(function(_data){
                    raumkernel.logWarning("Paused", _data);

                    mediaRendererB.play(true).then(function(_data){
                        raumkernel.logWarning("Playing", _data);

                        mediaRendererB.setPlayMode("REPEAT_ALL", true).then(function(_data){
                            raumkernel.logWarning("REPEAT_ALL", _data);
                        }).catch(function(_data){
                            raumkernel.logError("Catched", _data);
                        });

                    }).catch(function(_data){
                        raumkernel.logError("Catched", _data);
                    });

                }).catch(function(_data){
                    raumkernel.logError("Catched", _data);
                });
               
               */


            }, 3000);
            
            


            /*setTimeout(function(){

                raumkernel.logWarning("Trying to move a media item in a zone playlist");
                raumkernel.zonePlaylistController.moveItemInPlaylist(mediaRenderer.udn(), "0/Zones/uuid%3A00000000-5416-48eb-0000-0000541648eb/33761", 1).then(function(_data){
                    raumkernel.logWarning(_data);
                }).catch(function(_data){
                    raumkernel.logWarning(_data);
                });


            }, 15000);*/


            /*
             setTimeout(function(){

                raumkernel.logWarning("Trying to delete first two item of zone playlist");
                raumkernel.zonePlaylistController.removeItemsFromPlaylist(mediaRenderer.udn(), 0, 1).then(function(_data){
                    raumkernel.logWarning(_data);
                }).catch(function(_data){
                    raumkernel.logWarning(_data);
                });


            }, 15000);*/

            
            
            
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

            raumkernel.managerDisposer.mediaListManager.searchMediaList("DUMMYLISTID", "0/RadioTime/Search", "OE3").then(function(_data){
                raumkernel.logWarning(JSON.stringify(_data));
            })

        
        
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