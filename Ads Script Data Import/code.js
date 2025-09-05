
function main() {
  let ss = SpreadsheetApp.openByUrl('Replcewithurl');// add your sheet url here
  

  // define metrics and dimensions used. wrap with spaces for safety
  let campName    = ' campaign.name ';
  let cost        = ' metrics.cost_micros ';
  let conversionValue = ' metrics.conversions_value '; 
  let conv        = ' metrics.conversions ';
  let costperconversion = 'metrics.cost_per_conversion ';
  let clicks      = ' metrics.clicks ';
  let cpc = 'metrics.average_cpc ';
  let ctr = 'metrics.ctr ';
  let cpm = 'metrics.average_cpm';
  let install = 'metrics.biddable_app_install_conversions ';
  let status = 'campaign.status';         
  let date07      = ' segments.date DURING LAST_7_DAYS '   
  let order       = ' ORDER BY campaign.name'; 
  
  
  
  // build queries  
  let metrics = [campName, cost,conversionValue, conv, costperconversion, clicks, cpc, ctr, cpm, install, status] // campaign by day
  let campQuery = 'SELECT ' + metrics.join(',') + 
      ' FROM campaign ' +
      ' WHERE ' + date07 + 
      order ; 
  

  // call report function to pull data & push to named sheet
  runReport(campQuery, ss.getSheetByName('Trail - Google'));  //example

}

// query & export report data to named sheet
function runReport(query,sheet) {
  try {
    const report = AdsApp.report(query);
    sheet.clearContents(); // clear old data
    report.exportToSheet(sheet);  
  } catch (e) {
    Logger.log('Error running report: ' + e);
  }  
}
