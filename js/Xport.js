'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  
  let unregisterEventHandlerFunction;
  let dataTable;
  let datacolumns;

  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {
    // Tell Tableau we'd like to initialize our extension
    tableau.extensions.initializeAsync().then(function () {
      // Fetch the saved sheet name from settings. This will be undefined if there isn't one configured yet
      console.log(tableau.extensions.settings.getAll());
      var xportColumns = tableau.extensions.settings.get('xportColumns');
      const savedSheetName = tableau.extensions.settings.get('sheet');
      if(!xportColumns){
        xportColumns = [];
        tableau.extensions.settings.set('xportColumns',JSON.stringify(xportColumns));
        tableau.extensions.settings.saveAsync();
      }
      console.log(tableau.extensions.settings.getAll());
      if (savedSheetName) {
        // We have a saved sheet name, show its selected marks
        loadSelectedMarks(savedSheetName);
      } else {
        // If there isn't a sheet saved in settings, show the dialog
        showChooseSheetDialog();
      }
      initializeButtons();
    });
  });

  /**
   * Shows the choose sheet UI. Once a sheet is selected, the data table for the sheet is shown
   */
  function showChooseSheetDialog () {
    // Clear out the existing list of sheets
    $('#choose_sheet_buttons').empty();

    // Set the dashboard's name in the title
    const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
    $('#choose_sheet_title').text(dashboardName);

    // The first step in choosing a sheet will be asking Tableau what sheets are available
    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

    // Next, we loop through all of these worksheets and add buttons for each one
    worksheets.forEach(function (worksheet) {
      // Declare our new button which contains the sheet name
      const button = Utils.createButton(worksheet.name);

      // Create an event handler for when this button is clicked
      button.click(function () {
        // Get the worksheet name and save it to settings.
        const worksheetName = worksheet.name;
        tableau.extensions.settings.set('sheet', worksheetName);
        tableau.extensions.settings.saveAsync().then(function () {
          // Once the save has completed, close the dialog and show the data table for this worksheet
          $('#choose_sheet_dialog').modal('toggle');
        });
      });
      // Set our title to an appropriate value
      $('#selected_marks_title').text(worksheet.name);
      // Add our button to the list of worksheets to choose from
      $('#choose_sheet_buttons').append(button);
    });
    // Show the dialog
    $('#choose_sheet_dialog').modal('toggle');
  }

  /**
   * Shows the choose Export Options UI. One the option is selected the new Dialog Opens.
   */
  function showChooseExportDialog () {
    //Apply on Click Function
    $('#restAPI').click(function(){
      uploadDataTableData();
    });
    // Show the modal
    $('#xport_options_dialog').modal('toggle');
  }



  function showInsertNewRecord () {

    //Get the path for the new Dialog HTML File
    const popupUrl = `${window.location.origin}/XportDialog.html`;

    //Create List of Columns to Render in the Dialog
    var jColumns = Utils.dataTableColumns(dataTable);
    
    // Set the Dialog Payload
    var payload = JSON.stringify(jColumns);

    //Show the new Dialog
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
      // One expected error condition is when the popup is closed by the user (meaning the user
      // clicks the 'X' in the top right of the dialog).  This can be checked for like so:
      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log("Dialog was closed by user");
          break;
        default:
          console.log(error.message);
      }
    });
  }

  function initializeButtons () {
    $('#show_choose_sheet_button').click(showChooseSheetDialog);
    $('#reset_settings').click(resetSettings);

    $('#insert_data_button').click(showInsertNewRecord);
    $('#edit_data_button').click(editRecord);
    $('#remove_data_button').click(removeRecord);
    $('#upload_data_button').click(showChooseExportDialog);
    $('#insert_data_button').hide();
    $('#edit_data_button').hide();
    $('#upload_data_button').hide();
    $('#remove_data_button').hide();
  }

  function removeRecord () {
    dataTable.row('.selected').remove().draw( false );
  }

  function editRecord () {
    var jColumns = Utils.dataTableColumns(dataTable);
    var row = dataTable.row('.selected').data();

    //Get the path for the new Dialog HTML File
    const popupUrl = `${window.location.origin}/XportEditRecord.html`;
    
    // Set the Dialog Payload
    var payload = JSON.stringify({columns:jColumns, data: row});

    //Show the new Dialog
    tableau.extensions.ui.displayDialogAsync(popupUrl,payload,{ height: 500, width: 500 }).then((closePayload) => {
      var payloadArray = JSON.parse(closePayload);
      if(payloadArray.length > 0){
        dataTable.row('.selected').remove()
        dataTable.row.add(JSON.parse(closePayload)).draw();
      }
    }).catch((error) => {
      // One expected error condition is when the popup is closed by the user (meaning the user
      // clicks the 'X' in the top right of the dialog).  This can be checked for like so:
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

    // Go through all the worksheets in the dashboard and find the one we want
    return tableau.extensions.dashboardContent.dashboard.worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });
  }


  function loadSelectedMarks (worksheetName) {
    // Remove any existing event listeners
    if (unregisterEventHandlerFunction) {
      unregisterEventHandlerFunction();
    }
    
    // Get the worksheet object we want to get the selected marks for
    const worksheet = getSelectedSheet(worksheetName);

    // Set our title to an appropriate value
    $('#selected_marks_title').text(worksheet.name);

    // Call to get the selected marks for our sheet
    worksheet.getSelectedMarksAsync().then(function (marks) {
      // Get the first DataTable for our selected marks (usually there is just one)
      const worksheetData = marks.data[0];

      // Map our data into the format which the data table component expects it
      const data = worksheetData.data.map(function (row, index) {
        const rowData = row.map(function (cell) {
          return cell.formattedValue;
        });

        return rowData;
      });

      const columns = worksheetData.columns.map(function (column) {
        return { title: column.fieldName };
      });
      //Remove Measures
      var measures = Utils.findMeasures(columns);
      var cols = Utils.removeMeasuresColumns(measures,columns);
      var dt = Utils.removeMeasuresData(measures,data);
      datacolumns = cols;
      // Populate the data table with the rows and columns we just pulled out
      if(dataTable){
        dataTable.row.add(dt[0]).draw();
      }else{
        populateDataTable(dt, cols);
      }
    });

    // Add an event listener for the selection changed event on this sheet.
    unregisterEventHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, function (selectionEvent) {
      loadSelectedMarks(worksheetName);
    });
  }

  function populateDataTable (data, columns) {
    // Do some UI setup here: change the visible section and reinitialize the table
    $('#data_table_wrapper').empty();

    if (data.length > 0) {
      $('#no_data_message').css('display', 'none');
      $('#data_table_wrapper').append(`<table id='data_table' class='table table-striped table-bordered'></table>`);

      // Do some math to compute the height we want the data table to be
      var top = $('#data_table_wrapper')[0].getBoundingClientRect().top;
      var height = $(document).height() - top - 130;

      //columns.push({"data": null,"defaultContent": "<button>Edit</button>"})
      let xportColumns = tableau.extensions.settings.get('xportColumns');
      var new_columns = [];
      if(xportColumns){
        new_columns = JSON.parse(xportColumns);
        for(var i = 0; i < new_columns.length; i++){
          columns.push({title:new_columns[i], defaultContent:""});
        }
      }
      
      // Initialize our data table with what we just gathered

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

      $('#upload_data_button').show();
      $('#insert_data_button').show();
      $('#remove_data_button').show();
      $('#edit_data_button').show();
    } else {
      // If we didn't get any rows back, there must be no marks selected
      $('#no_data_message').css('display', 'inline');
      $('#edit_data_button').hide();
      $('#upload_data_button').hide();
      $('#insert_data_button').hide();
      $('#remove_data_button').hide();
    }
  }

  function uploadDataTableData(){

    var json = Utils.dataTableToJson(dataTable);

    // Create the payload for the new Dialog
    var payload = JSON.stringify(json);

    // Create the Dialog URL
    const popupUrl = `${window.location.origin}/XportToRest.html`;

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
      //Close the Modal
      $('#xport_options_dialog').modal('toggle');
    }); 
  }

  /**
   * Shows the choose sheet UI. Once a sheet is selected, the data table for the sheet is shown
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