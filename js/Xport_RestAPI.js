'use strict';

(function () {

    let inJson;

    $(document).ready(function () {

        tableau.extensions.initializeDialogAsync().then(function (payload) {

            console.log(tableau.extensions.settings.getAll());
            var endpointURL = tableau.extensions.settings.get('endpointURL');

            $('#endpointURL').val(endpointURL);

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
        var sendJson = {data:[]};

        for (var j = 0; j < inJson.data.length; j++){
            var dt = {};
            for(var i = 0; i < checked.length; i++){
                dt[checked[i].value]=inJson.data[j][checked[i].value];
            }
            sendJson.data.push(dt);
        }
        
        //if (unchecked.length > 0)

        var endpointURL = $('#endpointURL').val();

        tableau.extensions.settings.set('endpointURL', endpointURL);
        tableau.extensions.settings.saveAsync().then(() => {
            /* $.ajax({
                url: endpointURL,
                type: "POST",
                data: sendJson,
                dataType: "json",
                success: function(result){
                    tableau.extensions.ui.closeDialog("val");
                },
                error: function(xhr,status,error){
                    tableau.extensions.ui.closeDialog("val");
                  //alert(xhr.responseText+" "+error);
                }
            }); */
            $.post( endpointURL, sendJson,function( data ) {
                tableau.extensions.ui.closeDialog("val");
              }, "json");
        });
      }

})();