$(document).ready(function() {

    tableau.extensions.initializeDialogAsync().then(function(openPayload) {
        console.log(tableau.extensions.settings.getAll());
        $('[data-toggle="tooltip"]').tooltip();
        populateSheetList();
        setDefaultGoogleSheet();
        validateConfiguration();
    });

});

// Gets list of worksheets in workbook and populates dropdown
function populateSheetList() {
    console.log('Populating workSheet list.');
    document.getElementById('divWorksheetSelector').style.display = "flex";

    let options = "";
    let t = 0;
    for (ws of tableau.extensions.dashboardContent.dashboard.worksheets) {
        console.log(ws.name)
        options += "<option value='" + ws.name + "'>" + ws.name + "</option>";
        t++
    }
    if (t == 0) {
        document.getElementById('wsheetselect').innerHTML = "<option value='' disabled>No fields found</option>";
    } else {
        document.getElementById('wsheetselect').innerHTML = options;
        document.getElementById('wsheetselect').disabled = false;
    }
}

function setWorkSheet(){
    let sheet = document.getElementById('wsheetselect').value;
    console.log('Setting sheet to ' + sheet + '.');

    tableau.extensions.settings.set('sheet', sheet);
    tableau.extensions.settings.saveAsync().then(() => {
        console.log("Set sheet = " + tableau.extensions.settings.get('sheet'));
    });
    //document.getElementById('divWorksheetSelector').style.display = "none";
    document.getElementById('sheetSelectedMessage').style.display = "block";
    document.getElementById('sheet').innerHTML = sheet;
    validateConfiguration();
}

function setNewColumn() {
    let column = document.getElementById('newColumnInsert').value;
    if(column.length > 0){
        console.log('Adding new Column ' + column);
        document.getElementById('divNewColumnsInserted').style.display = "flex";
        console.log('Adding to Settings... ');
        var xportColumns = tableau.extensions.settings.get('xportColumns');
        console.log('Columns in Settings: '+ xportColumns);
        if(xportColumns === undefined){
            xportColumns = [];
        }else{
            xportColumns = JSON.parse(xportColumns);
        }
        xportColumns.push(column);
        tableau.extensions.settings.set('xportColumns',JSON.stringify(xportColumns));
        tableau.extensions.settings.saveAsync().then(result => {
            console.log('Added to Settings... ');
            $('#newColumns').append(`<li>${column}</li>`)
            document.getElementById('newColumnInsert').value = "";
        }); 
    }
}

function removeColumn(){
    var xportColumns = tableau.extensions.settings.get('xportColumns');
    if(xportColumns != undefined){
        xportColumns = JSON.parse(xportColumns);
        let column = document.getElementById('newColumnInsert').value;
        if(column.length > 0){
            console.log('Removing Column ' + column);
            console.log('Columns in Settings: '+ xportColumns);
            var index = xportColumns.indexOf(column);
            if (index > -1) {
                xportColumns.splice(index, 1);
            }
        }else{
            console.log('Removing All Columns...');
            xportColumns = [];
        }
        tableau.extensions.settings.set('xportColumns',JSON.stringify(xportColumns));
        tableau.extensions.settings.saveAsync().then(result => {
            console.log('Removed Column');
            redoColumnList();
            if(xportColumns.length===0){
                document.getElementById('divNewColumnsInserted').style.display = "none";
            }
        }); 
    }
}

function setEndpointURL(){
    let endpointURL = document.getElementById('newEndpointURL').value;
    console.log('Setting Endpoint URL to ' + endpointURL + '.');

    tableau.extensions.settings.set('endpointURL', endpointURL);
    tableau.extensions.settings.saveAsync().then(() => {
        console.log("Set endpointURL = " + tableau.extensions.settings.get('endpointURL'));
    });
    document.getElementById('endpointURLInserted').style.display = "block";
    document.getElementById('endpointURLfield').innerHTML = endpointURL;
    validateConfiguration();
}

function setGoogleSheet(){
    let gglsheet = document.getElementById('wgooglesheetselect').value;
    console.log('Setting Google Sheet to ' + gglsheet + '.');

    tableau.extensions.settings.set('xportGoogleSheet', gglsheet);
    tableau.extensions.settings.saveAsync().then(() => {
        console.log("Set Google Sheet to = " + tableau.extensions.settings.get('xportGoogleSheet'));
    });

    document.getElementById('wgooglesheetselected').style.display = "block";
    document.getElementById('googlesheet').innerHTML = gglsheet;
    validateConfiguration();
}

function setDefaultGoogleSheet(){
    var gglsheet = tableau.extensions.settings.get('xportGoogleSheet');
    if(gglsheet == undefined){
        gglsheet = 'Tableau';
        tableau.extensions.settings.set('xportGoogleSheet', gglsheet);
        tableau.extensions.settings.saveAsync().then(() => {
            console.log("Set Google Sheet to = " + tableau.extensions.settings.get('xportGoogleSheet'));
        });
    }
    document.getElementById('wgooglesheetselected').style.display = "block";
    document.getElementById('googlesheet').innerHTML = gglsheet;
}

function validateConfiguration(){
    var rtn = true;
    let sheet = tableau.extensions.settings.get('sheet');
    if(sheet === undefined){rtn=false;}
    if(rtn){
        document.getElementById('sheetSelectedMessage').style.display = "flex";
        document.getElementById('sheet').innerHTML = sheet;
        
    }
    let endpointURL = tableau.extensions.settings.get('endpointURL');
    if(endpointURL === undefined){rtn=false;}
    if(rtn){
        document.getElementById('endpointURLInserted').style.display = "block";
        document.getElementById('endpointURLfield').innerHTML = endpointURL;
    }
    if(rtn){
        document.getElementById('submit').disabled = false;
    }
    redoColumnList();
    
    return rtn;
}

function redoColumnList(){
    $('#newColumns').empty();
    let xportColumns = tableau.extensions.settings.get('xportColumns');
    if(xportColumns != undefined){
        xportColumns = JSON.parse(xportColumns);
        if(xportColumns.length > 0){
            document.getElementById('divNewColumnsInserted').style.display = "flex";
            $('#newColumns').empty();
            for(c in xportColumns){
                $('#newColumns').append(`<li>${xportColumns[c]}</li>`);
            }
        }
    }
}

function submit() {
    tableau.extensions.settings.set('configured', 'true');
    tableau.extensions.settings.saveAsync().then(result => {
        tableau.extensions.ui.closeDialog("value");
    });
}

function clearSettings() {
    console.log("Clearing settings.");
    tableau.extensions.settings.erase('sheet');
    tableau.extensions.settings.erase('xportColumns');
    tableau.extensions.settings.erase('endpointURL');
    tableau.extensions.settings.saveAsync();
    document.getElementById('endpointURLInserted').style.display = "none";
    document.getElementById('sheetSelectedMessage').style.display = "none";
    document.getElementById('divNewColumnsInserted').style.display = "none";
    document.getElementById('submit').disabled = true;
    console.log(tableau.extensions.settings.getAll());
    redoColumnList();
    validateConfiguration();
}
    
