var mysql = require('mysql');

$(document).ready(function () {

    tableau.extensions.initializeDialogAsync().then(function (payload) {

        var con = mysql.createConnection({
            host: "localhost",
            user: "yourusername",
            password: "yourpassword"
          });
          
          con.connect(function(err) {
            if (err) throw err;
            console.log("Connected!");
          });

        
    });
});