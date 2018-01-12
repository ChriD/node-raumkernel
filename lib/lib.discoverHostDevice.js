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
        this.ssdpClient = null;
    }


    init()
    {    
        var self = this

        self.stopDiscover()       
        //self.tinkerhubMDSNBrowser = null        
        //self.tinkerhubMDSNBrowser = new TinkerhubMDSN.browser({type: '', protocol: 'udp'})
        //this.ssdpClient = new SsdpClient({customLogger : this.logUPNP(this), explicitSocketBind : true});
        //this.ssdpClient = new SsdpClient({explicitSocketBind : true})
        
        self.createBonjourClient()
        //self.createSSDPClient();
                     
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
                self.deviceFound(_service.referer.address, _service.fqdn, _service)       
            }            
        })
        
        this.bonjourBrowser.on("down", function (_service) {  
            if(_service.fqdn.startsWith("RaumfeldControl"))
            { 
                self.deviceLost(_service.referer.address, _service.fqdn, _service)
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
            self.deviceFound(_headers.LOCATION, "", _headers)           
        });
        
        this.ssdpClient.on('advertise-alive', function (_headers) {
            self.deviceFound(_headers.LOCATION, "", _headers)           
        });
        
        this.ssdpClient.on('advertise-bye', function (_headers) {
            self.deviceLost(_headers.LOCATION, "", _headers)
        });
                
        self.ssdpClient.search('urn:schemas-raumfeld-com:device:ConfigDevice:1'); 
    }


    deviceFound(_address, _name, _service)
    {
        this.emit("deviceFound", { "address" : _address, "name" : _name, origService: _service })
    }

    deviceLost(_service)
    {    
        this.emit("deviceLost", { "address" : _address, "name" : _name, origService: _service })
    }


    startDiscover()
    {            
        if(this.bonjourBrowser)
            this.bonjourBrowser.start()
        if(this.ssdpClient)
            this.ssdpClient.start()
    }


    stopDiscover()
    {
        if(this.bonjourBrowser)
            this.bonjourBrowser.stop()  
        if(this.ssdpClient)
            this.ssdpClient.stop();  
    }


    updateDiscover()
    {       
        this.createBonjourBrowser()
        this.bonjourBrowser.start()
        //this.createSSDPClient()
        //this.ssdpClient.start()     
    }    

}