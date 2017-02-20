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
    createLogger(_logLevel = 2)
    {
        this.parmLogger(new Logger(_logLevel));
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
        
        // start the search for the devices (media servers, renderers, ...)
        this.managerDisposer.deviceManager.on("systemHostFound", function(_host) { self.onSystemHostFound(_host)} );
        this.managerDisposer.deviceManager.on("systemHostLost",  function()      { self.onSystemHostLost()} );
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
    }
    
    onSystemHostLost()
    {
        this.logError("Raumfeld host lost!");
        // tell the zone manager that he now may stop discovering the zone configuration because no host is online
        this.managerDisposer.zoneManager.parmSystemHost("");
        this.managerDisposer.zoneManager.stopDiscover();        
    }
    
}
