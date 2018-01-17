'use strict'; 
var Logger = require('./lib.logger');
var BaseManager = require('./lib.base.manager');
var ManagerDisposer = require('./lib.managerDisposer');

var SsdpClient = require("node-ssdp").Client;


module.exports = class DiscoverHostDevice extends BaseManager
{
    constructor()
    {
        super();        
        this.bonjourClient = null
        this.bonjourBrowser = null
        this.ssdpClient = null
        this.deviceFoundSign = false
        this.deviceLostSign = false
    }


    init()
    {    
        var self = this

        self.stopDiscover()               
        self.createBonjourClient()
        self.createSSDPClient();
                     
    }

    createBonjourClient()
    {        
        if(this.bonjourClient)
        {
            this.bonjourClient.destroy()
            this.bonjourClient = null
        }
        this.bonjourClient = require('bonjour')()
        this.createBonjourBrowser()        
    }

    createBonjourBrowser()
    {
        var self = this

        if(this.bonjourBrowser)
            this.bonjourBrowser.stop()
        this.bonjourBrowser = this.bonjourClient.find({})
        
        this.bonjourBrowser.on("up", function (_service) {
            if(_service.fqdn.startsWith("RaumfeldControl"))
            {
                self.deviceFound(_service.referer.address, _service.fqdn, _service, "BONJOUR")       
            }            
        })
        
        this.bonjourBrowser.on("down", function (_service) {  
            if(_service.fqdn.startsWith("RaumfeldControl"))
            { 
                self.deviceLost(_service.referer.address, _service.fqdn, _service, "BONJOUR")
            }
        })
    }


    createSSDPClient()
    {
        var self = this

        if(this.ssdpClient)
            this.ssdpClient.stop()        
        this.ssdpClient = new SsdpClient({explicitSocketBind : true})

        this.ssdpClient.on('response', function (_headers, _statusCode, _rinfo) {
            self.deviceFound(_headers.LOCATION, "", _headers, "SSDP")           
        });
        
        this.ssdpClient.on('advertise-alive', function (_headers) {
            self.deviceFound(_headers.LOCATION, "", _headers, "SSDP")           
        });
        
        this.ssdpClient.on('advertise-bye', function (_headers) {
            self.deviceLost(_headers.LOCATION, "", _headers, "SSDP")
        });
                
        self.ssdpClient.search('urn:schemas-raumfeld-com:device:ConfigDevice:1'); 
    }


    deviceFound(_address, _name, _service, _type)
    {
        if(!this.deviceFoundSign)
        {
            this.deviceFoundSign = true
            this.emit("deviceFound", { "address" : _address, "name" : _name, "type" : _type, origService: _service })
        }
    }

    deviceLost(_service)
    {    
        if(!this.devicLostSign)
        {
            this.deviceLostSign = true
            this.emit("deviceLost", { "address" : _address, "name" : _name, "type" : _type, origService: _service })
        }
    }


    startDiscover()
    {
        this.logDebug("Start HOST discovering")
        // start discovering with both types of discover (bonjour and ssdp)
        // the one who will find the device firts is the winner
        if(this.bonjourBrowser)
            this.bonjourBrowser.start()
        if(this.ssdpClient)
            this.ssdpClient.start()
    }


    stopDiscover()
    {
        this.logDebug("Stop HOST discovering")
        if(this.bonjourBrowser)
            this.bonjourBrowser.stop()  
        if(this.ssdpClient)
            this.ssdpClient.stop();  
    }


    updateDiscover()
    {       
        this.logDebug("Updateing HOST dicovery...")

        // clear found devices list for the update to catch again
        this.deviceFoundSign = false
        this.deviceLostSign = false

        // recreate bonjour and ssdp client to be sure it works well
        this.createBonjourBrowser()
        this.bonjourBrowser.start()
        this.createSSDPClient()
        this.ssdpClient.start()     
    }    

}