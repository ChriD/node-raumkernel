'use strict'; 
var ManagerBase = require('./lib.manager.base');
var SsdpClient = require("node-ssdp").Client;
var UpnpClient = require('upnp-device-client');
var EventEmitter = require("events").EventEmitter;

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
        //this.eventEmitter = new EventEmitter();
        
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
        var _self = this;
    
        this.ssdpClient.on('response', function (_headers, _statusCode, _rinfo) {
            _self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);   
            _self.createDevice(_headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-alive', function (_headers) {
            _self.logVerbose("Found SSDP Service on:" + _headers.LOCATION);
            _self.createDevice(_headers.LOCATION);
        });
        
        this.ssdpClient.on('advertise-bye', function (_headers) {
            _self.logVerbose("Removed SSDP Service on:" + _headers.USN);            
            _self.removeDevice(_headers.USN);
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
        var _self = this;
        var upnpClient = new UpnpClient(_deviceUrl);
        
        this.logDebug("Get device description from " + _deviceUrl);
        upnpClient.getDeviceDescription(function(_err, _description) {
            if(_err)
            {
                _self.logError(_err);
            }
            else
            {
                _self.logDebug("Got device description from " + _deviceUrl);
                switch (_description.deviceType) 
                {
                    case 'urn:schemas-upnp-org:device:MediaServer:1':
                        _self.logVerbose("Media Server '" + _description.friendlyName + "' found");
                        if (_description.manufacturer == "Raumfeld GmbH")  // TODO: use manufacturer from config file?!
                        {
                            _self.logVerbose("Media Server '" + _description.friendlyName + "' is useable");
                            _self.createMediaServerRaumfeld(upnpClient);
                        }
                        else
                        {
                            _self.logVerbose("Media Server '" + _description.friendlyName + "' is useable");
                            _self.createMediaServer(upnpClient);
                        }                        
                        break;

                    case 'urn:schemas-upnp-org:device:MediaRenderer:1':
                        _self.logVerbose("Media Renderer '" + _description.friendlyName + "' found");
                        // check if we got a usable media server, in fact for basic usage we do only need to use the virtual renderers
                        // most of the functions on the virtual renderer affect the underlying renderers too! (there are functions on the 
                        // virtual renderers which affect the underlying ones)
                        if (_description.modelDescription == "Virtual Media Player")  // TODO: use description from config file?!
                        {
                            _self.logVerbose("Media Renderer '" + _description.friendlyName + "' is useable");
                            _self.createMediaRendererRaumfeldVirtual(upnpClient);
                        }
                        else
                        {
                            _self.logVerbose("Media Renderer '" + _description.friendlyName + "' is useable");
                            _self.createMediaRenderer(upnpClient);
                        }
                        break;

                    default:
                        _self.logVerbose("Device '" + _description.friendlyName + "' of type '" + _description.deviceType + "' (" + _description.modelDescription + ") not usable");                        
                }                   
            }
        });
    }
    
    
    createMediaRendererRaumfeldVirtual(_client)
    {        
        var alreadyCreated = this.mediaRenderersVirtual.has(_client.deviceDescription.UDN);
        
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRendererRaumfeldVirtual(_client);
        this.mediaRenderersVirtual.set(device.udn(), device);  
        
        if(alreadyCreated)
        {
            this.logVerbose("Virtual Media Renderer updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Virtual Media Renderer added: " + device.name() + " (" + device.udn() + ")");
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaRendererRaumfeldVirtualAdded", device.udn(), device);        
        }
    }
    
    createMediaRenderer(_client)
    {
        var alreadyCreated = this.mediaRenderers.has(_client.deviceDescription.UDN);
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaRenderer(_client);
        this.mediaRenderers.set(device.udn(), device);
        
        if(alreadyCreated)
        {
            this.logVerbose("Media Renderer updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Media Renderer added: " + device.name() + " (" + device.udn() + ")");
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaRendererAdded", device.udn(), device);
        }
    }
    
    createMediaServerRaumfeld(_client)
    {
        var alreadyCreated = this.mediaServers.has(_client.deviceDescription.UDN);
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaServerRaumfeld(_client);
        this.mediaServers.set(device.udn(), device);  
        // if the Raumfeld media server is found we store its USN to find it later in the media server device map
        this.raumfeldMediaServerUSN = device.udn();
                
        if(alreadyCreated)
        {
            this.logVerbose("Raumfeld Media Server updated: " + device.name() + " (" + device.udn() + ")");
        }
        else
        {
            this.logInfo("Raumfeld Media Server added: " + device.name() + " (" + device.udn() + ")");
            // emit a event so anyone can hook up when a usable renderer was found
            this.emit("mediaServerRaumfeldAdded", device.udn(), device);
        }
    }
    
    createMediaServer(_client)
    {
        var alreadyCreated = this.mediaServers.has(_client.deviceDescription.UDN);
    
        // create the renderer object and store it into the internal map for further usage
        var device = new UPNPMediaServer(_client);
        this.mediaServers.set(device.udn(), device);  
                
        if(alreadyCreated)
        {
            this.logVerbose("Media Server updated: " + device.name() + " (" + device.udn() + ")");
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
            this.logWarning("Virtual Media Renderer removed: " + deviceName);            
            // emit a event so anyone can hook up when a usable virtual renderer was removed
            this.emit("mediaRendererRaumfeldVirtualRemoved", _usn, deviceName);
        }
        
        if(this.mediaRenderers.has(_usn))
        {
            var deviceName = this.mediaRenderers.get(_usn).name();
            this.mediaRenderers.delete(_usn)
            this.logWarning("Media Renderer removed: " + deviceName);            
            // emit a event so anyone can hook up when a usable renderer was removed
            this.emit("mediaRendererremoved", _usn, deviceName);
        }
        
        if(this.mediaServers.has(_usn))
        {
            var deviceName = this.mediaServers.get(_usn).name();
            this.mediaServers.delete(_usn)
            this.logWarning("Media Server removed: " + deviceName);            
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
    