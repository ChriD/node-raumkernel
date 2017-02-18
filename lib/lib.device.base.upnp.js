'use strict'; 
var Device = require('./lib.device.base');

/**
 * this is the base class to use for child's which are UPNP devices
 */
module.exports = class UPNPDevice extends Device
{
    constructor(_upnpClient)
    {
        super();
        this.upnpClient = _upnpClient;
    }
    
    name()
    {
        return this.upnpClient.deviceDescription.friendlyName;
    }

    id()
    {
        // in fact USN/UDN should not be used as an ID as mentioned here: https://www.w3.org/2009/dap/track/issues/151
        return this.upnpClient.deviceDescription.UDN;
    }
    
    /**
     * used to return a the UDN of the device
     * @return {String} the UDN of the UPNP device
     */    
    udn()
    {       
        return this.upnpClient.deviceDescription.UDN;
    }
    
    /**
     * used to return a the modelNumber of the device
     * @return {String} the modelNumber of the UPNP device
     */  
    modelNumber()
    {
        return this.upnpClient.deviceDescription.modelNumber;
    }
    
    /**
     * used to return a the manufacturer of the device
     * @return {String} the manufacturer of the UPNP device
     */  
    manufacturer()
    {
        return this.upnpClient.deviceDescription.manufacturer;
    }
    
    /**
     * used to return a the friendlyName of the device
     * @return {String} the friendlyName of the UPNP device
     */  
    friendlyName()
    {
        return this.upnpClient.deviceDescription.friendlyName;
    }
    
}