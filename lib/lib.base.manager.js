'use strict'; 
var Logger = require('./lib.logger');
var Base = require('./lib.base');

/**
 * this is the base class to use for child's which have to have access to the manager instances
 */
module.exports = class BaseManager extends Base
{
    constructor()
    {
        super();
        this.managerDisposer = null;
    }
    
    /**
     * used to set or to get the manager disposer object    
     * @param {Object} the instanced of the manager disposer
     * @return {Object} the instanced of the manager disposer
     */
    parmManagerDisposer(_managerDisposer = this.managerDisposer)
    {
        this.managerDisposer = _managerDisposer;
        return this.managerDisposer;
    }

    /**
     * used to return the settings from the raumkernel instance         
     * @return {Object} the settings of the kernel
     */
    getSettings()
    {
        if(!this.managerDisposer || !this.managerDisposer.raumkernel)
            return {};
        return this.managerDisposer.raumkernel.settings;
    }
}