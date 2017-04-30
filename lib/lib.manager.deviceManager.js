'use strict'; 
var Url = require('url');
var Request = require('request');
var SsdpClient = require("node-ssdp").Client;
var ParseString = require('xml2js').parseString;
//var UpnpClient = require('upnp-device-client');
var Bonjour = require('bonjour')
var ManagerBase = require('./lib.manager.base');
var UpnpClient = require('./lib.external.upnp-device-client');
var Tools = require('./lib.tools');

var UPNPMediaRenderer = require('./lib.device.upnp.mediaRenderer');
var UPNPMediaRendererRaumfeld = require('./lib.device.upnp.mediaRenderer.raumfeld');
var UPNPMediaRendererRaumfeldVirtual = require('./lib.device.upnp.mediaRenderer.raumfeldVirtual');
var UPNPMediaServer = require('./lib.device.upnp.mediaServer');
var UPNPMediaServerRaumfeld = require('./lib.device.upnp.mediaServer.raumfeld');

module.exports = class DeviceManager extends ManagerBase
{
    constructor()
    {
        super();
        this.ssdpClient = new SsdpClient({customLogger : this.logUPNP(this), explicitSocketBind : true});
        this.bonjourClient = new Bonjour();
        this.bonjourClientBrowser = null;
        
        this.systemHostFound = false;
        this.systemHost = "";
        this.pingStarted = false;
        
        this.deviceList = null;
        this.mediaServers = new Map();        
        this.mediaRenderers = new Map();
        this.mediaRenderersVirtual = new Map();  
        this.lastUpdateId = "";

        this.raumfeldMediaServerUSN = "";
    }

    
    additionalLogIdentifier()
    {
        return "DeviceManager";
    }
    
    
    logUPNP(self)
    {
        return function(_log)
        {
            self.logSilly(_log);
        }
    }

    
    isFixedHost()
    {
        return this.getSettings().raumfeldHost != "0.0.0.0" ? true : false;
    }
    
    
    discover()
    {
        var self = this;

        // we may have a fixed host, then we do not need any discovery, we only check if the host returns a ping on the given address
        // if this is the case we have found our host and all goes its standard way. If we did not find the host, we only start pinging him (because advertise is disabed on fixed host)
        if (self.isFixedHost())
        {                        
            Request({ url: "http://" + self.getSettings().raumfeldHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/ping", timout: 1500 }, function (error, response, body) {
                if(error || !response)
                {
                    self.logError("Connection with the host '" + self.getSettings().raumfeldHost + "' failed!");
                    if (!self.pingStarted)
                        self.pingHost();
                }
                else
                {
                    self.systemHostDeviceFound(self.getSettings().raumfeldHost);  
                }
            });
        }
        else
        {
            // first start discovering the host via bonjour. If nothing is found via bonjour within a acertain amount of time
            // we do a fallback and use ssdp. If nothing is found via ssdp the host will be searched by bonjour again.
            // when the host is found either visa ssdp or bonjour one of the (the one who found it) will be keeping listening
            // for "down" or "removed" event
            self.discoverHostBonjour();
        }
    }
    
    
    stopDiscoverSSDP()
    {
        if(this.ssdpClient)
            this.ssdpClient.stop();
    }
    
    
    stopDiscoverBonjour()
    {
        if(this.bonjourClientBrowser)
            this.bonjourClientBrowser.stop();
    }
    
    
    discoverHostBonjour()
    {
        var self = this;
        this.logInfo("Start searching for raumfeld host via bonjour");
        self.bonjourClientBrowser = self.bonjourClient.find({}, function (_service) {
            if(_service.fqdn.startsWith("RaumfeldControl"))
            {
                self.logVerbose("Found Bonjour Service on:" + _service.referer.address);
                self.systemHostDeviceFound(_service.referer.address);
                self.stopDiscoverBonjour();
            }
        });
        
        this.bonjourClientBrowser.on("down", function (_service) {
            if(_service.fqdn.startsWith("RaumfeldControl"))
            {
                self.logVerbose("Removed Bonjour Service on:" + _service.referer.address);
                self.systemHostDeviceLost(_service.referer.address);
            }
        });
        
        // let the system search for a while for the host. 
        // if not found we do a fallback search with ssdp
        setTimeout( function(){
            if(!self.systemHostFound)
            {
                self.bonjourClientBrowser.stop();
                self.logWarning("Raumfeld host not found. Retrying discovery with ssdp!");
                self.discoverHostSSDP();
            }
        }, self.getSettings().bonjourDiscoverTimeout);
    }
    
    
    discoverHostSSDP()
    {
        var self = this;
        
        this.ssdpClient.on('response', function (_headers, _statusCode, _rinfo) {
            self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);
            self.systemHostDeviceFound(_headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-alive', function (_headers) {
            self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);
            self.systemHostDeviceFound(_headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-bye', function (_headers) {
            self.logVerbose("Removed SSDP Service on:" + _headers.LOCATION);
            self.systemHostDeviceLost();
        });
        
        this.logInfo("Start searching for raumfeld host vis ssdp");
        self.ssdpClient.search('urn:schemas-raumfeld-com:device:ConfigDevice:1'); 
        // if the host is not found within a certain time we force a Bonjour discovery again
        setInterval( function(){
            if(!self.systemHostFound)
            {
                self.stopDiscoverSSDP();
                self.logWarning("Raumfeld host not found. Retrying discovery with bonjour!");
                //self.ssdpClient.search('urn:schemas-raumfeld-com:device:ConfigDevice:1');                 
                self.discoverHostBonjour();
            }
        }, self.getSettings().ssdpDiscovertimeout);
    }
    
    
    pingHost()
    {
        var self = this;     
        self.pingStarted = true;   
        // if the system host is offline we do not have to ping, otherwise ping until it does not respond
        if(self.systemHost && self.systemHostFound)
        {
            self.logSilly("Check connection with the host!")
            Request({ url: "http://" + self.systemHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/ping", timout: 1500 }, function (error, response, body) {
                if(error || !response)
                {
                    self.logError("Connection with the host '" + self.systemHost + "' failed!");
                    self.systemHostDeviceLost();
                }
            });
        }
        else
        {
            // if we have a fixed ip we have to research on the same ip
            if(self.isFixedHost())
            {     
                self.logSilly("No system host found. Retrying on address: " + self.getSettings().raumfeldHost);              
                self.discover();
            }   
            else                
            {
                self.logSilly("No system host found. Waiting for advertise!");
            }
        }
        setTimeout(function(){self.pingHost();}, self.getSettings().alivePingerIntervall);
    }
    
    
    systemHostDeviceFound(_location)
    {
        // if the host was removed without saying byebye and advertise itself again we have to remove it before
        if(this.systemHostFound)
            this.systemHostDeviceLost();
            
        this.systemHostFound = true;
        
        // the location may be an url or maybe a direct ip address
        if(this.isUrl(_location))
            this.systemHost = Url.parse(_location).hostname;    
        else
            this.systemHost = _location;
            
        // start pinging of system to get an idea when system is offline
        if (!this.pingStarted)
            this.pingHost();
        // when the host is found we may start the long polling of the device information request.
        // That's good to have because then we do not need to discover the devices by ourselves and we do have
        // the same "sight" as the host has        
        this.deviceListRequest();
        this.emit("systemHostFound", this.systemHost);
    }
    
    
    systemHostDeviceLost()
    {
        this.systemHostFound = false;
        this.systemHost = "";
        this.emit("systemHostLost");        
    }
    
    
    deviceListRequest(_updateId = "")
    {
        var self = this;
        if(!this.systemHost)
        {   
            this.logError("Requesting device list without a host!");
            return;
        }

        var options = {            
            url: "http://" + this.systemHost + ":" + this.getSettings().raumfeldHostRequestPort.toString() + "/listDevices",
            headers: {
                'updateId': _updateId
            }
        };
    
        this.logVerbose("Getting device list from http://" + this.systemHost + " with updateId: " + _updateId);
      
        Request(options, function (error, response, body) {
        
            if(error || !response)
            {
                self.logError("Error retrieving the device list from " + self.systemHost + ":" + error);
                // if we do not have any system host we jump out of the request loop.
                // That's okay because the request loop will be triggered again when host comes up again
                if (self.systemHost)                
                    setTimeout(function(){self.deviceListRequest(responseUpdateId);}, 5000);                                
                return;
            }
            
            // get the updateId from the response for creating long polling request
            var responseUpdateId = response.headers['updateid'];
            if(!responseUpdateId)
                responseUpdateId = response.headers['updateId'];
            
            if (response.statusCode == 200) 
            {
                self.logDebug("Device list request returns with updateId: '" + responseUpdateId  + "'");
                self.deviceListChanged(body, responseUpdateId);
                // immediate reselection with a timer with the update id we got from the header
                setTimeout(function(){self.deviceListRequest(responseUpdateId);}, 10);
            }
            else
            {
                self.logError("Error retrieving the device list from " + this.systemHost);
                // if there is an error we retry the request after a while 
                setTimeout(function(){self.deviceListRequest(responseUpdateId);}, 5000);
            }
        });
    }
    
    
    abortDeviceListRequest()
    {       
    }
    
    
    /**
     * this method is getting called when the device list was changed 
     */
    deviceListChanged(_deviceListXML, _lastUpdateId)
    {
        var self = this;
        this.logVerbose("Device list changed");
                       
        // parse the xml data into a "usable" js object and store this object at a class instance
        ParseString(_deviceListXML, function (err, result) {
            if(!err && result)
            {
                self.deviceList = result;
                // build devices from the given device list (merge new devices into list and remove old ones)
                self.updateDeviceInstancesFromDeviceList();
                self.lastUpdateId = _lastUpdateId;
                self.emit("deviceListChanged", self.deviceList);
            }
            else
            {
                self.logError("Error parsing device list result", { "xml": _deviceListXML } );
            }
        });
    }
    
    
    updateDeviceInstancesFromDeviceList()
    {
        if(!this.deviceList)
            return;
        
        // first clean-up devices when creating the new ones from the list
        this.cleanupDevices();
        
        // go through each device and create it (if it's already created, then 'createDevice' will do nothing)
        for(var i=0; i<this.deviceList.devices.device.length; i++)
        {
            var device = this.deviceList.devices.device[i];            
            this.createDevice(device.$.location);
        }
    }
    
    
    cleanupDevices()
    {
        var self = this;
    
        this.logVerbose("Cleaning up devices");
        
        if(!this.deviceList)
            return;
         
        this.logDebug("Cleaning up mediaServers");
        this.mediaServers.forEach( function(_device, _udn){            
            if(!self.existsInDeviceList(_udn))
                self.removeDevice(_udn);
        });
        
        this.logDebug("Cleaning up virtual renderers");        
        this.mediaRenderersVirtual.forEach( function(_device, _udn){            
            if(!self.existsInDeviceList(_udn))
                self.removeDevice(_udn);
        });
       
        this.logDebug("Cleaning up renderers");
        this.mediaRenderers.forEach( function(_device, _udn){            
            if(!self.existsInDeviceList(_udn))
                self.removeDevice(_udn);
        });
        
    }
    
    
    existsInDeviceList(_udn)
    {
        this.logSilly("Check existence of udn '" + _udn + "' in device list");
        for(var i=0; i<this.deviceList.devices.device.length; i++)
        {
            var listUdn = this.deviceList.devices.device[i].$.udn;            
            if(listUdn == _udn)
                return true;
        }
        return false;
    }
    
    
    createDevice(_deviceUrl)
    {
        var self = this;
        var upnpClient = new UpnpClient(_deviceUrl);
        
        this.logDebug("Get device description from " + _deviceUrl);
        upnpClient.getDeviceDescription(function(_err, _description) {
            if(_err)
            {
                self.logError(_err);
            }
            else
            {
                self.logDebug("Got device description from " + _deviceUrl);
                switch (_description.deviceType) 
                {
                    case 'urn:schemas-upnp-org:device:MediaServer:1':
                        self.logVerbose("Media server '" + _description.friendlyName + "' found");
                        if (_description.manufacturer == self.getSettings().raumfeldManufacturerId)
                        {
                            self.logVerbose("Media server '" + _description.friendlyName + "' is useable");                            
                            self.createMediaServerRaumfeld(upnpClient);
                        }
                        else
                        {
                            self.logVerbose("Media server '" + _description.friendlyName + "' is useable");
                            self.createMediaServer(upnpClient);
                        }
                        break;

                    case 'urn:schemas-upnp-org:device:MediaRenderer:1':
                        self.logVerbose("Media renderer '" + _description.friendlyName + "' found");
                        // check if we got a usable media server, in fact for basic usage we do only need to use the virtual renderers
                        // most of the functions on the virtual renderer affect the underlying renderers too! (there are functions on the 
                        // virtual renderers which affect the underlying ones)
                        if (_description.modelDescription == self.getSettings().raumfeldVirtualMediaPlayerModelDescription)
                        {
                            self.logVerbose("Media Renderer '" + _description.friendlyName + "' is useable");
                            self.createMediaRendererRaumfeldVirtual(upnpClient);
                        }
                        else if (_description.manufacturer == self.getSettings().raumfeldManufacturerId)
                        {
                            self.logVerbose("Raumfeld media renderer '" + _description.friendlyName + "' is useable");
                            self.createMediaRendererRaumfeld(upnpClient);
                        }
                        else
                        {
                            self.logVerbose("Media renderer '" + _description.friendlyName + "' is useable");
                            self.createMediaRenderer(upnpClient);
                        }
                        break;

                    default:
                        self.logVerbose("Device '" + _description.friendlyName + "' of type '" + _description.deviceType + "' (" + _description.modelDescription + ") not usable");                        
                }
            }
        });
    }
    
    
    initMediaRendererDevice(_device)
    {
        var self = this;
        
        _device.on("rendererStateKeyValueChanged", function(_mediaRenderer, _key, _oldValue, _newValue){
                self.emit("rendererStateKeyValueChanged", _mediaRenderer, _key, _oldValue, _newValue);
            });
        _device.on("rendererStateChanged", function(_mediaRenderer, _rendererState){
                self.emit("rendererStateChanged", _mediaRenderer, _rendererState);
            });
        _device.on("rendererMediaItemDataChanged", function(_mediaRenderer, _mediaItemData){
                self.emit("rendererMediaItemDataChanged", _mediaRenderer, _mediaItemData);
            });

        _device.parmLogger(this.parmLogger());
        _device.parmManagerDisposer(this.parmManagerDisposer());
        _device.subscribe();
    }
    
    
    createMediaRendererRaumfeldVirtual(_client)
    {
        var alreadyCreated = this.mediaRenderersVirtual.has(_client.deviceDescription.UDN);
        // when the device is already created we do not create it again
        if(alreadyCreated)
        {
            this.logSilly("Device with UDN '" + _client.deviceDescription.UDN + "' already created");
            return;
        }
        
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRendererRaumfeldVirtual(_client);
        this.initMediaRendererDevice(device);
        
        this.mediaRenderersVirtual.set(device.udn(), device);          

        this.logInfo("Virtual media renderer added: " + device.name() + " (" + device.udn() + ")");
        // emit a event so anyone can hook up when a usable renderer was found
        this.emit("mediaRendererRaumfeldVirtualAdded", device.udn(), device);        
    }
    
    
    createMediaRendererRaumfeld(_client)
    {
        var alreadyCreated = this.mediaRenderers.has(_client.deviceDescription.UDN);
        // when the device is already created we do not create it again
        if(alreadyCreated)
        {
            this.logSilly("Device with UDN '" + _client.deviceDescription.UDN + "' already created");
            return;
        }
        
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRendererRaumfeld(_client);
        this.initMediaRendererDevice(device);
        
        this.mediaRenderers.set(device.udn(), device);
        
        // update the "room online" and "mute" state on the virtual media renderers
        // we have to do this because the new renderer found may be a child of any virtual renderer and the
        // room state of this child is hold by the virtual renderer even if child is offline
        this.updateVirtualMediaRenderersStateByChildRenderers();

        this.logInfo("Media renderer added: " + device.name() + " (" + device.udn() + ")");
        // emit a event so anyone can hook up when a usable renderer was found
        this.emit("mediaRendererRaumfeldAdded", device.udn(), device);
    }
    
    
    createMediaRenderer(_client)
    {
        var alreadyCreated = this.mediaRenderers.has(_client.deviceDescription.UDN);
         // when the device is already created we do not create it again
        if(alreadyCreated)
        {
            this.logSilly("Device with UDN '" + _client.deviceDescription.UDN + "' already created");
            return;
        }

        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRenderer(_client);
        this.initMediaRendererDevice(device);
        
        this.mediaRenderers.set(device.udn(), device);        
        
        this.logInfo("Media renderer added: " + device.name() + " (" + device.udn() + ")");
        // emit a event so anyone can hook up when a usable renderer was found
        this.emit("mediaRendererAdded", device.udn(), device);
    }
    
    
    createMediaServerRaumfeld(_client)
    {
        var alreadyCreated = this.mediaServers.has(_client.deviceDescription.UDN);
         // when the device is already created we do not create it again
        if(alreadyCreated)
        {
            this.logSilly("Device with UDN '" + _client.deviceDescription.UDN + "' already created");
            return;
        }
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaServerRaumfeld(_client);
        device.parmLogger(this.parmLogger());
        device.parmManagerDisposer(this.parmManagerDisposer());
        device.subscribe();
        
        this.mediaServers.set(device.udn(), device);
        
        // if the Raumfeld media server is found we store its USN to find it later in the media server device map
        this.raumfeldMediaServerUSN = device.udn();        

        this.logInfo("Raumfeld media server added: " + device.name() + " (" + device.udn() + ")");
        // emit a event so anyone can hook up when a usable renderer was found
        this.emit("mediaServerRaumfeldAdded", device.udn(), device);
    }
    
    
    createMediaServer(_client)
    {
        var alreadyCreated = this.mediaServers.has(_client.deviceDescription.UDN);
         // when the device is already created we do not create it again
        if(alreadyCreated)
        {
            this.logSilly("Device with UDN '" + _client.deviceDescription.UDN + "' already created");
            return;
        }
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaServer(_client);
        device.parmLogger(this.parmLogger());
        device.parmManagerDisposer(this.parmManagerDisposer());
        
        this.mediaServers.set(device.udn(), device);        
        
        this.logInfo("Media Server added: " + device.name() + " (" + device.udn() + ")");        
        // emit a event so anyone can hook up when a usable renderer was found
        this.emit("mediaServerAdded", device.udn(), device);
    }
    
    
    removeDevice(_usn)
    {        
        if(this.mediaRenderersVirtual.has(_usn))
        {
            var deviceName = this.mediaRenderersVirtual.get(_usn).name();
            this.mediaRenderersVirtual.get(_usn).unsubscribe();
            this.mediaRenderersVirtual.delete(_usn)
            this.logWarning("Virtual media renderer removed: " + deviceName);
            // emit a event so anyone can hook up when a usable virtual renderer was removed
            this.emit("mediaRendererRaumfeldVirtualRemoved", _usn, deviceName);
        }
        
        if(this.mediaRenderers.has(_usn))
        {
            var deviceName = this.mediaRenderers.get(_usn).name();
            var isRaumfeldRenderer = this.mediaRenderers.get(_usn).isRaumfeldRenderer();
            this.mediaRenderers.get(_usn).unsubscribe();
            this.mediaRenderers.delete(_usn)
            this.logWarning("Media renderer removed: " + deviceName);
            // emit a event so anyone can hook up when a usable renderer was removed
            if(isRaumfeldRenderer)
            {
                // update the "room online" and "mute" state on the virtual media renderers
                // we have to do this because the new renderer found may be a child of any virtual renderer and the
                // room state of this child is hold by the virtual renderer even if child is offline
                this.updateVirtualMediaRenderersStateByChildRenderers();
                this.emit("mediaRendererRaumfeldRemoved", _usn, deviceName);
            }
            else
            {
                this.emit("mediaRendererRemoved", _usn, deviceName);
            }
        }
        
        if(this.mediaServers.has(_usn))
        {
            var deviceName = this.mediaServers.get(_usn).name();
            this.mediaServers.get(_usn).unsubscribe();
            this.mediaServers.delete(_usn)
            this.logWarning("Media server removed: " + deviceName);            
            // emit a event so anyone can hook up when a usable renderer was removed
            if(this.raumfeldMediaServerUSN == _usn)
            {
                this.raumfeldMediaServerUSN = "";
                this.emit("mediaServerRaumfeldRemoved", _usn, deviceName);
            }
            else
            {
                this.emit("mediaServerRemoved", _usn, deviceName);
            }
        }
    }
    
    
    getDeviceFromUDN(_id)
    {
        if(this.mediaRenderersVirtual.has(_id))
            return this.mediaRenderersVirtual.get(_id);
        if(this.mediaRenderers.has(_id))
            return this.mediaRenderersVirtual.get(_id);
        if(this.mediaServers.has(_id))
            return this.mediaServers.get(_id);
        return null;
    }
    
    
    getDeviceFromName(_name)
    {
        for(var udn of this.mediaRenderersVirtual.keys())
        {
            if(_name == this.mediaRenderersVirtual.get(udn).name())
                return this.mediaRenderersVirtual.get(udn).name()
        }
        for(var udn of this.mediaRenderers.keys())
        {
            if(_name == this.mediaRenderers.get(udn).name())
                return this.mediaRenderers.get(udn).name()
        }
        for(var udn of this.mediaServers.keys())
        {
            if(_name == this.mediaServers.get(udn).name())
                return this.mediaServers.get(udn).name()
        }
        return null;
    }
    
    
    getVirtualMediaRenderer(_idOrChildName)
    {
        this.logDebug("Trying to get virtual media renderer for id or (child)name : " + _idOrChildName);
    
        // First check if the id is an udn of the virtual renderer
        if(this.mediaRenderersVirtual.has(_idOrChildName))
            return this.mediaRenderersVirtual.get(_idOrChildName);
        
        // Then check if perhaps the name of the virtual renderer is the same
        /*
        for(var udn of this.mediaRenderersVirtual.keys())
        {
            if(_idOrChildName.toLowerCase() == this.mediaRenderersVirtual.get(udn).name().toLowerCase())
                return this.mediaRenderersVirtual.get(udn);
        }
        */
        
        // If we come here the id or name perhaps is from a 'child' renderer
        // If that is the case we have to search for it's virtual renderers
        // This info is given in the zoneManager, so we do have a look there        
        var mediaRenderer = this.getMediaRenderer(_idOrChildName);
        if(mediaRenderer)
        {
            var zoneUdn = this.managerDisposer.zoneManager.getVirtualRendererUdnForChildUdnOrName(mediaRenderer.udn());
            if(zoneUdn)
            {
                if(this.mediaRenderersVirtual.has(zoneUdn))
                    return this.mediaRenderersVirtual.get(zoneUdn);
            }
        }

        return null;
    }
    
    
    getMediaRenderer(_idOrName)
    {
        this.logDebug("Trying to get media renderer for id name : " + _idOrName);
        if(!_idOrName)
            return;

        // first check if the id is an udn of the renderer
        if(this.mediaRenderers.has(_idOrName))
            return this.mediaRenderers.get(_idOrName);
        
        // then check if perhaps the name of the renderer is the same
        for(var udn of this.mediaRenderers.keys())
        {
            if(_idOrName.toLowerCase() == this.mediaRenderers.get(udn).roomName().toLowerCase())
            {
                this.logDebug("Media renderer for id : " + _idOrName + " found");
                return this.mediaRenderers.get(udn);
            }
        }
        return null;
    }
    
    
    getRaumfeldMediaServer()
    {
        if(!this.raumfeldMediaServerUSN)
            return null;
        if(this.mediaServers.has(this.raumfeldMediaServerUSN))
            return this.mediaServers.get(this.raumfeldMediaServerUSN);
        return null;
    }
    
    
    isRendererOnline(_rendererUDN)
    {
        if(this.mediaRenderers.has(_rendererUDN))
            return true;
        if(this.mediaRenderersVirtual.has(_rendererUDN))
            return true;
        return false;
    }
    
    
    updateVirtualMediaRenderersStateByChildRenderers()
    {
        for(var udn of this.mediaRenderersVirtual.keys())
        {
            var mediaRendererVirtual = this.mediaRenderersVirtual.get(udn);
            mediaRendererVirtual.updateRendererState_RoomOnlineState();
            mediaRendererVirtual.updateRendererState_MuteState();
        }
    }
    
    
    refreshMediaRendererMediaLists()
    {
        for(var udn of this.mediaRenderersVirtual.keys())
        {
            var mediaRendererVirtual = this.mediaRenderersVirtual.get(udn);
            if(mediaRendererVirtual.rendererState && (mediaRendererVirtual.rendererState.AVTransportURI))
            {
                this.managerDisposer.mediaListManager.loadMediaListForRendererUri(mediaRendererVirtual.udn(), mediaRendererVirtual.rendererState.AVTransportURI,  mediaRendererVirtual.rendererState.AVTransportURIMeteData).catch(function(_data){});
            }
        }
        
        for(var udn of this.mediaRenderers.keys())
        {
            var mediaRenderer = this.mediaRenderers.get(udn);
            if(mediaRenderer.rendererState && (mediaRenderer.rendererState.AVTransportURI))
            {
                this.managerDisposer.mediaListManager.loadMediaListForRendererUri(mediaRenderer.udn(), mediaRenderer.rendererState.AVTransportURI,  mediaRenderer.rendererState.AVTransportURIMetaData).catch(function(_data){});
            }
        }
    }
    
    
    isUrl(_s) 
    {
        return Tools.isUrl(_s);
    }  

}
    