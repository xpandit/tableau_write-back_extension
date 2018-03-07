
(function () {

    var socket;

    $(document).ready(function () {
        

        tableau.extensions.initializeDialogAsync().then(function (payload) {

            socket = io.connect('http://localhost:4000');

            var inJson = JSON.parse(payload);

            $('#xport_mysql_close').click(closeDialog);

            var comments = [];
            for(var i = 0; i < inJson.data.length; i++){
                comments.push([inJson.data[i]["Customer ID"],inJson.data[i]["Comment"]]);
            }

            socket.on('success',function(data){
                $('#xport_MySQLResult').append('<p>Number of records Inserted: ' + data.affectedRows + '</p>')
                console.log(data)
            });

            socket.on('error',function(data){
                $('#xport_MySQLResult').append('<p>'+data+'</p>')
                console.log(data)
            });

            socket.emit('newComment',{comment:comments});
        });
    });

    function closeDialog() {
        socket.emit('disconnect');
        tableau.extensions.ui.closeDialog("ok");
      }
})();