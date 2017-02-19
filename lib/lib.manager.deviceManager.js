'use strict'; 
var ManagerBase = require('./lib.manager.base');
var SsdpClient = require("node-ssdp").Client;
var UpnpClient = require('upnp-device-client');

var UPNPMediaRenderer = require('./lib.device.upnp.mediaRenderer');
var UPNPMediaRendererRaumfeldVirtual = require('./lib.device.upnp.mediaRenderer.raumfeldVirtual');
var UPNPMediaServer = require('./lib.device.upnp.mediaServer');
var UPNPMediaServerRaumfeld = require('./lib.device.upnp.mediaServer.raumfeld');

module.exports = class DeviceManager extends ManagerBase
{
    constructor()
    {
        super();
        this.ssdpClient = new SsdpClient();
        
        this.mediaServers = new Map();
        this.mediaRenderers = new Map();
        this.mediaRenderersVirtual = new Map(); 

        this.raumfeldMediaServerUSN = "";
    }

    
    additionalLogIdentifier()
    {
        return "DeviceManager";
    }
    
    
    discover()
    {
        var self = this;
    
        this.ssdpClient.on('response', function (_headers, _statusCode, _rinfo) {
            self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);   
            self.createDevice(_headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-alive', function (_headers) {
            self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);
            self.createDevice(_headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-bye', function (_headers) {
            self.logVerbose("Removed SSDP Service on:" + _headers.USN);            
            self.removeDevice(_headers.USN);
        });        
    
        this.logInfo("Start searching for usable renderers");
        this.ssdpClient.search('urn:schemas-upnp-org:device:MediaRenderer:1');
        
        this.logInfo("Start searching for usable media servers");
        this.ssdpClient.search('urn:schemas-upnp-org:device:MediaServer:1');        
    }
    
    
    stopDiscover()
    {
        this.ssdpClient.stop();
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
        if(alreadyCreated)
            this.mediaRenderersVirtual.get(_client.deviceDescription.UDN).unsubscribe(); 
        
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRendererRaumfeldVirtual(_client);
        device.parmLogger(this.parmLogger());
        device.subscribe();
        
        this.mediaRenderersVirtual.set(device.udn(), device);  
        
        if(alreadyCreated)
        {
            this.logVerbose("Virtual media renderer updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Virtual media renderer added: " + device.name() + " (" + device.udn() + ")");
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaRendererRaumfeldVirtualAdded", device.udn(), device);        
        }
    }
    
    createMediaRenderer(_client)
    {
        var alreadyCreated = this.mediaRenderers.has(_client.deviceDescription.UDN);
        if(alreadyCreated)
            this.mediaRenderers.get(_client.deviceDescription.UDN).unsubscribe();
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRenderer(_client);
        device.parmLogger(this.parmLogger());
        device.subscribe();
        
        this.mediaRenderers.set(device.udn(), device);        
        
        if(alreadyCreated)
        {
            this.logVerbose("Media renderer updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Media renderer added: " + device.name() + " (" + device.udn() + ")");
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaRendererAdded", device.udn(), device);
        }
    }
    
    createMediaServerRaumfeld(_client)
    {
        var alreadyCreated = this.mediaServers.has(_client.deviceDescription.UDN);
        if(alreadyCreated)
            this.mediaServers.get(_client.deviceDescription.UDN).unsubscribe();
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaServerRaumfeld(_client);
        device.parmLogger(this.parmLogger());
        device.subscribe();
        
        this.mediaServers.set(device.udn(), device);  
        // if the Raumfeld media server is found we store its USN to find it later in the media server device map
        this.raumfeldMediaServerUSN = device.udn();
                
        if(alreadyCreated)
        {
            this.logVerbose("Raumfeld media server updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Raumfeld media server added: " + device.name() + " (" + device.udn() + ")");
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaServerRaumfeldAdded", device.udn(), device);
        }
    }
    
    createMediaServer(_client)
    {
        var alreadyCreated = this.mediaServers.has(_client.deviceDescription.UDN);
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaServer(_client);
        device.parmLogger(this.parmLogger());
        
        this.mediaServers.set(device.udn(), device);  
                
        if(alreadyCreated)
        {
            this.logVerbose("Media server updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Media Server added: " + device.name() + " (" + device.udn() + ")");        
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaServerAdded", device.udn(), device);
        }
    }
    
    
    removeDevice(_usn)
    {        
        if(this.mediaRenderersVirtual.has(_usn))
        {
            var deviceName = this.mediaRenderersVirtual.get(_usn).name();
            this.mediaRenderersVirtual.delete(_usn)
            this.logWarning("Virtual media renderer removed: " + deviceName);            
            // emit a event so anyone can hook up when a usable virtual renderer was removed
            this.emit("mediaRendererRaumfeldVirtualRemoved", _usn, deviceName);
        }
        
        if(this.mediaRenderers.has(_usn))
        {
            var deviceName = this.mediaRenderers.get(_usn).name();
            this.mediaRenderers.delete(_usn)
            this.logWarning("Media renderer removed: " + deviceName);            
            // emit a event so anyone can hook up when a usable renderer was removed
            this.emit("mediaRendererremoved", _usn, deviceName);
        }
        
        if(this.mediaServers.has(_usn))
        {
            var deviceName = this.mediaServers.get(_usn).name();
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
    