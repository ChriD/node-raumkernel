const Readline = require('readline');
var Raumkernel = require('./lib/lib.raumkernel');

setWelcomeScreen();

var idStack = [];
var tp0;
var tpDuration;
var raumkernel = new Raumkernel();
raumkernel.createLogger(1, "logs");
raumkernel.init();


function perfMeassure(_start) {
    if ( !_start ) return process.hrtime();
    var end = process.hrtime(_start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}


// set up a callback to show the "reading state" of a media list that is beeing read
// of course this will be called on any browse wherer the "emit" parameter is active
raumkernel.on("mediaListDataPackageReady", function(_id, _mediaListDataPkg, _pkgIdx, _pgkIdxEnd, _pkgDataCount)
{ 
    console.log('\033[2J');
    console.log("--------------------------------");
    console.log("Reading Data: " + (_pgkIdxEnd+1).toString());
    console.log("--------------------------------");
});


// browse to root when system is ready
raumkernel.on("systemReady", function(_ready){
    browse("0");
});


function browse(_id, _backwards = false, _addToStack = true)
{
    setLoadingScreen(_id);

    if(_backwards)
        idStack.pop();
    else if(_addToStack)
        idStack.push(_id); 
    
    tp0 = perfMeassure();
        
    raumkernel.managerDisposer.mediaListManager.getMediaList(_id, _id, true, true, 25).then(function(_data){
        tpDuration = perfMeassure(tp0);
        viewBrowseResult(_id, _data);
    }).catch(function(_data){
        viewError(_data);
    });
}

 
function viewBrowseResult(_id, _data)
{
    console.log('\033[2J');
    console.log(JSON.stringify(idStack) + " --> " + _id);   
    console.log("--------------------------------");
    
    if(_data && _data.length)
    {
        for(var i=0; i<_data.length; i++)
        {
            console.log(i.toString() + " - " + _data[i].title);
        }
    }
    else
    {
        console.log("# No data available");
    }
    console.log("--------------------------------");
    console.log("Loading time: " +  (tpDuration) + " ms");
    console.log("--------------------------------");
    console.log("x BROWSE BACK");
    console.log("--------------------------------");
    
    var readLine1 = Readline.createInterface({input: process.stdin, output: process.stdout});
    readLine1.question('Choose ID: ', (_input) => {
        readLine1.close();
        if(_data[_input])
        {
            browse(_data[_input].id);
        }
        else 
        {
            if(_input.toLowerCase() == "x" && idStack.length > 1)
            {
                var parentId = idStack[idStack.length-2];
                browse(parentId, true);
            }
            else
            {
                browse(_id, false, false);
            }
        }
    });
}


function viewError(_data)
{
    console.log('\033[2J'); 
    console.log('Error occured: ' + _data); 
    
    var readLine1 = Readline.createInterface({input: process.stdin, output: process.stdout});
    readLine1.question("Press [ENTER] to start at root again!", (_input) => {
        readLine1.close();
        idStack = [];
        browse("0");
    });
}


function setLoadingScreen(_id)
{
    console.log('\033[2J');    
    console.log("Loading list for id :" + _id);
    console.log("Please wait! Certain id's can take a lot of time!");
}


function setWelcomeScreen()
{
    console.log('\033[2J');    
    console.log("Please wait till the raumfeld system is found!")
}
 

function execute(){
}


setInterval(execute,1000);