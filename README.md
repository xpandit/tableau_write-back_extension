# Tableau Write-back Extension (Tableau Extension API)

## Setup and Running Samples

### Prerequisites
* You must have Node.js and npm installed. You can get these from [http://nodejs.org](http://nodejs.org).

### Setup

#### 1. Rest API
To allow write back data the extension needs an Endpoint to send the data.
To allow a simple deploy you can copy this [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1LrUdE6xs0HM45Hc24L4qvMfVlouetQeSndbKgTNAN_I/copy) and configured it to allow the extension to send data to it;
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

#### 2. Tableau Extension
1. Copy the `.trex` file from the `manifest` folder to `~\Documents\My Tableau Repository\Extensions` so they are available to Tableau(This is not required because you can open it anywhere in your computer, it's just to keep this clean);
2. Open a command prompt window to the location where you cloned this repo.
3. Run `npm install`.
4. Globally instal local-web-server. This is necessary because we need to use the ws cli to run the http server locally.
5. npm i -g local-web-server
6. Run `npm start`.
7. Launch Tableau and in the Dashoard select the Extension to use.