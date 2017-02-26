'use strict'; 
var BaseManager = require('./lib.base.manager');

/**
 * this is the base class to use for child's which are devices
 */
module.exports = class Device extends BaseManager
{
    constructor()
    {
        super();
    }
    
    /**
     * used to return a readable name for a device        
     * @return {String} a readable name for the device
     */
    name()
    {
        return "";
    }
    
    /**
     * used to return a unique Id for a device        
     * @return {String} a unique id for the device
     */
    id()
    {
        return "";
    }
}