'use strict'; 
var Url = require('url');
var Request = require('request');
var SsdpClient = require("node-ssdp").Client;
var ParseString = require('xml2js').parseString;
//var UpnpClient = require('upnp-device-client');
var ManagerBase = require('./lib.manager.base');
var UpnpClient = require('./lib.external.upnp-device-client');

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
        
        this.systemHostFound = false;
        this.systemHost = "";
        
        this.deviceList = null;
        this.mediaServers = new Map();        
        this.mediaRenderers = new Map();
        this.mediaRenderersVirtual = new Map();         

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
    
    
    discover()
    {
        var self = this;
    
        this.ssdpClient.on('response', function (_headers, _statusCode, _rinfo) {
            self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);              
            self.systemHostDeviceFound(_headers.USN, _headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-alive', function (_headers) {
            self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);
            self.systemHostDeviceFound(_headers.USN, _headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-bye', function (_headers) {
            self.logVerbose("Removed SSDP Service on:" + _headers.USN);            
            self.systemHostDeviceLost(_headers.USN);
        });
        
        // we do start for searching the raumfeld host by searching for the configuration device
        this.discoverHost();
    }
    
    
    stopDiscover()
    {
        this.ssdpClient.stop();
    }
    
    
    discoverHost()
    {
        var self = this;
        this.logInfo("Start searching for raumfeld host");
        self.ssdpClient.search('urn:schemas-raumfeld-com:device:ConfigDevice:1'); 
        // if the host is not found within a certain time we force a SSDP discovery again
        // if the host is offline we force the search again and again and again....
        setInterval( function(){
            if(!self.systemHostFound)
            {
                self.logWarning("Raumfeld host not found. Retrying discovery!");
                self.ssdpClient.search('urn:schemas-raumfeld-com:device:ConfigDevice:1'); 
            }
        }, 5000);
    }
    
    
    pingHost()
    {
        var self = this;
        // if the system host is offline we do not have to ping, otherwise ping until it does not respond
        if(this.systemHost && this.systemHostFound)
        {
            Request({ url: "http://" + this.systemHost + ":" + "47365/ping", timout: 1000 }, function (error, response, body) {
                if(error || !response)
                {
                    self.logError("Connection with the host " + this.systemHost + " failed!");
                    self.systemHostDeviceLost();                
                }                
            });
        }
        setTimeout(function(){self.pingHost();}, 2500);
    }
    
    
    systemHostDeviceFound(_usn, _location)
    {
        // if the host was removed without saying byebye and advertise itself again we have to remove it before
        if(this.systemHostFound)
            this.systemHostDeviceLost(_usn);
    
        this.systemHostFound = true;
        this.systemHost = Url.parse(_location).hostname;    
        // start pinging of system to get an idea when system is offline
        this.pingHost();
        // when the host is found we may start the long polling of the device information request.
        // That's good to have because then we do not need to discover the devices by ourselves and we do have
        // the same "sight" as the host has        
        this.deviceListRequest();
        this.emit("systemHostFound", this.systemHost);
    }
    
    
    systemHostDeviceLost(_usn)
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
            // TODO: Port should be in a settings file
            url: "http://" + this.systemHost + ":" + "47365/listDevices",
            headers: {
                'updateId': _updateId
            }
        };
    
        this.logVerbose("Getting device list from http://" + this.systemHost + " with updateId: " + _updateId);
      
        Request(options, function (error, response, body) {
        
            if(error || !response)
            {
                self.logError("Error retrieving the device list from " + this.systemHost + ":" + error);
                // so in fact it may be that the host was shut down or was rebooted if we get no valid response or an error
                // for that we assume the host is down and trigger the appropriate methods and start researching again
                self.systemHostDeviceLost();                
            }
        
            // get the updateId from the response for creating long polling request
            var responseUpdateId = response.headers['updateid'];
            if(!responseUpdateId)
                responseUpdateId = response.headers['updateId'];
            
            if (response.statusCode == 200) 
            {
                self.logDebug("Device list request returns with updateId: '" + responseUpdateId  + "'");
                self.deviceListChanged(body);
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
    deviceListChanged(_deviceListXML)
    {
        var self = this;
        this.logVerbose("Device list changed");
                       
        // parse the xml data into a "usable" js object and store this object at a class instance
        ParseString(_deviceListXML, function (err, result) {
            if(!err && result)
            {
                self.deviceList = result;
                self.emit("deviceListChanged", self.deviceList);
                // build devices from the given device list (merge new devices into list and remove old ones)
                self.updateDeviceInstancesFromDeviceList();
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
                        if (_description.manufacturer == "Raumfeld GmbH")  // TODO: use manufacturer from config file?!
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
                        if (_description.modelDescription == "Virtual Media Player")  // TODO: use description from config file?!
                        {
                            self.logVerbose("Media Renderer '" + _description.friendlyName + "' is useable");
                            self.createMediaRendererRaumfeldVirtual(upnpClient);
                        }
                        else if (_description.manufacturer == "Raumfeld GmbH")  // TODO: use manufacturer from config file?!
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
        device.parmLogger(this.parmLogger());
        device.subscribe();
        
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
        device.parmLogger(this.parmLogger());
        device.subscribe();
        
        this.mediaRenderers.set(device.udn(), device);          

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
        device.parmLogger(this.parmLogger());
        device.subscribe();
        
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
            this.mediaRenderers.get(_usn).unsubscribe();
            this.mediaRenderers.delete(_usn)
            this.logWarning("Media renderer removed: " + deviceName);            
            // emit a event so anyone can hook up when a usable renderer was removed
            this.emit("mediaRendererremoved", _usn, deviceName);
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

}
    