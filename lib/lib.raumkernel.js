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
        // if there is no logger defined we do create a standard logger
        if(!this.parmLogger())
            this.createLogger();
            
        this.logVerbose("Setting up manager disposer");
        
        // create the manager disposer and let him create the managers
        this.managerDisposer = new ManagerDisposer();
        this.managerDisposer.parmLogger(this.parmLogger());        
        this.managerDisposer.createManagers();        
        
        // start the search for the devices (media servers, renderers, ...)
        this.managerDisposer.deviceManager.discover();
    }
}
