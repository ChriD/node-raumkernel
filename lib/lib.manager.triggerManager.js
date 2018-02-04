'use strict'; 
var Url = require('url');
var ManagerBase = require('./lib.manager.base');


module.exports = class TriggerManager extends ManagerBase
{
    constructor()
    {
        super()
        this.triggers = {}
    }

    additionalLogIdentifier()
    {
        return "TriggerManager";
    }

    /**
     * trigger a change in a state of the system (renderer, zones, ...)
     * @param {String} context of the trigger
     * @param {String} type of the trigger
     * @param {Object} dta for the trigger
     * @return {Promise} ???
     */
    trigger(_context, _type, _data)
    {    
        var triggerFound = true;
        // search triggers for valid trigger and do a shot if found. If its a one shot trigger, then remove it from the array
        // i have to keep an eye on the performance here...
        var mapKey = this.createTriggerKey(_context, _type, _data)
        //while(triggerFound) // oh my goodness... endless loop :-)
        {
            if(this.triggers[mapKey] && this.triggers[mapKey].length)
            {                
                var triggerArray = this.triggers[mapKey]
                var i = triggerArray.length        
                while (i--) 
                {  
                    var keyValueIsSet = false
                    if(_context == "renderer" && _type == "rendererStateKeyValueChanged")
                    {
                        // we have to  bes sure we trigger for the right renderer
                        if(triggerArray[i].data.rendererUdn && triggerArray[i].data.rendererUdn != _data.rendererUdn)
                            continue

                        // we may have ranged a room in the trigger event, so check it
                        if(triggerArray[i].data.roomUdn && triggerArray[i].data.roomUdn != _data.roomUdn)
                            continue

                        if(triggerArray[i].data.values)
                        {
                            for(var x=0; x<triggerArray[i].data.values.length; x++)
                            {
                                if(triggerArray[i].data.values[x].toString().toLowerCase() == _data.value.toString().toLowerCase())
                                    keyValueIsSet = true
                            }
                        }
                        else
                        {
                            if(triggerArray[i].data.value.toString().toLowerCase() == _data.value.toString().toLowerCase())
                                keyValueIsSet = true
                        }

                        if(keyValueIsSet)
                        {
                            triggerArray[i].callback(triggerArray[i], _data);
                            if (triggerArray[i].oneShot)
                            {
                                triggerArray.splice(i,1);
                            }
                        }    
                    }

                    if(_context == "zone")
                    {
                        if(_type == "zoneCreated")
                        {     
                            if(triggerArray[i].data.roomUDN.toString().toLowerCase() == _data.roomUDN.toString().toLowerCase())
                            {
                                triggerArray[i].callback(triggerArray[i], _data);
                                if (triggerArray[i].oneShot)
                                {
                                    triggerArray.splice(i,1);
                                }
                            }
                        }
                        else
                        {
                            triggerArray[i].callback(triggerArray[i], _data);
                            if (triggerArray[i].oneShot)
                            {
                                triggerArray.splice(i,1);
                            }
                        }
                        /*
                       

                        if(_type == "zoneRemoved")
                        {     
                            if(triggerArray[i].data.zoneUDN.toString().toLowerCase() == _data.zoneUDN.toString().toLowerCase())
                            {
                                triggerArray[i].callback(triggerArray[i], _data);
                                if (triggerArray[i].oneShot)
                                {
                                    triggerArray.splice(i,1);
                                }
                            }
                        }

                        if(_type == "roomAddedToZone" || _type == "roomRemovedFromZone")
                        {     
                            if( triggerArray[i].data.zoneUDN.toString().toLowerCase() == _data.zoneUDN.toString().toLowerCase() && 
                                triggerArray[i].data.roomUDN.toString().toLowerCase() == _data.roomUDN.toString().toLowerCase())
                            {
                                triggerArray[i].callback(triggerArray[i], _data);
                                if (triggerArray[i].oneShot)
                                {
                                    triggerArray.splice(i,1);
                                }
                            }
                        }
                        */
                    }
                    
                    // TODO: Other contexts           
                }
                triggerFound = false
            }
            else
            {
                triggerFound = false;
            }
        }        
    }


    setupTrigger(_context, _type, _triggerData, _oneShot, _callback)
    {
        var self = this;
        this.logDebug("Trigger for " + _context  + "// " + _type + " was set up", _triggerData);               
        
        var mapKey = this.createTriggerKey(_context, _type, _triggerData)
   
        if(!this.triggers[mapKey])
            this.triggers[mapKey] = new Array()

        // Add trigger data to triggers    
        this.triggers[mapKey].push({
            "context"   : _context,
            "type"      : _type, 
            "data"      : _triggerData,
            "oneShot"   : _oneShot,
            "callback"  : _callback
        });
    }


    createTriggerKey(_context, _type, _data)
    {
        var key = _context + '|' + _type + '|' 
        if(_context == "renderer" && _type == "rendererStateKeyValueChanged")
            key += _data.key;
        else if(_context == "zone" && _type == "zoneCreated")
            key += _data.roomUDN;
        else if(_context == "zone")
            key += _data.zoneUDN + '|' + _data.roomUDN;
        return key;
    }

    /* e.g.:

        trigger("renderer", "rendererStateChanged", {   "renderer" : "uuid:000:xxx:fff"
                                                        "key": "volume"  
                                                        "value": 25
            })

        trigger("renderer", "rendererStateChanged", {   "renderer" : "uuid:000:xxx:fff"
                                                        "key": "TransportState"  
                                                        "value": "PLAYING"
            })

        trigger("renderer", "rendererStateChanged", {   "renderer" : "uuid:000:xxx:fff"
                                                        "key": "Online"  
                                                        "value": true
            })

        trigger("system", "systemStateChanged", {   "key": "Online"  
                                                    "value": true
            })

        trigger("zone", "roomAddedToZone", {  "zone": "uuid:000:xxx:fff"  
                                        "value": "Bad"
            })

        trigger("zone", "roomRemovedFromZone", {  "zone": uuid:000:xxx:fff"  
                                          "value": "Bad"
            })

        trigger("zone", "zoneCreated", {  "renderer": "uuid:000:xxx:fff"                                                                                      
            })

        ----------------------------------

        e.g.: Wait for transport state to be playing
        setupTrigger("renderer", "rendererStateChanged", { "renderer" : "uuid:000:xxx:fff", "key": "TransportState" , "value": "PLAYING" }, true, function(){
            _resolve();
        })

    */    

}