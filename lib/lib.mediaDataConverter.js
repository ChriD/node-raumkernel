'use strict'; 
var BaseManager = require('./lib.base.manager');
var ParseString = require('xml2js').parseString;

module.exports = class Raumkernel extends BaseManager
{
    constructor()
    {
        super();
    }

    additionalLogIdentifier()
    {
        return "MediaDataConverter";
    }
    
    
    convertXMLToMediaList(_xmlString)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
        
            // direct conversion to json
            ParseString(_xmlString, function (_err, _result) {
                if(!_err && _result)
                {
                    var jsonMediaList = [];
                    var containerId = "";
                    
                    // The result is a direct conversion from an xml to a json object. 
                    // That's ok but ist not very nice for handling, so we do a conversion. 
                    // If we will get into a performance problem we should consider to change this code to parse directly into a nice 
                    // json format without the step xml to xml-json  to nice-json
                    if(_result["DIDL-Lite"].item)
                    {
                        containerId = "item";
                    }
                    
                    if(_result["DIDL-Lite"].container)
                    {
                        containerId = "container";
                    }
                    
                    var containerArray = _result["DIDL-Lite"][containerId];
                    for (var item of containerArray) 
                    {
                        try
                        {
                            jsonMediaList.push(self.convertContainer(item));
                        }
                        catch(_exception)
                        {
                            // to keep the correct size of the array we put a dummy media info into the list
                            // TODO: we may set the title to "Unknown" or something like this
                            jsonMediaList.push({});    
                            self.logError("Error converting media item: " + JSON.stringify(item), _exception);
                        }
                        }
                    
                    
                    _resolve(jsonMediaList);
                }
                else
                {
                    self.logError("Error parsing media item list", { "xml": _xmlString } );
                    _reject("Error parsing media item list");
                }
            });
        });
    }
    
    
    convertContainer(_mediaContainer)
    {
        var newObject = {};
  
        // copy all the main keys
        this.copyRootData(newObject, _mediaContainer);
        
        switch (newObject.class.toLowerCase())
        {
            case "object.container":
                this.copyContainerData(newObject, _mediaContainer);
                break;
            case "object.container.person.musicArtist":
                this.copyArtistData(newObject, _mediaContainer);
                break;
            case "object.item.audioitem.musictrack":
                this.copyTrackData(newObject, _mediaContainer);
                break;
            case "object.container.album.musicAlbum":
                this.copyAlbumData(newObject, _mediaContainer);
                break;
            case "object.container.trackContainer.allTracks":
                this.copyAlbumData(newObject, _mediaContainer);
                break;
            default:
                this.copyContainerData(newObject, _mediaContainer);
        }
        
        //this.logWarning(JSON.stringify(newObject));
        
        return newObject;
    }

    
    getData(_object, _id, _stdValue = null)
    {
        if(_object[_id])
        {
            if(_object[_id].length)
                return _object[_id][0];
        }
        return _stdValue;
    }
    
    
    copyRootData(_newObject, _mediaContainer)
    {
        _newObject["class"] = this.getData(_mediaContainer, "upnp:class");
        _newObject["section"] = this.getData(_mediaContainer, "raumfeld:section");
        _newObject["name"] = this.getData(_mediaContainer, "raumfeld:name");
        _newObject["durability"] = this.getData(_mediaContainer, "raumfeld:durability");
    
        for(var key in _mediaContainer.$)
        {
            _newObject[key] = _mediaContainer.$[key];
        }
    }
   
   
    copyContainerData(_newObject, _mediaContainer)
    {
        _newObject["title"] = this.getData(_mediaContainer, "dc:title");
    }
   
   
    copyArtistData(_newObject, _mediaContainer)
    {
        this.copyContainerData(_newObject, _mediaContainer);
        _newObject["artist"] = this.getData(_mediaContainer, "upnp:artist");
        
        // if there is an "album art uri" then use it
        if(_mediaContainer["upnp:albumArtURI"] && _mediaContainer["upnp:albumArtURI"][0])
            _newObject["albumArtURI"] = _mediaContainer["upnp:albumArtURI"][0]._;
    }
    
    
    copyAlbumData(_newObject, _mediaContainer)
    {
        this.copyArtistData(_newObject, _mediaContainer);
        _newObject["album"] = this.getData(_mediaContainer, "upnp:album");
        _newObject["date"] = this.getData(_mediaContainer, "dc:date");
    }
    
    
    copyTrackData(_newObject, _mediaContainer)
    {
        this.copyAlbumData(_newObject, _mediaContainer);
        
        //_newObject["title"] = this.getData(_mediaContainer, "dc:title");
        _newObject["originalTrackNumber"] = this.getData(_mediaContainer, "upnp:originalTrackNumber");
        _newObject["creator"] = this.getData(_mediaContainer, "dc:creator");
        _newObject["genre"] = this.getData(_mediaContainer, "dc:genre");
        
        // if there is an "album art uri" then use it
        //if(_mediaContainer["upnp:albumArtURI"] && _mediaContainer["upnp:albumArtURI"][0])
        //    _newObject["albumArtURI"] = _mediaContainer["upnp:albumArtURI"][0]._;
        
        // if there is a "res" section the copy the data from there
        if(_mediaContainer["res"] && _mediaContainer["res"].length)
        {
            for(var key in _mediaContainer.res[0].$)
            {
                _newObject[key] = _mediaContainer.res[0].$[key];
            }
        }
    }
}

   