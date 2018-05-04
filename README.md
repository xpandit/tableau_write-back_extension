# Tableau Write-back Extension (Tableau Extension API)

## Setup and Running Samples

### Prerequisites
* You must have Node.js and npm installed. You can get these from [http://nodejs.org](http://nodejs.org).

### Setup

#### 1. Rest API
To allow write back data the extension needs an Endpoint to send the data.
To allow a simple deploy you can copy this [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1aiEek4tIkT4bH4BIQyCwkW9DzSJO7cgj-VyLV_AG1ek/copy) and configured it to allow the extension to send data to it;
After copying the Spreadsheed do the following:
1. Open the Spreadsheet;
2. Go to Tools -> Script;
3. You will see that there is already a script there. This  will be your REST API that will get the data from Tableau;
4. Select Publish > Deploy as web app.
5. Under Project version, select a new version.
6. Under Execute the app as, select whose authorization the app should run with: your account (the developer's) or the account of the user who visits the app (see permissions).
7. Under Who has access to the app, select who should be allowed to visit it. Select: "Anyone, even anonymous".
8. Click Deploy.
9. You will be prompted to allow the application to access your google spreadsheet, if you are not prompted to do it, please run the setup and enable the script to access your spreadsheet;
9. You will get a link like this: `https://script.google.com/...` 
10. You will need this link to send the Extension endpoint;

If you will use your own REST API. The Extension will send the data to the Endpoint using `POST` and the data format is the following:

```javascript
{
    input:'{
        "sheet":"Tableau",
        "columns":["Customer ID","Customer Name"],
        "data":[{
                "Customer ID":"MH-18025104",
                "Customer Name":"Michelle Huthwaite"
            },
            {
                "Customer ID":"NS-18640104",
                "Customer Name":"Noel Staavos"
            }],
    }',
    origin:"tableau"
}
```


#### 2. Tableau Extension
1. Copy the `.trex` file from the `manifest` folder to `~\Documents\My Tableau Repository\Extensions` so they are available to Tableau(This is not required because you can open it anywhere in your computer, it's just to keep this clean);
2. Open a command prompt window to the location where you cloned this repo.
3. Run `npm install`.
4. Run `npm start`.
5. Launch Tableau and in the Dashoard select the Extension to use.

#### 3. Extension Configuration
When you run the extension for the first time a Configuration Menu will Pop Up;
1. "Select the Worksheet" from where you want to get the data to see in the extension;
2. "Endpoint URL": Add your URL where, if you used the Google Spreadsheet add the `https://script.google.com/...` here;
3. "Select the Spreadsheet": If you are using Google Spreadsheet this will set the Sheet name;
4. "Add Columns": This allows you to add new columns to the Extension Table like comments that you want to add;
5. When you are done just it the "Ready to Go" Button;

## Powered By
This Extension uses [Datatables](https://datatables.net/) create the table that will display the worksheets data.