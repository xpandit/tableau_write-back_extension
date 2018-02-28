'use strict';

(function () {

    var colArray = [];

    $(document).ready(function () {

        tableau.extensions.initializeDialogAsync().then(function (payload) {

            $('#xport_edit_record_button').click(closeDialog);

            // Clear out the existing list
            $('#xport_edit_values').empty();

            colArray = JSON.parse(payload);
            //$('#save').click($('#newSetting').modal('toggle'));
            for(var i = 0;i< colArray.columns.length ; i++){
                $('#xport_edit_values').append(
                    `<div class="input">
                    <label for="val${i}">${colArray.columns[i]}</label>
                    <input id="val${i}" type="text" class="form-control" value=${colArray.data[i]}></div>`
                );
            };
        });
    });

    function closeDialog() {
        tableau.extensions.settings.saveAsync().then(() => {
            var vals = [];
            for(var i = 0;i< colArray.columns.length ; i++){
                vals.push($(`#val${i}`).val());
            };
        
            tableau.extensions.ui.closeDialog(JSON.stringify(vals));
        });
      }

})();