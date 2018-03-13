'use strict';

(function () {

    let inJson;

    $(document).ready(function () {

        tableau.extensions.initializeDialogAsync().then(function (payload) {

            console.log(tableau.extensions.settings.getAll());
            var endpointURL = tableau.extensions.settings.get('endpointURL');

            $('#endpointURL').val('https://script.google.com/macros/s/AKfycbxwyMuqEm-1093N8bQTFMRmviKWFw2sWxPrZ98V4byignJClrk/exec');
            //$('#endpointURL').val(endpointURL);

            $('#xport_ajax_post').click(closeDialog);
            
            inJson = JSON.parse(payload);

            for(var i = 0; i < inJson.columns.length; i++){
                $('#xport_new_select').append(`<div class="checkbox">
                <label><input type="checkbox" value="${inJson.columns[i]}" checked>${inJson.columns[i]}</label>
              </div>`)
            }

            
        });
    });
    

    function closeDialog() {

        var checked = $(":checked");
        var sendJson = {"data":[]};

        for (var j = 0; j < inJson.data.length; j++){
            var dt = {};
            for(var i = 0; i < checked.length; i++){
                dt[checked[i].value]=inJson.data[j][checked[i].value];
            }
            sendJson["data"].push(dt);
        }
        var columns = [];

        for(var i = 0; i < checked.length; i++){
            columns.push(checked[i].value);
        }
        
        sendJson.columns = columns;
        sendJson.sheet = "Tableau";

        var endpointURL = $('#endpointURL').val();

        tableau.extensions.settings.set('endpointURL', endpointURL);
        tableau.extensions.settings.saveAsync().then(() => {
            $.ajax({
                url:endpointURL,
                type : "POST", 
                data : {
                  origin : 'tableau',
                  input : JSON.stringify(sendJson) 
                },
                dataType: 'json',
                success : function (data, status, xhr) {
                  console.log("success");
                  if(data.error !=undefined){
                      console.error("AJAX POST ERROR");
                  }
                  console.log(data);
                },
                complete : function (xhr, status) {
                  console.log("complete");
                  //tableau.extensions.ui.closeDialog("val");
                }
              });

            // $.ajax({
            //     url: endpointURL,
            //     type: "POST",
            //     data: JSON.stringify(sendJson),
            //     contentType:"application/json; charset=utf-8",
            //     dataType: "json",
            //     success: function(result){
            //         tableau.extensions.ui.closeDialog("val");
            //     },
            //     error: function(xhr,status,error){
            //         tableau.extensions.ui.closeDialog("val");
            //       //alert(xhr.responseText+" "+error);
            //     }
            // });
            /* $.post( endpointURL, JSON.stringify(sendJson),function( data ) {
                tableau.extensions.ui.closeDialog("val");
              }, "json");*/
        });
      }

})();