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
Following events are available. You may click on each event to get a dteailed description

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


Data holders
-------------


Examples
-------------
