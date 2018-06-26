var Utils = (function(){

    return {
        createButton: function(buttonTitle) {
            const button =
            $(`<button type='button' class='btn btn-default btn-block'>
              ${buttonTitle}
            </button>`);
        
            return button;
        },

        dataTableToJson:function(dataTable,selected){
            //Set default value if undefined;
            selected = selected?selected:false;
            // Build Json With DataTable Data
            var jColumns=[];
            var jData = [];
            var columns = dataTable.settings().init().columns;
            var rows = selected? dataTable.rows('.selected').data().toArray() : dataTable.data().toArray();
            dataTable.columns().every(function(index) {
            jColumns.push(columns[index].title);
            })
            for ( var i = 0; i < rows.length; i ++ )
            {
            var data = {};
            for(var j = 0; j < jColumns.length; j++){
                data[jColumns[j]] = rows[i][j];
            }
            jData.push(data);
            }
            var json = {
            columns : jColumns,
            data : jData
            }

            return json;
        },

        dataTableColumns:function(dataTable){
            var jColumns=[];
            var columns = dataTable.settings().init().columns;
            dataTable.columns().every(function(index) {
            jColumns.push(columns[index].title);
            })

            return jColumns;
        },

        findMeasures: function(columns, srcFields){
            var measureIndex = [];
            for(var i = 0; i < columns.length; i++){
                var regex = /^[A-Z]*\((.*)\)$/g;
                var match = regex.exec(columns[i].title);
                if(match != null){
                    for (var s = 0; s < srcFields.length; s++){
                        var index = srcFields[s].map(field => field.name).indexOf(match[1]);
                        if (index != -1){
                            if(srcFields[s][index].role === 'measure'){
                                measureIndex.push(i);
                            }
                            break;
                        }
                    }
                }
            }

            return measureIndex;
        },

        renameATTR: function(columns){
            var clm = columns;
            for(var i = 0; i < columns.length; i++){
                var regex = /^ATTR\((.*)\)$/g
                var match = regex.exec(columns[i].title);
                if(match != null){clm[i].title = match[1]}
            }

            return clm;
        },

        removeMeasuresColumns: function(measureIndex, inputArray){
            var outputArray = [];
            for (var i = 0; i < inputArray.length; i++){
                if(measureIndex.indexOf(i)== -1){
                    outputArray.push(inputArray[i])
                }
            }
            return outputArray;
        },

        removeMeasuresData: function(measureIndex, inputArray){
            var outputArray = [];
            for (var d = 0; d < inputArray.length; d++){
                var inputdata = inputArray[d];
                var outputdata = [];
                for (var i = 0; i < inputdata.length; i++){
                    if(measureIndex.indexOf(i)== -1){
                        outputdata.push(inputdata[i])
                    }
                }
                outputArray.push(outputdata);
            }

            return outputArray;
        },

        removeDuplicatedColumns: function(dataColumns, xColumns){
            for(var i = 0; i < xColumns.length; i++){
                var index = dataColumns.findIndex(obj => obj.title === xColumns[i]);
                if (index !== -1) dataColumns.splice(index, 1);
            }

            return dataColumns;
        },


        // Unfinished
        replaceDefaultValueVar: function(expression, column, values) {
            let colIndex = column.map(c => c.title).indexOf(expression.name);
            let regex = /\[(.*)\]/g;
            values.map(row => {
                for(var c = 0 ; c < column.length && c != colIndex; c++){
                    if(typeof row[colIndex] === "string"){
                        let regex = "["+column[c].title+"]";
                        row[colIndex] = row[colIndex].replace(regex,row[c]);
                    }
                };
                var result = row[colIndex];
                try {
                    result = eval(result);
                }
                catch(err) {
                    console.error("Error Evaluating Value " + result);
                    console.log(err);
                }
                row[colIndex] = result;
            });
        },

        addConfigColumnsData: function(allColumns, configColumns, dataColumns, data) {
            var dt = [];
            data.map(row =>{
                var newData = new Array(allColumns.length).fill("");
                for(var i = 0; i < allColumns.length; i++){
                    let index = dataColumns.map(e => e.title).indexOf(allColumns[i].title);
                    if(index != -1){
                        newData[i] = row[index];
                    }else{
                        index = configColumns.map(e => e.name).indexOf(allColumns[i].title);
                        newData[i] = configColumns[index].defaultValue;
                    }
                }
                dt.push(newData);
            });

            return dt;
        },

        selectColumnsToSend: function(fieldsToSend, data){
            var inData = data;
            if(fieldsToSend){
                var i = 0;
              while( i < inData.columns.length){
                var index = fieldsToSend.indexOf(inData.columns[i]);
                if(index === -1){
                  inData.data.map(o => delete o[inData.columns[i]]);
                  inData.columns.splice(i,1);
                }else{
                    i++
                }
              }
            }
            return inData;
          }
    }
   
   }())