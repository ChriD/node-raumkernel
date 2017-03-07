Welcome to node-raumkernel
===================

node-raumkernel is a nodeJs lib to control the raumfeld multiroom system with.
It has events where you can hook on and it allows you to send actions to the raumfeld system like 'play', 'pause', aso..


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
 - rendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue) 


Data & Methods
-------------
There are some interessting methods and data storages you can use. I will not describe all of them here you may look it up in the code. Howerver some of them should be mentioned as they are important. Please take a look [here](https://github.com/ChriD/node-raumkernel/wiki/Data-&-Methods) for detailed descriptions.

- raumkernel.managerDisposer.deviceManager.getRaumfeldMediaServer()
- raumkernel.managerDisposer.deviceManager.getVirtualMediaRenderer(_UdnOrChildName)
- raumkernel.managerDisposer.zoneManager.connectRoomToZone(_roomUdn, _zoneUdn)
- raumkernel.managerDisposer.zoneManager.dropRoomFromZone(_roomUdn)
- raumkernel.managerDisposer.zoneManager.zoneConfiguration


Examples
-------------

First of all you may lookup the requests sources in the[ node-raumserver](https://github.com/ChriD/node-raumserver)  which is using node.raumkernel
You'll find all actions as requests and you can study the source code

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
raunkernel.on("rendererStateKeyValueChanged", function(_mediaRenderer, _key, _oldValue, _newValue){
		if(key=="Volume")
			console.log("Volume on " + _mediaRenderer.name() + " changed to " + _newValue.toString());
	})
```



