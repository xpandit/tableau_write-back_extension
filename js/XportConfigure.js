let extensionSettings;

$(document).ready(function() {
    tableau.extensions.initializeDialogAsync().then(function(openPayload) {
        // Get all Extension Settings
        let settings = tableau.extensions.settings.get('xpanditWritebackSettings');
        extensionSettings = settings ? JSON.parse(settings) : {};

        console.log("Settings: "+extensionSettings);
        
        if(extensionSettings.configured===undefined){clearSettings();}

        let xportExtractAllData = extensionSettings.xportExtractAllData;

        if(xportExtractAllData){
            $('#extract_all_data').prop("checked", xportExtractAllData);
        }
        $('#xport_view_measures').prop("checked", extensionSettings.viewMeasures);
        $('#xport_selected_rows').prop("checked", extensionSettings.uploadOnlySelected);
        
        $('[data-toggle="tooltip"]').tooltip();
        populateSheetList();
        setDefaultGoogleSheet();
        setWorkSheet();
        console.log("Writeback Settings");
        console.log(extensionSettings);
        redoColumnList();
        loadSideBarWriteBackFields();
        setExportType();
    });
    $("#newEndpointURL").on('input',function(e){
      setEndpointURL();
      validateConfiguration();
    });

    $("#wgooglesheetselect").focusout('input',function(e){
      setGoogleSheet();
    });

    updateOnResize();
    window.onresize = function(event) {
        updateOnResize();
    };

    $("#sortable").sortable({
        appendTo: document.body,
        placeholder: "ui-state-highlight",
      });
    $("#sortable").disableSelection();

    $("#wsheetselect").on('change',function(e){
        loadSideBarWriteBackFields();
    });
});

function setExportType(){
    if(extensionSettings.exportToSpreadsheet===undefined){
        extensionSettings.exportToSpreadsheet = true;
    }
    $(`input[name=googleSpreadsheet][value='${extensionSettings.exportToSpreadsheet}']`).prop("checked",true);
}

function loadSideBarWriteBackFields(){
    $('#write_back_fields').html("");
    const worksheet = getSelectedSheet(document.getElementById('wsheetselect').value);
    // Get all the data available in the worksheet
    worksheet.getSummaryDataAsync({ignoreSelection:true}).then(dtt => {
      //Extract all the columns
        dtt.columns.map(column => {
            $('#write_back_fields').append(`<label class="checkboxes">${column.fieldName}
            <input type="checkbox" id="write_back_field" value="${column.fieldName}" checked>
            <span class="checkmark"></span></label><br>`);
        });

        $('.add-form').each(function() {
        if(this.id>0){
            let name = this.parentNode.getElementsByTagName('input')[0].value;
            $('#write_back_fields').append(`<label class="checkboxes">${name}
            <input type="checkbox" id="write_back_field" value="${name}" checked>
            <span class="checkmark"></span></label><br>`);
            }
        });

      checkSideBarWriteBackFields();
    })
  }

  function getSelectedSheet (worksheetName) {
    if (!worksheetName) {
      worksheetName = extensionSettings.sheet;
    }

    return tableau.extensions.dashboardContent.dashboard.worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });
  }

  function checkSideBarWriteBackFields(){
    $('#write_back_field:checked').each(function() {
      if(extensionSettings.writeBackFields){
        if(extensionSettings.writeBackFields.indexOf(this.value) === -1){
          $(this).prop('checked',false);
        }
      }
    });
  }

function updateOnResize(){
    var top = $('#config-top').height();
    var bottom = $('#config-bottom').height();
    var height = $(document).height() - top - bottom - 5;
    document.getElementById('config-container').style.height = height+"px";
    document.getElementById('config-container').style.marginTop = top+"px";
}

// Gets list of worksheets in workbook and populates dropdown
function populateSheetList() {
    console.log('Populating workSheet list.');
    document.getElementById('divWorksheetSelector').style.display = "flex";

    let options = "";
    let t = 0;
    for (ws of tableau.extensions.dashboardContent.dashboard.worksheets) {
        console.log("Sheet Name: "+ws.name);
        let sheet = extensionSettings.sheet;
        if(sheet === ws.name){
            options += "<option value='" + ws.name + "' selected='selected'>" + ws.name + "</option>";
        }else{
            options += "<option value='" + ws.name + "'>" + ws.name + "</option>";
        }
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

    extensionSettings.sheet = sheet;

    validateConfiguration();
}

function setCheckedOptions(){
    extensionSettings.xportExtractAllData = $('#extract_all_data').is(":checked");
    extensionSettings.uploadOnlySelected = $('#xport_selected_rows').is(":checked");
    extensionSettings.viewMeasures = $('#xport_view_measures').is(":checked");
    console.log(`Extract all data:${extensionSettings.xportExtractAllData}`);
    console.log(`Upload only selected rows:${extensionSettings.uploadOnlySelected}`);
    console.log(`Display measures:${extensionSettings.viewMeasures}`);
}

function setNewColumn() {
    let column = document.getElementById('newColumnInsert').value;
    let column_value = document.getElementById('newColumnInsert-value').value;

    if(column.length > 0){
      // UI Changes
      let form = $("#0.add-form").clone();
      $("#0.add-form").children("#newColumnInsert").text('');
      let max = 0;
      $('.add-form').each(function() {
        max = Math.max(this.id, max);
      });
      let newid = max+1;
      form.attr("id",newid);
      form.children(":input[value='Add']").hide();
      form.children(":input[value='Remove']").show();
      form.children("#newColumnInsert").prop("disabled",true);
      form.children("#newColumnInsert-value").prop("placeholder","");
      form.children("#newColumnInsert-value").prop("disabled",true);

      form.children("#dragicon-holder").css({"display": "none"});
      form.children("#dragicon").css({"display": "inline"});

      let new_li = document.createElement("li");
      new_li.setAttribute("class", "ui-state-default" );
      form.appendTo(new_li);
      $("#sortable").append(new_li);
      $("#sortable").sortable('refresh');

      console.log('Adding new Column ' + column);
      console.log('Adding to Settings... ');
      var xportColumns = extensionSettings.xportColumns;
      console.log('Columns in Settings: '+ xportColumns);
      if(xportColumns === undefined){
          xportColumns = [];
          extensionSettings.xportColumns=xportColumns;
      }
      xportColumns.push({name:column,defaultValue:column_value});
      extensionSettings.xportColumns=xportColumns;
      loadSideBarWriteBackFields();
    }
}

function removeColumn(){

    var xportColumns =  extensionSettings.xportColumns;
    if(xportColumns != undefined){
        let column = this.event.currentTarget.parentNode.getElementsByTagName('input')[0].value;
        this.event.currentTarget.parentNode.parentNode.remove();
        console.log('Removing Column ' + column);
        console.log('Columns in Settings: '+ xportColumns);
        var index = xportColumns.findIndex(cl => cl.name === column);
        if (index > -1) {
            xportColumns.splice(index, 1);
        }
        extensionSettings.xportColumns=xportColumns;
        loadSideBarWriteBackFields();
    }
}

function setEndpointURL(){
    let endpointURL = document.getElementById('newEndpointURL').value;
    console.log('Setting Endpoint URL to ' + endpointURL + '.');

    extensionSettings.endpointURL = endpointURL;
    validateConfiguration();
}

function setGoogleSheet(){
    let gglsheet = document.getElementById('wgooglesheetselect').value;
    console.log('Setting Google Sheet to ' + gglsheet + '.');

    extensionSettings.xportGoogleSheet = gglsheet;

    document.getElementById('wgooglesheetselect').innerHTML = gglsheet;
    validateConfiguration();
}

function setDefaultGoogleSheet(){
    let gglsheet = extensionSettings.xportGoogleSheet;
    if(gglsheet == undefined){
        extensionSettings.xportGoogleSheet = 'Tableau';
    }

    document.getElementById('wgooglesheetselect').placeholder = gglsheet;
}

function validateConfiguration(){
    var rtn = true;
    let sheet = extensionSettings.sheet;
    if(sheet === undefined){rtn=false;}
    if(rtn){
        document.getElementById('wsheetselect').placeholder = sheet;
    }
    let endpointURL =  extensionSettings.endpointURL;
    if(endpointURL === undefined || endpointURL === ""){rtn=false;}
    if(rtn){
        document.getElementById('newEndpointURL').placeholder = endpointURL;
        document.getElementById('submit').disabled = false;
    }
    else{
        document.getElementById('newEndpointURL').placeholder = "";
        document.getElementById('submit').disabled = true;
    }
    //redoColumnList();

    return rtn;
}

function redoColumnList(){
    let xportColumns = extensionSettings.xportColumns;
    if(xportColumns != undefined){
        let max = 0;
        if(xportColumns.length > 0){
            for(c in xportColumns){
                let form = $("#0.add-form").clone();
                $("#0.add-form").children("#newColumnInsert").text('');
                $('.add-form').each(function() {
                  max = Math.max(this.id, max);
                });
                let newid = max+1;
                form.attr("id",newid);
                form.children("#newColumnInsert").val(xportColumns[c].name);
                form.children("#newColumnInsert-value").val(xportColumns[c].defaultValue);
                form.children(":input[value='Add']").hide();
                form.children(":input[value='Remove']").show();
                form.children("#newColumnInsert").prop("disabled",true);
                form.children("#newColumnInsert-value").prop("disabled",true);

                form.children("#dragicon-holder").css({"display": "none"});
                form.children("#dragicon").css({"display": "inline"});

                let new_li = document.createElement("li");
                new_li.setAttribute("class", "ui-state-default" );
                form.appendTo(new_li);
                $("#sortable").append(new_li);
                $("#sortable").sortable('refresh');
            }
        }
    }
    else{
      $('.add-form').each(function() {
        if(this.id>0){this.remove();}
        else{this.children[0].value="";}
      });
    }
}

function setXportColumns(){
    let xportColumns = [];
    $('.add-form').each(function() {
        if(this.id>0){
            let name = this.parentNode.getElementsByTagName('input')[0].value;
            let dft = this.parentNode.getElementsByTagName('input')[1].value;
            xportColumns.push({'name':name,'defaultValue':dft});
        }
    });
    extensionSettings.xportColumns=xportColumns;
}

function setSettingExportType(){
    extensionSettings.exportToSpreadsheet = $('input[name=googleSpreadsheet]:checked').val();
}
function submit() {
    setXportColumns();
    setWorkSheet();
    setCheckedOptions();
    extensionSettings.configured = true;
    extensionSettings.writeBackFields = $('#write_back_field:checked').map(function () {return this.value;}).get();
    setSettingExportType();
    logSettings();
    tableau.extensions.settings.set('xpanditWritebackSettings',JSON.stringify(extensionSettings));
    tableau.extensions.settings.saveAsync().then(result => {
        tableau.extensions.ui.closeDialog("value");
    });
}

function clearSettings() {
    console.log("Clearing settings.");
    extensionSettings.configured = false;
    extensionSettings.xportColumns = undefined;
    extensionSettings.endpointURL = undefined
    extensionSettings.xportGoogleSheet = 'Tableau';
    tableau.extensions.settings.set('xpanditWritebackSettings',JSON.stringify(extensionSettings));
    tableau.extensions.settings.saveAsync();
    document.getElementById('submit').disabled = true;
    document.getElementById("wgooglesheetselect").placeholder="Tableau";
    console.log(tableau.extensions.settings.getAll());
    redoColumnList();
    validateConfiguration();
}

function logSettings(){
    console.log("Settings Stored");
    console.log(tableau.extensions.settings.getAll());
    console.log("Settings to Store");
    console.log(extensionSettings);
};
