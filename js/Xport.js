'use strict';

(function () {
  
  let unregisterEventHandlerFunction;
  let dataTable;
  let datacolumns;

  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {
    
    tableau.extensions.initializeAsync({ 'configure': configure }).then(function () {
      console.log(tableau.extensions.settings.getAll());
      var xportColumns = tableau.extensions.settings.get('xportColumns');
      const savedSheetName = tableau.extensions.settings.get('sheet');
      // if(!xportColumns){
      //   xportColumns = [];
      //   tableau.extensions.settings.set('xportColumns',JSON.stringify(xportColumns));
      //   tableau.extensions.settings.saveAsync();
      // }
      console.log(tableau.extensions.settings.getAll());
      if (savedSheetName) {
        loadSelectedMarks(savedSheetName);
      } else {
        //showChooseSheetDialog();
      }
      initializeButtons();
    });
  });

  // Pops open the configure page
  function configure() {
    const popupUrl = `${window.location.origin}/html/configurationPopUp.html`;
    let payload = "";
    tableau.extensions.ui.displayDialogAsync(popupUrl, payload, { height: 600, width: 800 }).then((closePayload) => {
      console.log("Dialog was closed.");
      console.log(closePayload);
      let sheetname = tableau.extensions.settings.get('sheet');
      $('#selected_marks_title').text(sheetname);
        
    }).catch((error) => {
        switch (error.errorCode) {
            case tableau.ErrorCodes.DialogClosedByUser:
                console.log("Dialog was closed by user.");
                break;
            default:
                console.error(error.message);
        }
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
        tableau.extensions.settings.set('sheet', worksheetName);
        tableau.extensions.settings.saveAsync().then(function () {
          $('#choose_sheet_dialog').modal('toggle');
          loadSelectedMarks(worksheetName);
        });
      });
      $('#selected_marks_title').text(worksheet.name);
      $('#choose_sheet_buttons').append(button);
    });
    $('#choose_sheet_dialog').modal('toggle');
  }

  /**
   * Shows the choose Export Options UI.
   */
  function showChooseExportDialog () {
    $('#restAPI').click(function(){
      uploadDataTableData();
    });
    $('#mysql').click(function(){
      uploadDB();
    });
    $('#xport_options_dialog').modal('toggle');
  }


  /**
   * Manually insert a new record or insert a new Column
   */
  function showInsertNewRecord () {

    const popupUrl = `${window.location.origin}/html/XportDialog.html`;

    var jColumns = Utils.dataTableColumns(dataTable);
    
    var payload = JSON.stringify(jColumns);

    tableau.extensions.ui.displayDialogAsync(popupUrl,payload,{ height: 500, width: 500 }).then((closePayload) => {
      var payloadArray = JSON.parse(closePayload);
      if(payloadArray.vals.length > 0){
        if(payloadArray.id == "new_record_tab"){
          dataTable.row.add(payloadArray.vals).draw();
        }else{
          var xportColumns = tableau.extensions.settings.get('xportColumns');
          if(xportColumns == undefined){
            xportColumns = [payloadArray.vals[0]];
          }else{
            let xp = JSON.parse(xportColumns);
            xp.push(payloadArray.vals[0]);
            xportColumns = xp;
          }
          console.log(xportColumns);
          tableau.extensions.settings.set('xportColumns',JSON.stringify(xportColumns));
          tableau.extensions.settings.saveAsync().then( () => {
            let data = dataTable.data().toArray();
            datacolumns = Utils.removeDuplicatedColumns(datacolumns,xportColumns);
            populateDataTable(data,datacolumns);
          });
        }
      }
    }).catch((error) => {
      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log("Dialog was closed by user");
          break;
        default:
          console.log(error.message);
      }
    });
  }

  /**
   * Initialize all the buttonss
   */
  function initializeButtons () {
    $('#selected_marks_title').click(showChooseSheetDialog);
    $('#reset_settings').click(resetSettings);
    $('#insert_data_button').click(showInsertNewRecord);
    $('#edit_data_button').click(editRecord);
    $('#remove_data_button').click(removeRecord);
    $('#upload_data_button').click(showChooseExportDialog);
    hideButtons()
  }

  function removeRecord () {
    dataTable.row('.selected').remove().draw( false );
  }

  /**
   * Edit the Selected record in the Datatable
   */
  function editRecord () {
    var jColumns = Utils.dataTableColumns(dataTable);
    var row = dataTable.row('.selected').data();

    const popupUrl = `${window.location.origin}/html/XportEditRecord.html`;
    
    var payload = JSON.stringify({columns:jColumns, data: row});

    tableau.extensions.ui.displayDialogAsync(popupUrl,payload,{ height: 500, width: 500 }).then((closePayload) => {
      var payloadArray = JSON.parse(closePayload);
      if(payloadArray.length > 0){
        dataTable.row('.selected').remove()
        dataTable.row.add(JSON.parse(closePayload)).draw();
      }
    }).catch((error) => {
      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log("Dialog was closed by user");
          break;
        default:
          console.log(error.message);
      }
    });
  }

  function getSelectedSheet (worksheetName) {
    if (!worksheetName) {
      worksheetName = tableau.extensions.settings.get('sheet');
    }

    return tableau.extensions.dashboardContent.dashboard.worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });
  }

  /**
   * Load the Selected mark in the Sheet into the Datatable
   * @param {*} worksheetName 
   */
  function loadSelectedMarks (worksheetName) {

    if (unregisterEventHandlerFunction) {
      unregisterEventHandlerFunction();
    }
    
    const worksheet = getSelectedSheet(worksheetName);

    $('#selected_marks_title').text(worksheet.name);

    worksheet.getSelectedMarksAsync().then(function (marks) {
      const worksheetData = marks.data[0];

      const data = worksheetData.data.map(function (row, index) {
        const rowData = row.map(function (cell) {
          return cell.formattedValue;
        });

        return rowData;
      });

      const columns = worksheetData.columns.map(function (column) {
        return { title: column.fieldName };
      });

      var measures = Utils.findMeasures(columns);
      var cols = Utils.removeMeasuresColumns(measures,columns);
      var newCols = Utils.renameATTR(cols);
      var dt = Utils.removeMeasuresData(measures,data);
      datacolumns = newCols;

      if(dataTable){
        dataTable.row.add(dt[0]).draw();
      }else{
        populateDataTable(dt, newCols);
      }
    });

    unregisterEventHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, function (selectionEvent) {
      loadSelectedMarks(worksheetName);
    });
  }

  /**
   * Create de Datatable and show all the buttons 
   * */
  function populateDataTable (data, columns) {
    $('#data_table_wrapper').empty();

    if (data.length > 0) {
      $('#no_data_message').css('display', 'none');
      $('#data_table_wrapper').append(`<table id='data_table' class='table table-striped table-bordered'></table>`);

      var top = $('#data_table_wrapper')[0].getBoundingClientRect().top;
      var height = $(document).height() - top - 130;

      let xportColumns = tableau.extensions.settings.get('xportColumns');
      var new_columns = [];
      if(xportColumns){
        new_columns = JSON.parse(xportColumns);
        for(var i = 0; i < new_columns.length; i++){
          columns.push({title:new_columns[i], defaultContent:""});
        }
      }

      dataTable = $('#data_table').DataTable({
        data: data,
        columns: columns,
        autoWidth: false,
        deferRender: true,
        scroller: true,
        scrollY: height,
        scrollX: true,
        searching: false,
        select: 'true',
        dom: "<'row'<'col-sm-6'i><'col-sm-6'f>><'row'<'col-sm-12'tr>>",
      });

      dataTable.on('select', function ( e, dt, type, indexes ) {
        if ( type === 'row' ) {
          $('#edit_data_button').show();
        }
      });

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

  function hideButtons(){
    $('#edit_data_button').hide();
    $('#upload_data_button').hide();
    $('#insert_data_button').hide();
    $('#remove_data_button').hide();
  }
  function showButtons(){
    $('#upload_data_button').show();
      $('#insert_data_button').show();
      $('#remove_data_button').show();
  }

  /**
   * Submit Datatable data to Mysql
   */
  function uploadDB(){

    var json = Utils.dataTableToJson(dataTable);
    var payload = JSON.stringify(json);
    const popupUrl = `${window.location.origin}/html/XportMySQL.html`;

    tableau.extensions.ui.displayDialogAsync(popupUrl,payload,{ height: 500, width: 500 }).then((closePayload) => {
      $('#xport_options_dialog').modal('toggle');
    }).catch((error) => {

      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log("Dialog was closed by user");
          break;
        default:
          console.log(error.message);
      }
      $('#xport_options_dialog').modal('toggle');
    });

    
  }

  /**
   * Send the DataTable Data to the Rest Service
   */
  function uploadDataTableData(){

    var json = Utils.dataTableToJson(dataTable);
    var payload = JSON.stringify(json);

    const popupUrl = `${window.location.origin}/html/XportToRest.html`;

    tableau.extensions.ui.displayDialogAsync(popupUrl,payload,{ height: 500, width: 500 }).then((closePayload) => {
      $('#xport_options_dialog').modal('toggle');
    }).catch((error) => {

      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log("Dialog was closed by user");
          break;
        default:
          console.log(error.message);
      }
      $('#xport_options_dialog').modal('toggle');
    }); 
  }

  /**
   * Remove the new columns from the settings and destroy the datatable
   */
  function resetSettings () {
    tableau.extensions.settings.erase('xportColumns');
    tableau.extensions.settings.saveAsync();
    dataTable.destroy();
    dataTable = undefined;
    $('#data_table_wrapper').empty();
    $('#no_data_message').css('display', 'inline');
    $('#edit_data_button').hide();
    $('#upload_data_button').hide();
    $('#insert_data_button').hide();
    $('#remove_data_button').hide();
  }

})();