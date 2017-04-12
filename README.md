Welcome to node-raumkernel
===================
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/ChriD/)
[![npm:?](https://img.shields.io/npm/v/node-raumkernel.svg?style=flat-square)](https://www.npmjs.com/packages/node-raumkernel)
[![dependencies:?](https://img.shields.io/npm/dm/node-raumkernel.svg?style=flat-square)](https://www.npmjs.com/packages/node-raumkernel)  

[![NPM](https://nodei.co/npm/node-raumkernel.png?downloads=true&downloadRank=true)](https://nodei.co/npm/node-raumkernel/)  

node-raumkernel is a nodeJs lib to control the raumfeld multiroom system with.
It has events where you can hook on and it allows you to send actions to the raumfeld system like 'play', 'pause', aso..  
You can even browse the content directory or modify a zone playlist.  

Changelog
-------------
Changelog can be found [here](https://github.com/ChriD/node-raumkernel/releases)  

Installation
-------------

Please use with node version 7.x or above  
For Version lower than 7.6.0 the _--harmony-async-await_ parameter has to be used

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

Events
-------------
the node.raumkernel emits some events you can use to get information when the system changes states or a media renderer was found or is available for play. 
Following events are available. You may click [here](https://github.com/ChriD/node-raumkernel/wiki/Events) to get detailed information about the event

 - systemHostFound(_host)
 - systemHostLost()
 - deviceListChanged(_deviceList)
 - mediaRendererAdded(_deviceUdn, _device)
 - mediaRendererRaumfeldAdded(_deviceUdn, _device)
 - mediaRendererRaumfeldVirtualAdded(_deviceUdn, _device)
 - mediaServerAdded(_deviceUdn, _device)
 - mediaServerRaumfeldAdded(_deviceUdn, _device)
 - mediaRendererRemoved(_deviceUdn, _name)
 - mediaRendererRaumfeldRemoved(_deviceUdn, _name)
 - mediaRendererRaumfeldVirtualRemoved(_deviceUdn, _name)
 - mediaServerRemoved(_deviceUdn, _name)
 - mediaServerRaumfeldRemoved(_deviceUdn, _name)
 - zoneConfigurationChanged(_zoneConfiguration)
 - rendererStateChanged(_mediaRenderer, _rendererState)
 - rendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn) 
 - rendererMediaItemDataChanged(_mediaRenderer, _mediaItemData)
 - mediaListDataReady(_listId, _mediaListData)
 - mediaListDataPackageReady(_id, _mediaListDataPkg, _pkgIdx, _pgkIdxEnd, _pkgDataCount)
 - mediaRendererPlaylistReady(_rendererUdn, _mediaListData)


Data & Methods
-------------
There are some interessting methods and data storages you can use. I will not describe all of them here you may look it up in the code. However some of them should be mentioned as they are important. Please take a look [here](https://github.com/ChriD/node-raumkernel/wiki/Data-&-Methods) for detailed descriptions.

- raumkernel.managerDisposer.deviceManager.getRaumfeldMediaServer()
- raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer(_UdnOrChildName)
- raumkernel.managerDisposer.zoneManager.connectRoomToZone(_roomUdn, _zoneUdn)
- raumkernel.managerDisposer.zoneManager.dropRoomFromZone(_roomUdn)
- raumkernel.managerDisposer.zoneManager.zoneConfiguration
- raumkernel.managerDisposer.mediaListManager.getMediaList(_listId, _objectId, _useListCache = true, _emitReady = true)


Examples
-------------

#### First 
There are sample apps in the package like the "sample_contentBrowser.js".  
Start it with node and see the magic  

#### Second 
You may lookup the requests sources in the[ node-raumserver](https://github.com/ChriD/node-raumserver)  which is using node-raumkernel
You'll find all actions as requests and you can study the source code.
  
#### Third 
You may study following minimalistc examples
  

Stop playing the zone where room "Kitchen" is in it.
```
var mediaRenderer = raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer("Kitchen");
mediaRenderer.stop().then(function(_data){
		console.log("Stopped playing")
	});
```

 Set Volume on whole zone with a given zoneUdn
```
var mediaRenderer = raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer("uuid:30e3c8cd-1ce0-4842-89d0-63ea58858cd8");
mediaRenderer.setVolume(25).then(function(_data){
		console.log("Volume was set")
	});
```

 Set Volume on a specific room
```
var mediaRenderer = raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer("uuid:30e3c8cd-1ce0-4842-89d0-63ea58858cd8");
mediaRenderer.setRoomVolume("uuid:3f68f253-df2a-4474-8640-fd45dd9ebf88", 35).then(function(_data){
		console.log("Volume was set")
	});
```


 Give info when volume changes on any renderer
```
raumkernel.on("rendererStateKeyValueChanged", function(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn){
		if(key=="Volume")
			console.log("Volume on " + _mediaRenderer.name() + " changed to " + _newValue.toString());
	})
```

 Give info when volume changes on a specific room
 The _mediaRenderer is the virtual renderer in case if _roomUdn is filled
```
raumkernel.on("rendererStateKeyValueChanged", function(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn){
		if(_roomUdn && key=="Volume")
			console.log("Volume on room: " + _roomUdn + " changed to " + _newValue.toString());
	})
```

View the mediaItem information if it changes on a renderer (eg. if another track is choosen)
```
raumkernel.on("rendererMediaItemDataChanged", function(_mediaRenderer, _data){
		console.log("MediaItem: " + JSON.stringify(_data));
	})
```


Browse a list fron the content directory
```
var mediaServer = raunkernel.managerDisposer.deviceManager.getRaumfeldMediaServer();

mediaServer.browse("0").then(function(_data){
                console.log("Root Data: " + JSON.stringify(_data));
            });
	    
mediaServer.browse("0/My Music").then(function(_data){
                console.log("My Music data: " + JSON.stringify(_data));
            });
```

Some actions for creating and modifying native playlists 

```
// Add a container item to playlist (That means an item which direct childs are tracks)
raumkernel.nativePlaylistController.addItemToPlaylist("RAUMKERNELTEST", "0/My Music/Artists/4%20Non%20Blondes/4%20Non%20Blondes+What%27s%20Up", 294967295, true);
            
// Add one item to playlist. Here the mediaItemid is a track
raumkernel.nativePlaylistController.addItemToPlaylist("RAUMKERNELTEST", "0/My Music/Artists/Dido/Dido+No%20Angel/c7e7ad4423927a75c5017b2640db6574");
            
// Move an item in playlist to position 2 (index starts with 0)
raumkernel.nativePlaylistController.moveItemInPlaylist("RAUMKERNELTEST", "0/Playlists/MyPlaylists/RAUMKERNELTEST/31990", 1);
            
// Remove first and second item from playlist
raumkernel.nativePlaylistController.removeItemsFromPlaylist("RAUMKERNELTEST", 0, 1);
```

Some actions for creating and modifying zone playlists  (title lists)

```
// Add a container item to playlist (That means an item which direct childs are tracks)
raumkernel.zonePlaylistController.addItemToPlaylist(zoneRendererUdn, "0/My Music/Artists/4%20Non%20Blondes/4%20Non%20Blondes+What%27s%20Up", 294967295, true);
            
// Add one item to playlist. Here the mediaItemid is a track
raumkernel.zonePlaylistController.addItemToPlaylist(zoneRendererUdn, "0/My Music/Artists/Dido/Dido+No%20Angel/c7e7ad4423927a75c5017b2640db6574");
            
// Move an item in playlist to position 2 (index starts with 0)
raumkernel.zonePlaylistController.moveItemInPlaylist(zoneRendererUdn, "0/Zones/uuid%3A00000000-5416-48eb-0000-0000541648eb/33761", 1);
            
// Remove first and second item from playlist
raumkernel.zonePlaylistController.removeItemsFromPlaylist(zoneRendererUdn, 0, 1);
```
