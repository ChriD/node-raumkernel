'use strict'; 
var Logger = require('./lib.logger');
var BaseManager = require('./lib.base.manager');
var ManagerDisposer = require('./lib.managerDisposer');

module.exports = class Raumkernel extends BaseManager
{
    constructor()
    {
        super();
    }

    additionalLogIdentifier()
    {
        return "Raumkernel";
    }
    
    /**
     * construct and set a default logger      
     * @param {Number} the log level which should be logged
     */
    createLogger(_logLevel = 2, _path = "")
    {
        this.parmLogger(new Logger(_logLevel, _path));
    }
    
    /**
     * should be called after the class was instanced and after an external logger was set (otherwise a standard logger will be created)
     * this method starts up the searching for the upnp devices ans the discovering of the raumfeld master device
     */
    init()
    {
        var self = this;
        
        // if there is no logger defined we do create a standard logger
        if(!this.parmLogger())
            this.createLogger();
            
        this.logVerbose("Setting up manager disposer");
        
        // create the manager disposer and let him create the managers
        this.managerDisposer = new ManagerDisposer();
        this.managerDisposer.parmLogger(this.parmLogger());        
        this.managerDisposer.createManagers();        
                
        this.managerDisposer.deviceManager.on("systemHostFound",                    function(_host)                 { self.onSystemHostFound(_host); } );
        this.managerDisposer.deviceManager.on("systemHostLost",                     function()                      { self.onSystemHostLost(); } );
        this.managerDisposer.deviceManager.on("deviceListChanged",                  function(_deviceList)           { self.onDeviceListChanged(_deviceList); } );
        this.managerDisposer.deviceManager.on("mediaRendererAdded",                 function(_deviceUdn, _device)   { self.onMediaRendererAdded(_deviceUdn, _device); } );
        this.managerDisposer.deviceManager.on("mediaRendererRaumfeldAdded",         function(_deviceUdn, _device)   { self.onMediaRendererRaumfeldAdded(_deviceUdn, _device); } );
        this.managerDisposer.deviceManager.on("mediaRendererRaumfeldVirtualAdded",  function(_deviceUdn, _device)   { self.onMediaRendererRaumfeldVirtualAdded(_deviceUdn, _device); } );
        this.managerDisposer.deviceManager.on("mediaServerAdded",                   function(_deviceUdn, _device)   { self.onMediaServerAdded(_deviceUdn, _device); } );
        this.managerDisposer.deviceManager.on("mediaServerRaumfeldAdded",           function(_deviceUdn, _device)   { self.onMediaServerRaumfeldAdded(_deviceUdn, _device); } );
        this.managerDisposer.deviceManager.on("mediaRendererRemoved",               function(_deviceUdn, _name)     { self.onMediaRendererRemoved(_deviceUdn, _name); } );
        this.managerDisposer.deviceManager.on("mediaRendererRaumfeldRemoved",       function(_deviceUdn, _name)     { self.onMediaRendererRaumfeldRemoved(_deviceUdn, _name); } );        
        this.managerDisposer.deviceManager.on("mediaRendererRaumfeldVirtualRemoved",function(_deviceUdn, _name)     { self.onMediaRendererRaumfeldVirtualRemoved(_deviceUdn, _name); } );        
        this.managerDisposer.deviceManager.on("mediaServerRemoved",                 function(_deviceUdn, _name)     { self.onMediaServerRemoved(_deviceUdn, _name); } );
        this.managerDisposer.deviceManager.on("mediaServerRaumfeldRemoved",         function(_deviceUdn, _name)     { self.onMediaServerRaumfeldRemoved(_deviceUdn, _name); } );
        this.managerDisposer.deviceManager.on("rendererStateChanged",               function(_mediaRenderer, _rendererState)                { self.onRendererStateChanged(_mediaRenderer, _rendererState); } );
        this.managerDisposer.deviceManager.on("rendererStateKeyValueChanged",       function(_mediaRenderer, _key, _oldValue, _newValue)    { self.onRendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue); } );       
        
        this.managerDisposer.zoneManager.on("zoneConfigurationChanged",             function(_zoneConfiguration)    { self.onZoneConfigurationChanged(_zoneConfiguration); } );
  
        // start the search for the devices (media servers, renderers, ...)
        this.managerDisposer.deviceManager.discover();
    }
    
    
    onSystemHostFound(_host)
    {
        this.logInfo("Found raumfeld host on: " + _host);
        // when the media server comes online we assume that this is the host, so we get its IP and 
        // tell the zone manager that he now may discover the zone configuration because now we have
        // a valid IP for requesting
        this.managerDisposer.zoneManager.parmSystemHost(_host);
        this.managerDisposer.zoneManager.discover();
        this.emit("systemHostFound", _host);
    }
    
    onSystemHostLost()
    {
        this.logError("Raumfeld host lost!");
        // tell the zone manager that he now may stop discovering the zone configuration because no host is online
        this.managerDisposer.zoneManager.parmSystemHost("");
        this.managerDisposer.zoneManager.stopDiscover(); 
        this.emit("systemHostLost"); 
    }
    
    onDeviceListChanged(_deviceList)
    {
        this.emit("deviceListChanged", _deviceList);
    }
    
    onMediaRendererAdded(_deviceUdn, _device)
    {
        this.emit("mediaRendererAdded", _deviceUdn, _device);
    }
    
    onMediaRendererRaumfeldAdded(_deviceUdn, _device)
    {
        this.emit("mediaRendererRaumfeldAdded", _deviceUdn, _device);
    }
    
    onMediaRendererRaumfeldVirtualAdded(_deviceUdn, _device)
    {
        this.emit("mediaRendererRaumfeldVirtualAdded", _deviceUdn, _device);
    }
    
    onMediaServerAdded(_deviceUdn, _device)
    {
        this.emit("mediaServerAdded", _deviceUdn, _device);
    }
    
    onMediaServerRaumfeldAdded(_deviceUdn, _device)
    {
        this.emit("mediaServerRaumfeldAdded", _deviceUdn, _device);
    }
    
    onMediaRendererRemoved(_deviceUdn, _name)
    {
        this.emit("mediaRendererRemoved", _deviceUdn, _name);
    }
    
    onMediaRendererRaumfeldRemoved(_deviceUdn, _name)
    {
        this.emit("mediaRendererRaumfeldRemoved", _deviceUdn, _name);
    }
    
    onMediaRendererRaumfeldVirtualRemoved(_deviceUdn, _name)
    {
        this.emit("mediaRendererRaumfeldVirtualRemoved", _deviceUdn, _name);
    }
    
    onMediaServerRemoved(_deviceUdn, _name)
    {
        this.emit("mediaServerRemoved", _deviceUdn, _name);
    }
    
    onMediaServerRaumfeldRemoved(_deviceUdn, _name)
    {
        this.emit("mediaServerRaumfeldRemoved", _deviceUdn, _name);
    }
    
    onZoneConfigurationChanged(_zoneConfiguration)
    {
        this.emit("zoneConfigurationChanged", _zoneConfiguration);
    }
    
    onRendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue)
    {
        this.emit("rendererStateKeyValueChanged", _mediaRenderer, _key, _oldValue, _newValue);
    }
    
    onRendererStateChanged(_mediaRenderer, _rendereState)
    {
        this.emit("rendererStateChanged", _mediaRenderer, _rendereState);
    }
     
    
}
