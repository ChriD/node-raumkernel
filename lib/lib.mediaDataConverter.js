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
            ParseString(_xmlString, {explicitChildren: true, preserveChildrenOrder: true}, function (_err, _result) {
                if(!_err && _result)
                {
                    try
                    {
                        var jsonMediaList = [];
                        var containerId = "";
                        
                        if(!_result["DIDL-Lite"])
                        {
                            self.logError("Wrong formatted XML", { "xml": _xmlString } );
                            _reject(new Error("Wrong formatted XML"));
                            return;
                        }
                        
                        // we may get an empty list
                        if((!_result["DIDL-Lite"].item && !_result["DIDL-Lite"].container))
                        {
                            self.logDebug("Got empty list");
                             _resolve(jsonMediaList);
                            return;
                        }
                        
                        // The result is a direct conversion from an xml to a json object. 
                        // That's ok but ist not very nice for handling, so we do a conversion. 
                        // If we will get into a performance problem we should consider to change this code to parse directly into a nice 
                        // json format without the step xml to xml-json  to nice-json

                        if(_result["DIDL-Lite"]["$$"])
                        {
                            var containerArray = _result["DIDL-Lite"]["$$"];
                            for (var item of containerArray)
                            {
                                try
                                {
                                    jsonMediaList.push(self.convertContainer(item));
                                }
                                catch(_exception)
                                {
                                    // to keep the correct size of the array we put a dummy media info into the lists
                                    jsonMediaList.push({ "title": "UNKNOWN" });
                                    self.logError("Error converting media item: " + JSON.stringify(item), _exception);
                                }
                            }
                        }


                        _resolve(jsonMediaList);
                        
                    }
                    catch(_exception)
                    {
                        self.logError("Error converting media item list", { "xml": _xmlString } );
                        _reject(_exception);
                    }
                }
                else
                {
                    self.logError("Error parsing media item list", { "xml": _xmlString } );
                    _reject(new Error("Error parsing media item list"));
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
            case "object.container.person.musicartist":
                this.copyArtistData(newObject, _mediaContainer);
                break;
            case "object.item.audioitem.musictrack":
                this.copyTrackData(newObject, _mediaContainer);
                break;
            case "object.container.album.musicalbum":
                this.copyAlbumData(newObject, _mediaContainer);
                break;
            case "object.container.trackcontainer.alltracks":
                this.copyAlbumData(newObject, _mediaContainer);
                break;
            case "object.item.audioitem.audiobroadcast.radio":
                this.copyRadioData(newObject, _mediaContainer);
                break;
            case "object.container.favoritescontainer":
                this.copyFavouritesContainerData(newObject, _mediaContainer);
                break;
            case "object.container.playlistcontainer":
                this.copyPlaylistContainerData(newObject, _mediaContainer);
                break;
            case "object.item.audioitem.audiobroadcast.linein":
                this.copyLineInData(newObject, _mediaContainer);
                break;
            case "object.container.album.musicalbum.compilation":
                this.copyMusicalbumCompilationData(newObject, _mediaContainer);
                break;
            case "object.container.playlistcontainer.shuffle":
                this.copyPlaylistcontainerShuffleData(newObject, _mediaContainer);
                break;    
            case "object.container.playlistcontainer.queue":
                this.copyPlaylistcontainerQueueData(newObject, _mediaContainer);
                break;
            case "object.container.albumcontainer":
                this.copyAlbumcontainerData(newObject, _mediaContainer);
                break;
            case "object.container.genre.musicgenre":
                this.copyGenreMusicgenreData(newObject, _mediaContainer);
                break;
            case "object.container.person.musiccomposer":
                this.copyMusiccomposerData(newObject, _mediaContainer);
                break;
            case "object.container.storagefolder":
                this.copyStorageFolderData(newObject, _mediaContainer);
                break;      
            case "object.container.playlistcontainer.shuffle.search":
                this.copyPlaylistcontainerShuffleSearchData(newObject, _mediaContainer);
                break;           
            case "object.container.trackcontainer":
                this.copyTrackContainerData(newObject, _mediaContainer);
                break;
            case "object.item.audioitem.audiobroadcast.rhapsody":
                this.copyAudiobroadcastRhapsodyData(newObject, _mediaContainer);
                break;
            default:
                this.logWarning("Unhandled media item type: " + newObject.class.toLowerCase(), _mediaContainer);
                this.copyContainerData(newObject, _mediaContainer);
        }            

        return newObject;
    }

    
    getData(_object, _id, _stdValue = null)
    {
        if(_object[_id])
        {
            if(_object[_id].length)
                return _object[_id][0];
            else
                return _object[_id];
        }
        return _stdValue;
    }
    
    
    copyRootData(_newObject, _mediaContainer)
    {
        _newObject["class"] = this.getData(_mediaContainer, "upnp:class");
        _newObject["section"] = this.getData(_mediaContainer, "raumfeld:section");
        _newObject["name"] = this.getData(_mediaContainer, "raumfeld:name");
        _newObject["durability"] = this.getData(_mediaContainer, "raumfeld:durability");
        _newObject["childCount"] = this.getData(_mediaContainer, "childCount");
    
        for(var key in _mediaContainer.$)
        {
            _newObject[key] = _mediaContainer.$[key];
        }
    }
   
   
    copyContainerData(_newObject, _mediaContainer)
    {
        _newObject["title"] = this.getData(_mediaContainer, "dc:title");
        _newObject["description"] = this.getData(_mediaContainer, "dc:description");
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
        this.copyGenreData(_newObject, _mediaContainer);
        _newObject["album"] = this.getData(_mediaContainer, "upnp:album");
        _newObject["date"] = this.getData(_mediaContainer, "dc:date");        
        _newObject["creator"] = this.getData(_mediaContainer, "dc:creator");
    }
    

    copyGenreData(_newObject, _mediaContainer)
    {
        _newObject["genre"] = this.getData(_mediaContainer, "dc:genre");
    }
    

    copyTrackData(_newObject, _mediaContainer)
    {
        this.copyAlbumData(_newObject, _mediaContainer);
        
        _newObject["originalTrackNumber"] = this.getData(_mediaContainer, "upnp:originalTrackNumber");    
        
        // if there is a "res" section the copy the data from there
        if(_mediaContainer["res"] && _mediaContainer["res"].length)
        {
            for(var key in _mediaContainer.res[0].$)
            {
                _newObject[key] = _mediaContainer.res[0].$[key];
            }
        }
    }


    copyRadioData(_newObject, _mediaContainer)
    {
        this.copyTrackData(_newObject, _mediaContainer);

        _newObject["signalStrength"] = this.getData(_mediaContainer, "upnp:signalStrength");
        _newObject["ebrowse"] = this.getData(_mediaContainer, "raumfeld:ebrowse");
    }


    copyFavouritesContainerData(_newObject, _mediaContainer)
    {
        this.copyContainerData(_newObject, _mediaContainer);
    }


    copyPlaylistContainerData(_newObject, _mediaContainer)
    {
        this.copyContainerData(_newObject, _mediaContainer);
    }


    copyLineInData(_newObject, _mediaContainer)
    {
        this.copyContainerData(_newObject, _mediaContainer);

        if(_mediaContainer["res"] && _mediaContainer["res"].length)
        {    
            if(_mediaContainer["res"][0]["_"])
                _newObject["stream"] = _mediaContainer["res"][0]["_"]; 
            if(_mediaContainer["res"][0]["$"] && _mediaContainer["res"][0]["$"]["protocolInfo"])
                _newObject["protocolInfo"] = _mediaContainer["res"][0]["$"]["protocolInfo"]; 
        }
    }

    
    copyMusicalbumCompilationData(_newObject, _mediaContainer)
    {
        this.copyAlbumData(_newObject, _mediaContainer);
    }


    copyPlaylistcontainerShuffleData(_newObject, _mediaContainer)
    {
        this.copyContainerData(_newObject, _mediaContainer);
    }


     copyPlaylistcontainerQueueData(_newObject, _mediaContainer)
     {
         this.copyContainerData(_newObject, _mediaContainer);
     }


     copyAlbumcontainerData(_newObject, _mediaContainer)
     {
        this.copyContainerData(_newObject, _mediaContainer);
     }


     copyGenreMusicgenreData(_newObject, _mediaContainer)
     {  
         this.copyContainerData(_newObject, _mediaContainer); 
         this.copyGenreData(_newObject, _mediaContainer);         
     }


     copyMusiccomposerData(_newObject, _mediaContainer)
     {
        this.copyContainerData(_newObject, _mediaContainer);
         _newObject["numberOfAlbums"] = this.getData(_mediaContainer, "numberOfAlbums");         
     }


     copyStorageFolderData(_newObject, _mediaContainer)
     {
        this.copyContainerData(_newObject, _mediaContainer);
     }


     copyPlaylistcontainerShuffleSearchData(_newObject, _mediaContainer)
     {
        this.copyContainerData(_newObject, _mediaContainer);
     }


     copyTrackContainerData(_newObject, _mediaContainer)
     {
         this.copyContainerData(_newObject, _mediaContainer);

         // if there is an "album art uri" then use it
         if(_mediaContainer["upnp:albumArtURI"] && _mediaContainer["upnp:albumArtURI"][0])
             _newObject["albumArtURI"] = _mediaContainer["upnp:albumArtURI"][0]._;
     }


     copyAudiobroadcastRhapsodyData(_newObject, _mediaContainer)
     {
         this.copyAlbumData(_newObject, _mediaContainer);
     }
    
}

   