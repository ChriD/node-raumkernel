'use strict'; 
var Logger = require('./lib.logger');
var BaseManager = require('./lib.base.manager');
var ManagerDisposer = require('./lib.managerDisposer');

var QueueControllerNativePlaylist = require('./lib.queueController.nativePlaylist');
var QueueControllerZonePlaylist = require('./lib.queueController.zonePlaylist');

module.exports = class Raumkernel extends BaseManager
{
    constructor()
    {
        super();        
        this.systemReady = false;
        this.systemHostReady = false;
        this.mediaServerReady = false;
        this.zoneConfigReady = false;
        this.deviceListReady = false;
        
        this.nativePlaylistController = new QueueControllerNativePlaylist();
        this.zonePlaylistController = new QueueControllerZonePlaylist();

        this.settings = {}
        this.settings.raumfeldHost = "0.0.0.0";
        this.settings.raumfeldHostRequestPort = 47365;
        this.settings.raumfeldManufacturerIds = new Array();
        this.settings.raumfeldManufacturerIds[0] = "Raumfeld GmbH";
        this.settings.raumfeldManufacturerIds[1] = "Lautsprecher Teufel GmbH";
        this.settings.raumfeldVirtualMediaPlayerModelDescription = "Virtual Media Player";
        this.settings.alivePingerIntervall = 3500;
        this.settings.ssdpDiscovertimeout = 5000;
        this.settings.bonjourDiscoverTimeout = 3000;     
        this.settings.uriMetaDataTemplateFile =  "lib/setUriMetadata.template";
        this.settings.rendererStateTriggerConfirmationTimout = 3500;
        this.settings.zoneTriggerConfirmationTimout = 6000;
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
        
        // TODO: disbale logger
        // if there is no logger defined we do create a standard logger
        //if(!this.parmLogger())
        //    this.createLogger();
        
        this.logVerbose("Setting up manager disposer");
        
        // create the manager disposer and let him create the managers
        this.managerDisposer = new ManagerDisposer();
        this.managerDisposer.parmLogger(this.parmLogger());        
        this.managerDisposer.parmRaumkernel(this);
        this.managerDisposer.createManagers();
        
        this.logVerbose("Creating controllers");
        
        this.nativePlaylistController = new QueueControllerNativePlaylist();
        this.nativePlaylistController.parmLogger(this.parmLogger());
        this.nativePlaylistController.parmManagerDisposer(this.managerDisposer);
        this.nativePlaylistController.init();
        this.zonePlaylistController = new QueueControllerZonePlaylist();
        this.zonePlaylistController.parmLogger(this.parmLogger());
        this.zonePlaylistController.parmManagerDisposer(this.managerDisposer);
        this.zonePlaylistController.init();
                
        this.logDebug("Bind manager events");
                
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
        this.managerDisposer.deviceManager.on("rendererStateKeyValueChanged",       function(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn)    { self.onRendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn); } );
        this.managerDisposer.deviceManager.on("rendererMediaItemDataChanged",       function(_mediaRenderer, _mediaItemData)                { self.onRendererMediaItemDataChanged(_mediaRenderer, _mediaItemData); } );
        
        this.managerDisposer.zoneManager.on("zoneCreated",                          function(_zoneUDN)              { self.onZoneCreated(_zoneUDN); } );
        this.managerDisposer.zoneManager.on("zoneRemoved",                          function(_zoneUDN)              { self.onZoneRemoved(_zoneUDN); } );
        this.managerDisposer.zoneManager.on("roomAddedToZone",                      function(_zoneUDN, _roomUDN)    { self.onRoomAddedToZone(_zoneUDN, _roomUDN); } );
        this.managerDisposer.zoneManager.on("roomRemovedFromZone",                  function(_zoneUDN, _roomUDN)    { self.onRoomRemovedFromZone(_zoneUDN, _roomUDN); } );
        this.managerDisposer.zoneManager.on("zoneConfigurationChanged",             function(_zoneConfiguration)    { self.onZoneConfigurationChanged(_zoneConfiguration); } );        
        
        this.managerDisposer.mediaListManager.on("mediaListDataReady",              function(_id, _mediaListData)                                           { self.onMediaListDataReady(_id, _mediaListData); } );
        this.managerDisposer.mediaListManager.on("mediaListDataPackageReady",       function(_id, _mediaListDataPkg, _pkgIdx, _pgkIdxEnd, _pkgDataCount)    { self.onMediaListDataPackageReady(_id, _mediaListDataPkg, _pkgIdx, _pgkIdxEnd,_pkgDataCount); } );
        this.managerDisposer.mediaListManager.on("mediaRendererPlaylistReady",      function(_id, _mediaListData)                                           { self.onMediaRendererPlaylistReady(_id, _mediaListData); } );
        
        this.managerDisposer.infodataManager.on("combinedZoneStateChanged",         function(_combinedZoneState)    { self.onCombinedZoneStateChanged(_combinedZoneState) } )

        // start the search for the devices (media servers, renderers, ...)
        this.managerDisposer.deviceManager.discover();
    }
    
    
    setSystemReady()
    {
        // system is ready when the zones are retrieved, the device list was gathered and if there is an raumfeld media server active
        var oldSystemReady = this.systemReady;
        this.systemReady = this.mediaServerReady && this.zoneConfigReady && this.deviceListReady && this.systemHostReady
        if(this.systemReady != oldSystemReady)
            this.emit("systemReady", this.systemReady);
    }
    
    
    onSystemHostFound(_host)
    {
        this.logInfo("Found raumfeld host on: " + _host);        
        this.managerDisposer.zoneManager.parmSystemHost(_host);
        this.managerDisposer.zoneManager.requestZones();            
        this.systemHostReady = true;
        this.setSystemReady();        
        this.emit("systemHostFound", _host);
    }
    
    onSystemHostLost()
    {
        this.logError("Raumfeld host lost!");
        // tell the zone manager that he now may stop discovering the zone configuration because no host is online
        this.managerDisposer.zoneManager.parmSystemHost("");        
        this.managerDisposer.zoneManager.stopRequestZones();        
        this.systemHostReady = false;
        this.mediaServerReady = false;
        this.zoneConfigReady = false;
        this.deviceListReady = false;
        this.setSystemReady();        
        this.emit("systemHostLost"); 
    }
    
    onDeviceListChanged(_deviceList)
    {
        this.deviceListReady = true;
        this.setSystemReady();    
        this.emit("deviceListChanged", _deviceList);
    }
    
    onMediaRendererAdded(_deviceUdn, _device)
    {
        this.emit("mediaRendererAdded", _deviceUdn, _device)
    }
    
    onMediaRendererRaumfeldAdded(_deviceUdn, _device)
    {
        this.emit("mediaRendererRaumfeldAdded", _deviceUdn, _device)
    }
    
    onMediaRendererRaumfeldVirtualAdded(_deviceUdn, _device)
    {
        this.emit("mediaRendererRaumfeldVirtualAdded", _deviceUdn, _device)       
        // try to trigger the 'zoneCreated' event
        this.managerDisposer.infodataManager.mediaRendererRaumfeldVirtualAdded(_deviceUdn, _device)
        this.managerDisposer.zoneManager.triggerZoneCreated(_deviceUdn)
    }
    
    onMediaServerAdded(_deviceUdn, _device)
    {
        this.emit("mediaServerAdded", _deviceUdn, _device);
    }
    
    onMediaServerRaumfeldAdded(_deviceUdn, _device)
    {
        this.nativePlaylistController.parmMediaServer(_device);
        this.zonePlaylistController.parmMediaServer(_device);
        this.managerDisposer.mediaListManager.parmMediaServer(_device);
        this.mediaServerReady = true;
        this.setSystemReady();
        
        // refresh lists for all renderers.
        this.managerDisposer.deviceManager.refreshMediaRendererMediaLists();
        
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
        // try to trigger the 'zoneRemoved' event.
        this.managerDisposer.zoneManager.triggerZoneRemoved(_deviceUdn);

    }
    
    onMediaServerRemoved(_deviceUdn, _name)
    {
        this.emit("mediaServerRemoved", _deviceUdn, _name);
    }
    
    onMediaServerRaumfeldRemoved(_deviceUdn, _name)
    {
        this.nativePlaylistController.parmMediaServer(null);
        this.zonePlaylistController.parmMediaServer(null);
        this.managerDisposer.mediaListManager.parmMediaServer(null);
        this.mediaServerReady = false;
        this.setSystemReady();  
        this.emit("mediaServerRaumfeldRemoved", _deviceUdn, _name);
    }
    
    onZoneConfigurationChanged(_zoneConfiguration)
    {
        this.zoneConfigReady = true
        this.setSystemReady()
        this.managerDisposer.infodataManager.zoneConfigurationChanged(_zoneConfiguration)
        this.emit("zoneConfigurationChanged", _zoneConfiguration)
    }
    
    onRendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn)
    {
        // when the track uri is changing we have to refresh the media list for the renderer
        // we can do this of course only when the media renderer is found already, otherwise it will be triggered by the media renderer aapearance
        if(this.mediaServerReady)
        {
            if(_key.toLowerCase() == "avtransporturi")
            {
                if(_newValue && _mediaRenderer.rendererState.AVTransportURIMetaData)                 
                    this.managerDisposer.mediaListManager.loadMediaListForRendererUri(_mediaRenderer.udn(), _newValue, _mediaRenderer.rendererState.AVTransportURIMetaData).catch(function(_data){});
            }
            if(_key.toLowerCase() == "avtransporturimetadata")
            {
                if(_newValue && _mediaRenderer.rendererState.AVTransportURI) 
                    this.managerDisposer.mediaListManager.loadMediaListForRendererUri(_mediaRenderer.udn(), _mediaRenderer.rendererState.AVTransportURI, _newValue).catch(function(_data){});
                // av transport uri metadata will containe the datata as currenttrackmetadata and some more (album ect.)
                // we do only update the "track" type, this is done in the "updateCurrentMediaItemInfo" itself
                //_mediaRenderer.updateCurrentMediaItemInfo(_newValue);
            }
            if(_key.toLowerCase() == "currenttrackmetadata")
            {
                _mediaRenderer.lastCurrentTrackMetadata = _newValue
                _mediaRenderer.updateCurrentMediaItemInfo(_newValue);
            }
             
        }
        
        this.managerDisposer.infodataManager.rendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn)
        // renderer states can do some triggers, so add it to the trigger manager
        this.managerDisposer.triggerManager.trigger("renderer", "rendererStateKeyValueChanged", {  "rendererUdn": _mediaRenderer.udn(),
                                                                                    "key": _key,  
                                                                                    "value": _newValue,
                                                                                    "oldValue": _oldValue,
                                                                                    "roomUdn": _roomUdn });

        this.emit("rendererStateKeyValueChanged", _mediaRenderer, _key, _oldValue, _newValue, _roomUdn);
    }
    
    onRendererStateChanged(_mediaRenderer, _rendereState)
    {
        this.managerDisposer.infodataManager.rendererStateChanged( _mediaRenderer, _rendereState)
        this.emit("rendererStateChanged", _mediaRenderer, _rendereState)
    }
    
    
    onMediaListDataReady(_id, _mediaListData)
    {
        this.emit("mediaListDataReady", _id, _mediaListData);
    }


    onMediaListDataPackageReady(_id, _mediaListDataPkg, _pkgIdx, _pgkIdxEnd, _pkgDataCount)
    {
        this.emit("mediaListDataPackageReady", _id, _mediaListDataPkg, _pkgIdx, _pgkIdxEnd, _pkgDataCount);
    }
    
    
    onMediaRendererPlaylistReady(_id, _mediaListData)
    {        
        this.emit("mediaRendererPlaylistReady", _id, _mediaListData);
    }
    
    
    onRendererMediaItemDataChanged(_mediaRenderer, _currentMediaItemData)
    {
        this.managerDisposer.infodataManager.rendererMediaItemDataChanged(_mediaRenderer, _currentMediaItemData)        
        this.emit("rendererMediaItemDataChanged", _mediaRenderer, _currentMediaItemData);
    }


    onZoneCreated(_zoneUDN)
    {
        this.emit("zoneCreated", _zoneUDN);
    }


    onZoneRemoved(_zoneUDN)
    {
        this.emit("zoneRemoved", _zoneUDN);
    }


    onRoomAddedToZone(_zoneUDN, _roomUDN)
    {
        this.emit("roomAddedToZone", _zoneUDN, _roomUDN);
    }


    onRoomRemovedFromZone(_zoneUDN, _roomUDN)
    {
        this.emit("roomRemovedFromZone", _zoneUDN, _roomUDN);
    }

    
    onCombinedZoneStateChanged(_combinedZoneState)
    {
        this.emit("combinedZoneStateChanged", _combinedZoneState)
    }


    getSettings()
    {
        return this.settings;
    }
    
}
