'use strict'; 
var Logger = require('./lib.logger');
var Base = require('./lib.base');
var DeviceManager = require('./lib.manager.deviceManager');

/**
 * this is the manager disposer class. 
 * it holds all available managers
 */
module.exports = class ManagerDisposer extends Base
{
    constructor()
    {
        super();
        this.deviceManager = null;
    }
    
    additionalLogIdentifier()
    {
        return "ManagerDisposer";
    }
    
    createManagers()
    {
        this.createDeviceManager();
    }

    createDeviceManager()
    {
        this.logVerbose("Creating device manager");
        this.deviceManager = new DeviceManager();
        this.deviceManager.parmLogger(this.parmLogger());
        this.deviceManager.parmManagerDisposer(this);
    }    

}