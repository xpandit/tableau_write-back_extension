'use strict';

(function () {

  let unregisterEventHandlerFunction;
  let dataTable;
  let xportType;
  let xportDisplayMeasures = false;
  let extensionSettings;
  let xportConfigColumns;
  let dataSourceAutoRefreshList;

  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {

    var browser = DevTools.get_browser();
    console.log("Tableau Browser: "+ browser.name +" "+browser.version);

    tableau.extensions.initializeAsync({ 'configure': configure }).then(function () {
      $('[data-toggle="tooltip"]').tooltip();
      
      // Get all Extension Settings
      let settings = tableau.extensions.settings.get('xpanditWritebackSettings');
      extensionSettings = settings ? JSON.parse(settings) : {};
      console.log("Settings: %O", extensionSettings);
      xportType = extensionSettings.xportExtractAllData;
      xportConfigColumns = extensionSettings.xportColumns?extensionSettings.xportColumns:[];
      
      //Check if the extension is configured otherwise launch the configuration menu
      if (extensionSettings.sheet) {
        //Check if xportType is set to full data export or selected marks
        xportType ? loadWorksheetData(extensionSettings.sheet):loadSelectedMarks(extensionSettings.sheet);
      } else {
        document.getElementById('no_data_message').innerHTML = '<h5>The Plugin in not Configured</h5>'
        configure();
      }

      if(!extensionSettings.dataSourceAutoRefresh){
        extensionSettings.dataSourceAutoRefresh = {autoRefresh:false,refreshInterval:30};
        tableau.extensions.settings.set('xpanditWritebackSettings',JSON.stringify(extensionSettings));
      }else{
        //enableDataSourceRefresh
        enableDataSourceRefresh();
      }
      tableau.extensions.settings.saveAsync().then(function () {
        initializeButtons();
      });
    });
  });

  // Pops open the configure page
  function configure() {
    let extpath = `${window.location.href}`;
    const popupUrl =
        extpath.search(/index[\.html]*/i) > 0
            ? extpath.replace(/index[\.html]*/i, "configurationPopUp.html")
            : ( window.location.origin.includes('localhost') ? extpath + "/configurationPopUp.html" : extpath + "configurationPopUp.html");
    let payload = "";
    tableau.extensions.ui.displayDialogAsync(popupUrl, payload, { height: 600, width: 500 }).then((closePayload) => {
      console.log("Configuration was closed.");
      
      // Set the extension Settings
      let settings = tableau.extensions.settings.get('xpanditWritebackSettings');
      extensionSettings = settings ? JSON.parse(settings) : {};

      let sheetname = extensionSettings.sheet;
      let xportExtractAllData = extensionSettings.xportExtractAllData;
      if (sheetname) {
        if(document.getElementById('selected_marks_title').innerHTML != sheetname || xportExtractAllData !== xportType){
          xportType = xportExtractAllData;
          if(dataTable){
            destroyDataTable();
          }
          document.getElementById('selected_marks_title').innerHTML = sheetname;
          document.getElementById('no_data_message').innerHTML = '<h5>No Data</h5>';
          //Load all data or only selected marks
          if(xportExtractAllData){
            console.log("Data set to complete load");
            loadWorksheetData(sheetname);
          }else{
            console.log("Data set marks load");
            loadSelectedMarks(sheetname);
          }
        }else{
          // Redo the columns if they are different
          let newConfigColumns = extensionSettings.xportColumns?extensionSettings.xportColumns:[];
          if(JSON.stringify(xportConfigColumns) != JSON.stringify(newConfigColumns)){
            if(dataTable){redoColumns(xportConfigColumns,newConfigColumns)}
            xportConfigColumns = newConfigColumns;
          }
        }
        //Display Measures option
        if(extensionSettings.viewMeasures != xportDisplayMeasures && dataTable){
          destroyDataTable();
          hideButtons();
          xportType? loadWorksheetData(extensionSettings.sheet):loadSelectedMarks(extensionSettings.sheet);
        }
        xportDisplayMeasures=extensionSettings.viewMeasures;
      }

    }).catch((error) => {
        switch (error.errorCode) {
            case tableau.ErrorCodes.DialogClosedByUser:
                console.log("Dialog was closed by user.");
                break;
            default:
                console.log(error.message);
        }
    });
  }

  //Redo the column list when new columns are added or removed in the cofiguration
  function redoColumns(oldColumns,newColumns){
    var rowdata = dataTable.rows().data();
    var nColumns = dataTable.settings().init().columns.slice();
    var oCols = dataTable.settings().init().columns;
    
    //Remove old Config Columns
    for(var i = 0; i< nColumns.length; i++){
      if(oldColumns.map(o => o.name).indexOf(nColumns[i].title) != -1){
        let max = nColumns.length - i;
        nColumns.splice(i,max);
        break;
      }
    }
    //Add New Config Columns
    for(var i = 0; i < newColumns.length; i++){
      nColumns.push({title:newColumns[i].name, defaultContent:newColumns[i].defaultValue});
    }
    // New Column Position
    var positions = {};
    for(var i = 0; i< oCols.length; i++){
      positions[oCols[i].title] = [i,nColumns.map(e => e.title).indexOf(oCols[i].title)];
    }
    // Redo Row Data Order
    var newRows = [];
    for(var y=0;y<rowdata.length; y++){
      var col = new Array(nColumns.length).fill("");
      for(var i = 0; i< oCols.length; i++){
        let colName = oCols[i].title;
        if(positions[colName][1] != -1){
          col[positions[colName][1]] = rowdata[y][positions[colName][0]];
        }
      }
      newRows.push(col);
    }

    // Remove old Columns
    xportConfigColumns.map(e => {
      if(newColumns.map(o => o.name).indexOf(e.name) === -1){
        var rIndex = nColumns.map(c => c.title).indexOf(e.name);
        if(rIndex != -1){
          newRows.map(r => r.splice(rIndex,1));
          nColumns.splice(rIndex,1);
        }
      }
    })

    //Add Default Values
    newColumns.map(n =>{
      let index = nColumns.map(c => c.title).indexOf(n.name);
      //var val = eval();
      newRows.map(r => r[index] = r[index] === ""? n.defaultValue : r[index]);
    })

    //Replace Variables (unfinished)
    newColumns.map(n =>{
      Utils.replaceDefaultValueVar(n,nColumns,newRows);
    });

    populateDataTable(newRows,nColumns,true);
  }
  
  /**
   * Initialize all the buttonss
   */
  function initializeButtons () {
    $('#selected_marks_title').click(showChooseSheetDialog);
    $('#insert_data_button').click(showInsertNewRecord);
    $('#edit_data_button').click(editRecord);
    $('#remove_data_button').click(removeRecord);
    $('#upload_data_button').click(dataWriteBack);
    $('#reload_data_button').click(reloadDataExtract);
    $('#options_sidebar_open').click(sidebarOpen);
    $('#options_sidebar_close').click(sidebarClose);
    hideButtons()
  }

  // Open the extension side bar
  function sidebarOpen(){
    let refresh = extensionSettings.dataSourceAutoRefresh.autoRefresh? extensionSettings.dataSourceAutoRefresh.autoRefresh : false;
    let refreshInterval = extensionSettings.dataSourceAutoRefresh.refreshInterval?extensionSettings.dataSourceAutoRefresh.refreshInterval:30;
    let dataRefresh = extensionSettings.dataSourceAutoRefresh.dataRefresh? extensionSettings.dataSourceAutoRefresh.dataRefresh : false;
    //Set Options
    $('#enable_refresh_data_sent').prop("checked", dataRefresh);
    $('#enable_auto_refresh').prop("checked", refresh);
    $('#refresh_interval').val(refreshInterval);
    //Enable Menu
    document.getElementById("options_sidebar").style.display = "block";
  }

  //Close the extension Side Bar and set the options checked in it
  function sidebarClose(){
    //extensionSettings.writeBackFields = $('#write_back_field:checked').map(function () {return this.value;}).get();
    extensionSettings.dataSourceAutoRefresh.refreshInterval = $('#refresh_interval').val();
    extensionSettings.dataSourceAutoRefresh.autoRefresh = $('#enable_auto_refresh').is(":checked");
    extensionSettings.dataSourceAutoRefresh.dataRefresh = $('#enable_refresh_data_sent').is(":checked");
    //Save Settings
    tableau.extensions.settings.set('xpanditWritebackSettings',JSON.stringify(extensionSettings));
    tableau.extensions.settings.saveAsync().then(function () {
      document.getElementById("options_sidebar").style.display = "none";
      enableDataSourceRefresh();
    });
  }

  /**
   * Shows the choose sheet UI.
   */
  function showChooseSheetDialog () {
    $('#choose_sheet_buttons').empty();

    const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
    $('#choose_sheet_title').text(dashboardName);

    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

    worksheets.forEach(function (worksheet) {
      const button = Utils.createButton(worksheet.name);

      button.click(function () {
        const worksheetName = worksheet.name;
        extensionSettings.sheet = worksheetName;
        tableau.extensions.settings.set('xpanditWritebackSettings',JSON.stringify(extensionSettings));
        tableau.extensions.settings.saveAsync().then(function () {
          $('#choose_sheet_dialog').modal('toggle');
          if(dataTable){
            destroyDataTable();
          }
          hideButtons();
          xportType? loadWorksheetData(worksheetName):loadSelectedMarks(worksheetName);
        });
        $('#selected_marks_title').text(worksheetName);
      });
      $('#choose_sheet_buttons').append(button);
    });
    $('#choose_sheet_dialog').modal('toggle');
  }

  /**
   * Send the data to  the endpoint
   */
  function dataWriteBack() {
    var endpointURL = extensionSettings.endpointURL;
    if(endpointURL){
      var inJson = Utils.dataTableToJson(dataTable,extensionSettings.uploadOnlySelected);
      var sendJson = {"data":[]};

      inJson = Utils.selectColumnsToSend(extensionSettings.writeBackFields,inJson);
      for (var j = 0; j < inJson.data.length; j++){
          var dt = {};
          for(var i = 0; i < inJson.columns.length; i++){
              dt[inJson.columns[i]]=inJson.data[j][inJson.columns[i]];
          }
          sendJson["data"].push(dt);
      }
      var columns = [];

      for(var i = 0; i < inJson.columns.length; i++){
          columns.push(inJson.columns[i]);
      }

      sendJson.columns = columns;
      sendJson.sheet = extensionSettings.xportGoogleSheet;

      // Create Ajax Request Content
      var ajaxRequestContent = {
        url:endpointURL,
        type : "POST",
        dataType: 'json',
        success : function (data, status, xhr) {
          if(data.error !=undefined){
            $('#overlay-message').text("Post Error. Check console");
            $('#overlay').fadeIn().delay(2000).fadeOut();;
            console.error("AJAX POST ERROR");
            console.error(status);
            console.error(data);
          }else{
            $('#overlay-message').text("Data sent successfully");
            $('#overlay').fadeIn().delay(2000).fadeOut();
            if(extensionSettings.dataSourceAutoRefresh.dataRefresh){
              refreshWorksheetData();
            }
          }
        },
        error : function (xhr, status) {
          $('#overlay-message').text("There was an error while sending the data!");
          $('#overlay').fadeIn().delay(2000).fadeOut();
          console.log("Error sending the data");
          console.log(xhr);
          console.log(status);
        }
      };

      //Add Ajax Request Data
      ajaxRequestContent.data = {origin : 'tableau', input :JSON.stringify(sendJson)};

      if(extensionSettings.exportToSpreadsheet === 'false'){
        ajaxRequestContent.data = JSON.stringify({origin : 'tableau',input :sendJson});
        ajaxRequestContent.contentType = 'application/json; charset=UTF-8';
      }

      $.ajax(ajaxRequestContent);
    }else{
      $('#overlay-message').text("The endpoint URL is not specified. Please configure the extension");
      $('#overlay').fadeIn().delay(2000).fadeOut();
    }
  }

  /**
   * Manually insert a new record or insert a new Column
   */
  function showInsertNewRecord () {

    $('#xport_new_values').empty();
    $('#xp-modal-footer').empty();
    $('#xp-modal-title').text('Insert Record');

    var jColumns = Utils.dataTableColumns(dataTable);

    for(var i = 0;i< jColumns.length ; i++){
        $('#xport_new_values').append(
            `<div class="input xp-margin-10">
            <label for="val${i}">${jColumns[i]}</label>
            <input id="val${i}" type="text" class="form-control"></div>`
        );
    };

    $('#xp-modal-footer').append('<button class="btn xp-btn-success" type="button" id="xport_insert_record_button">Submit</button>');
    $('#xport_insert_record_button').click(function(){
      $('#xport_insert_new_record').modal('toggle');
      var jsonvals ={vals:[]};
      for(var i = 0;i< jColumns.length ; i++){
        jsonvals.vals.push($(`#val${i}`).val());
      };
      if(jsonvals.vals.length > 0){
        dataTable.row.add(jsonvals.vals).draw();
      }
    });

    $('#xport_insert_new_record').modal('toggle');
  }

  /**
   * Remove Records from the datatable
   */
  function removeRecord () {
    $('#edit_data_button').hide();
    var rr = dataTable.row('.selected').data();
    if(dataTable.row('.selected').data() === undefined){
      destroyDataTable();
      hideButtons();
    }else{
      dataTable.rows('.selected').remove().draw( false );
    }
  }

  /**
   * Reload the data in the datatable, used when working with full data extract
   */
  function reloadDataExtract(){
    if(dataTable){
      destroyDataTable();
    };
    let worksheetName = extensionSettings.sheet;
    loadWorksheetData(worksheetName);
  }

  /**
   * Edit the Selected record in the Datatable
   */
  function editRecord () {

    $('#xport_new_values').empty();
    $('#xp-modal-footer').empty();
    $('#xp-modal-title').text('Edit Record');

    var jColumns = Utils.dataTableColumns(dataTable);
    var row = dataTable.row('.selected').data();

    var colArray = {columns:jColumns, data: row};

    for(var i = 0;i< colArray.columns.length ; i++){
        if(colArray.data[i] === undefined){
            colArray.data[i] = "";
        }
        $('#xport_new_values').append(
            `<div class="input xp-margin-10">
            <label for="val${i}">${colArray.columns[i]}</label>
            <input id="val${i}" type="text" class="form-control" value='${colArray.data[i]}'></div>`
        );
    };

    $('#xp-modal-footer').append('<button class="btn xp-btn-success" type="button" id="xport_insert_record_button">Submit</button>');
    $('#xport_insert_record_button').click(function(){
      $('#xport_insert_new_record').modal('toggle');
      var vals = [];
      for(var i = 0;i< colArray.columns.length ; i++){
          vals.push($(`#val${i}`).val());
      };
      dataTable.row('.selected').remove()
      dataTable.row.add(vals).draw();
      $('#edit_data_button').hide();
    });

    $('#xport_insert_new_record').modal('toggle');
  }

  function getSelectedSheet (worksheetName) {
    if (!worksheetName) {
      worksheetName = extensionSettings.sheet;
    }

    return tableau.extensions.dashboardContent.dashboard.worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });
  }

  /**
   * Load all the data in the worksheet
   * @param {*} worksheetName
   */
  function loadWorksheetData (worksheetName){
    $('#reload_data_button').show();

    const worksheet = getSelectedSheet(worksheetName);

    $('#selected_marks_title').text(worksheet.name);
    // Get all the data available in the worksheet
    worksheet.getSummaryDataAsync({ignoreSelection:true}).then(dtt => {
      //Extract all the data
      var data = dtt.data.map((row, index) => {
        const rowData = row.map(cell => {
          return cell.value;
        });
        return rowData;
      });
      //Extract all the columns
      var columns = dtt.columns.map(column => {
        return { title: column.fieldName };
      });

      //Store column dataTypes to limit float decimals
      var dataTypes = dtt.columns.map(function (column) {
        return { type: column.dataType, name: column.fieldName};
      });
      //Get the worksheet datasources fields and roles (dimension or measure)
      worksheet.getDataSourcesAsync().then(sources => {
        var srcFields = sources.map(src => {
          const fields = src.fields.map(field => {
            return {name: field.name, role: field.role};
          });
          return fields;
        })
        
        if(!extensionSettings.viewMeasures){
          //Find the measures indexes
          var measures = Utils.findMeasures(columns,srcFields);
          //Remove the Measure columns
          columns = Utils.removeMeasuresColumns(measures,columns);
          //Remove the measures from the data
          data = Utils.removeMeasuresData(measures,data);
        }
        columns = Utils.renameATTR(columns);
        //Get the list of columns
        var allColumns = dataTable? dataTable.settings().init().columns: columns.slice();
        //Add the configuration columns
        if(!dataTable){
          if(xportConfigColumns){
            for(var i = 0; i < xportConfigColumns.length; i++){
              allColumns.push({title:xportConfigColumns[i].name, defaultContent:xportConfigColumns[i].defaultValue});
            }
          }
        }
        // Limit the floats to 2 decimals
        Utils.removeDecimals(data,columns,dataTypes);
        // Add Config Data
        data = Utils.addConfigColumnsData(allColumns,xportConfigColumns,columns,data);
        //Replace Parameters
        xportConfigColumns.map(n =>{
          Utils.replaceDefaultValueVar(n,allColumns,data);
        });

        populateDataTable(data, allColumns, true);
      });
    });
  }

  /**
   * Load the Selected mark in the Sheet into the Datatable
   * @param {*} worksheetName
   */
  function loadSelectedMarks (worksheetName) {
    $('#reload_data_button').hide();

    if (unregisterEventHandlerFunction) {
      unregisterEventHandlerFunction();
    }

    const worksheet = getSelectedSheet(worksheetName);

    $('#selected_marks_title').text(worksheet.name);
    // Get the selected marks and then load them into the table
    worksheet.getSelectedMarksAsync().then(function (marks) {
      const worksheetData = marks.data[0];
      //Extract the mark data
      var data = worksheetData.data.map(function (row, index) {
        const rowData = row.map(function (cell) {
          return cell.formattedValue;
        });

        return rowData;
      });
      //Extract the mark columns
      var columns = worksheetData.columns.map(function (column) {
        return { title: column.fieldName };
      });

      //Store column dataTypes to limit float decimals
      var dataTypes = worksheetData.columns.map(function (column) {
        return { type: column.dataType, name: column.fieldName};
      });

      //Get the worksheet datasources fields and roles (dimension or measure)
      worksheet.getDataSourcesAsync().then(sources => {
        var srcFields = sources.map(src => {
          const fields = src.fields.map(field => {
            return {name: field.name, role: field.role};
          });
          return fields;
        })

        if(!extensionSettings.viewMeasures){
          //Find the measures indexes
          var measures = Utils.findMeasures(columns, srcFields);
          //Remove the Measure columns
          columns = Utils.removeMeasuresColumns(measures,columns);
          //Remove the measures from the data
          data = Utils.removeMeasuresData(measures,data);
        }
        columns = Utils.renameATTR(columns);
        //Get the list of columns
        var allColumns = dataTable? dataTable.settings().init().columns: columns.slice();
        //Add the configuration columns
        if(!dataTable){
          if(xportConfigColumns){
            for(var i = 0; i < xportConfigColumns.length; i++){
              allColumns.push({title:xportConfigColumns[i].name, defaultContent:xportConfigColumns[i].defaultValue});
            }
          }
        }
        
        // Limit the floats to 2 decimals
        Utils.removeDecimals(data,columns,dataTypes);
        // Add Config Data
        data = Utils.addConfigColumnsData(allColumns,xportConfigColumns,columns,data);
        //Replace Parameters by values
        xportConfigColumns.map(n =>{
          Utils.replaceDefaultValueVar(n,allColumns,data);
        });
        //Add row if table exists or create table
        if(dataTable){
          dataTable.row.add(data[0]).draw();
        }else{
          populateDataTable(data, allColumns, true);
        }
      });
    });

    /**
     * Event Listener for selected record in the worksheet
     */
    unregisterEventHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, function (selectionEvent) {
      loadSelectedMarks(worksheetName);
    });
  }
  
  /**
   * Create de Datatable and show all the buttons
   * */
  function populateDataTable (data, columns, redoFlag) {
    if(redoFlag === undefined){redoFlag = false}
    $('#data_table_wrapper').empty();

    if (data.length > 0) {
      //Remove the table is already exists and create a new one
      if(dataTable){dataTable.destroy();}
      $('#no_data_message').css('display', 'none');
      $('#data_table_wrapper').append(`<table id='data_table' class='table table-responsive table-striped'></table>`);

      var top = $('#data_table_wrapper')[0].getBoundingClientRect().top;
      var height = $(document).height() - top - 100;
      //Add the configuration columns to the table
      let xportColumns = extensionSettings.xportColumns;
      var new_columns = [];
      if(!redoFlag){
        if(xportColumns){
          new_columns = xportColumns;
          for(var i = 0; i < new_columns.length; i++){
            columns.push({title:new_columns[i].name, defaultContent:new_columns[i].defaultValue});
          }
        }
      }
      //Create the datatable
      dataTable = $('#data_table').DataTable({
        data: data,
        columns: columns,
        autoWidth: false,
        deferRender: true,
        scroller: true,
        scrollY: height,
        scrollX: true,
        searching: false,
        select: true,
        dom: "<'row'<'col-sm-12'tr>>"
      });
      // Add a record selected option
      dataTable.on('select', function ( e, dt, type, indexes ) {
        if ( type === 'row' ) {
          $('#edit_data_button').show();
        }
      });
      //Add a records deselected option
      dataTable.on('deselect', function ( e, dt, type, indexes ) {
        if ( type === 'row' ) {
          console.log(dataTable.row('.selected').data());
          if(dataTable.row('.selected').data() === undefined){
            $('#edit_data_button').hide();
          }
        }
      });

      showButtons()
    } else {
      $('#no_data_message').css('display', 'inline');
      hideButtons()
    }
  }

  /**
   * Destroy the datatable and set default message
   */
  function destroyDataTable(){
    dataTable.destroy();
    dataTable = undefined;
    $('#data_table_wrapper').empty();
    $('#no_data_message').css('display', 'inline');
  }

  /**
   * Hide the extension buttons
   */
  function hideButtons(){
    $('#edit_data_button').hide();
    $('#upload_data_button').hide();
    $('#insert_data_button').hide();
    $('#remove_data_button').hide();
    if(!xportType){$('#reload_data_button').hide()};
  }

  /**
   * Show the extension buttons
   */
  function showButtons(){
    $('#upload_data_button').show();
    $('#insert_data_button').show();
    $('#remove_data_button').show();
  }

  function refreshWorksheetData(){
    console.log(`Refreshing ${extensionSettings.sheet} datasources`);
    const worksheet = getSelectedSheet(extensionSettings.sheet);
      worksheet.getDataSourcesAsync().then(sources => {
        for (var src in sources){
          sources[src].refreshAsync().then(function () {
            console.log(sources[src].name + ': Refreshed Successfully');
          });
        }
      })
  }

  function enableDataSourceRefresh(){
    //Remove all intervals
    if(dataSourceAutoRefreshList){
      console.log("Cleaning Auto Refresh...");
      for (var i in dataSourceAutoRefreshList){
        clearInterval(dataSourceAutoRefreshList[i]);
      }
      dataSourceAutoRefreshList = undefined;
    }
    //Set new Intervals
    if(extensionSettings.dataSourceAutoRefresh.autoRefresh){
      dataSourceAutoRefreshList = [];
      console.log("Enabling Auto Refresh...");
      const worksheet = getSelectedSheet(extensionSettings.sheet);
      worksheet.getDataSourcesAsync().then(sources => {
        for (var src in sources){
          var interval = setInterval(function(){
            sources[src].refreshAsync().then(function () {
              console.log(sources[src].name + ': Refreshed Successfully');
            })
          },extensionSettings.dataSourceAutoRefresh.refreshInterval*1000);
          
          dataSourceAutoRefreshList.push(interval);
        }
      })
    } 
  };

})();
