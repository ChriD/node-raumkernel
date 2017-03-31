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

                        // there may be 2 types of containers that are returned. "items"" and "containers" and both may may be in the same result
                        // so we have to 'loop' over the 2 types beginning with the containers
                        for(var type=1; type<=2; type++)
                        {

                            containerId = "";
                            if(type === 1 && _result["DIDL-Lite"].container) 
                                containerId = "container";   
                            if(type === 2 && _result["DIDL-Lite"].item) 
                                containerId = "item";                                                         
                        
                            if(containerId)
                            {
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
                                        jsonMediaList.push({ "title": "UNKNOWN" });
                                        self.logError("Error converting media item: " + JSON.stringify(item), _exception);
                                    }
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
             //case "object.container.trackcontainer":
             //   this.copyRadioData(newObject, _mediaContainer);9
              //  break;     1

            //object.container.playlistcontainer.queue childCount=0, parentID=0/Zones, id=0/Zones/uuid%3A00000000-5416-48ec-0000-0000541648ec, restricted=0, raumfeld:section=[Zones], dc:title=[Track List], raumfeld:name=[Playlist], upnp:class=[object.container.playlistContainer.queue]
            //object.container.albumcontainer parentID=0/My Music, id=0/My Music/Albums, restricted=1, childCount=2746, raumfeld:name=[Albums], upnp:class=[object.container.albumContainer], raumfeld:section=[My Music], dc:title=[Albums]
            //object.container.genre.musicgenre parentID=0/My Music/Genres, id=0/My Music/Genres/%28255%29, restricted=1, childCount=2, raumfeld:name=[Genre], upnp:class=[object.container.genre.musicGenre], raumfeld:section=[My Music], dc:title=[(255)], upnp:genre=[(255)], dc:description=[Dennis Wilson], res=[_=dlna-playcontainer://uuid%3Af27c27d7-0d31-44a1-b9d1-b16653c1569f?sid=urn%3Aupnp-org%3AserviceId%3AContentDirectory&cid=0%2FMy%20Music%2FGenres%2F%2528255%2529%2FAllTracks&fid=0&fii=0&sc=%2Bupnp%3Aalbum%2C%2Bupnp%3AoriginalTrackNumber%2C%2Bdc%3Atitle, protocolInfo=dlna-playcontainer:*:application/xml:*]
            //object.container.person.musiccomposer parentID=0/My Music/Composers, id=0/My Music/Composers/A.%20McLeod%2C%20D.%20Weston, restricted=1, childCount=2, numberOfAlbums=1, raumfeld:name=[Composer], upnp:class=[object.container.person.musicComposer], raumfeld:section=[My Music], dc:title=[A. McLeod, D. Weston], res=[_=dlna-playcontainer://uuid%3Af27c27d7-0d31-44a1-b9d1-b16653c1569f?sid=urn%3Aupnp-org%3AserviceId%3AContentDirectory&cid=0%2FMy%20Music%2FComposers%2FA.%2520McLeod%252C%2520D.%2520Weston%2FAllTracks&fid=0&fii=0&sc=%2Bupnp%3Aalbum%2C%2Bupnp%3AoriginalTrackNumber%2C%2Bdc%3Atitle, protocolInfo=dlna-playcontainer:*:application/xml:*]
            //object.container.storagefolder parentID=0/My Music/ByFolder, id=0/My Music/ByFolder/uuid%3A2fbf0788-ff92-4282-9ea1-017f602e9367, restricted=1, childCount=27, raumfeld:name=[Folder], upnp:class=[object.container.storageFolder], raumfeld:section=[My Music], dc:title=[Artists on 10.0.0.111]
            //object.container.playlistcontainer.shuffle.search parentID=0/Playlists/Shuffles, id=0/Playlists/Shuffles/Genres, restricted=1, raumfeld:name=[Genres], upnp:class=[object.container.playlistContainer.shuffle.search], raumfeld:section=[Playlists], dc:title=[My Music - Select Genres]
            //object.container.trackcontainer parentID=0/Napster/Genres/g.5, id=0/Napster/Genres/g.5/Tracks, restricted=1, raumfeld:name=[Tracks], upnp:class=[object.container.trackContainer], raumfeld:section=[Napster], raumfeld:durability=[1800], dc:title=[Tracks]
            //object.item.audioitem.audiobroadcast.rhapsody parentID=0/Napster/Radios/AllRadios, id=0/Napster/Radios/AllRadios/ps.54600871, restricted=1, upnp:albumArtURI=[_=http://static.rhap.com/img/150x100/0/6/5/3/8483560_150x100.jpg, dlna:profileID=JPEG_TN], upnp:album=[00s Radio], dc:title=[00s Radio], res=[_=rhapsody-radio://ps.54600871?service=Napster, protocolInfo=rhapsody-radio:*:audio/rhapsody-radio:*], raumfeld:name=[Radio], upnp:class=[object.item.audioItem.audioBroadcast.rhapsody], raumfeld:section=[Napster], raumfeld:durability=[1800]

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
        _newObject["genre"] = this.getData(_mediaContainer, "dc:genre");
        _newObject["creator"] = this.getData(_mediaContainer, "dc:creator");
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
    
}

   