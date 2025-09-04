// CONFIG 
const META_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';
const GRAPH_VERSION = 'vXX.X';
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

//Replace with the user you want to whitelist, mail notif will only be sent if the user is in teh whitelisted names (case sensitive)
const MAIL_USER_FILTERS = [
  'Whitelisted User 1',
  'Whitelisted User 2',
];

//Add mail id to mailing list for users to be notified
const MAIL_TO = ['example1@gmail.com', 'example2@gmail.com'];

/**
 * Dispatcher
 */
function getMetaActivitiesAllAccounts() {
  // Call each account function you need
  getMetaActivities_Account1();
  getMetaActivities_Account2();
  getMetaActivities_Account3();
}

/**
 * Individual account functions
 * (Replace with your own ad account IDs & labels)
 */
function getMetaActivities_Account1() { 
  fetchActivitiesForAccount('act_XXXXXXXXXXXXXXX', 'Account 1'); 
}
function getMetaActivities_Account2() { 
  fetchActivitiesForAccount('act_XXXXXXXXXXXXXXX', 'Account 2'); 
}
function getMetaActivities_Account3() { 
  fetchActivitiesForAccount('act_XXXXXXXXXXXXXXX', 'Account 3'); 
}



/**
 * Generic function
 */
function fetchActivitiesForAccount(accountId, accountName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const until = Math.floor(Date.now() / 1000);
  const since = until - (12 * 60 * 60); // last 12 hours (Edit the hours if required)
  let emailRows = [];

  Logger.log(`Fetching activities for ${accountName}`);
  let sheet = ss.getSheetByName(accountName);
  if (!sheet) sheet = ss.insertSheet(accountName);

  // Fetch all campaigns
  const campaignMap = {};
  let campaignUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/campaigns?fields=id,name&limit=500&access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;
  while (campaignUrl) {
    const { data, next } = fetchPage_(campaignUrl);
    for (const camp of data) {
      campaignMap[camp.id] = camp.name;
    }
    campaignUrl = next;
  }

  // Fetch all ad sets
  const adsetMap = {};
  let adsetUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/adsets?fields=id,name,campaign_id&limit=500&access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;
  while (adsetUrl) {
    const { data, next } = fetchPage_(adsetUrl);
    for (const adset of data) {
      adsetMap[adset.id] = {
        adsetName: adset.name,
        campaignId: adset.campaign_id,
        campaignName: campaignMap[adset.campaign_id] || ''
      };
    }
    adsetUrl = next;
  }

  // Fetch ads
  const adsMap = {};
  let adsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/ads?fields=id,name,adset_id,campaign_id&limit=500&access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;
  while (adsUrl) {
    const { data, next } = fetchPage_(adsUrl);
    for (const ad of data) {
      adsMap[ad.id] = {
        adName: ad.name,
        adsetId: ad.adset_id,
        campaignId: ad.campaign_id
      };
    }
    adsUrl = next;
  }

  // Fetch activities
  let activityUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/activities?fields=event_time,event_type,translated_event_type,actor_name,actor_id,object_type,object_id,object_name,extra_data&since=${since}&until=${until}&limit=100&access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;
  
  while (activityUrl) {
    const { data, next } = fetchPage_(activityUrl);
    if (data && data.length) {
      const rows = [];
      for (const act of data) {
        if (act.actor_name && act.actor_name.toUpperCase() === 'META') continue;

        const objectType = normalizeObjectType(act.object_type);
        const activityObjectId = act.extra_data?.object_id || act.object_id;
        const { adName, adsetName, campaignName } = resolveActivityObject(activityObjectId);

        const details = formatExtraData(act.extra_data) || '';
        rows.push([
          act.event_time ? new Date(act.event_time) : '',
          act.translated_event_type || '',
          campaignName,
          adsetName,
          objectType || '',
          act.object_name,
          act.actor_name || '',
          details
        ]);

        // Collect emails for whitelisted actors
        if (MAIL_USER_FILTERS.includes(act.actor_name)) {
          emailRows.push({
            account: accountName,
            campaign: campaignName,
            adset: adsetName,
            object: act.object_name,
            change: act.translated_event_type || act.event_type,
            actor: act.actor_name,
            time: act.event_time ? new Date(act.event_time) : '', 
            info: details
          });
        }
      }
      if (rows.length) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
             .setValues(rows);
      }
    }
    activityUrl = next;
  }

  if (emailRows.length) sendEmailNotification(emailRows);
  else Logger.log(`No whitelist user changes found for ${accountName}.`);

  function resolveActivityObject(objectId) {
    let campaignName = '';
    let adsetName = '';
    let adName = '';

    if (adsMap[objectId]) {
      adName = adsMap[objectId].adName;
      adsetName = adsetMap[adsMap[objectId].adsetId]?.adsetName || '';
      campaignName = campaignMap[adsMap[objectId].campaignId] || '';
    } else if (adsetMap[objectId]) {
      adsetName = adsetMap[objectId].adsetName;
      campaignName = campaignMap[adsetMap[objectId].campaignId] || '';
    } else if (campaignMap[objectId]) {
      campaignName = campaignMap[objectId];
    }

    return { adName, adsetName, campaignName };
  }
}

/**
 * Helpers
 */
function fetchPage_(url) {
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() >= 400) {
    throw new Error(`Graph API error ${resp.getResponseCode()}: ${resp.getContentText()}`);
  }
  const json = JSON.parse(resp.getContentText());
  return { data: json.data || [], next: json.paging?.next || null };
}

function sendEmailNotification(emailRows) {
  const tableRows = emailRows.map(row => `
    <tr>
      <td>${row.account}</td>
      <td>${row.campaign}</td>
      <td>${row.adset}</td>
      <td>${row.object}</td>
      <td>${row.change}</td>
      <td>${row.actor}</td>
      <td>${row.time}</td>
      <td>${row.info}</td>
    </tr>`).join('');

  const htmlBody = `
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; font-family:Arial; font-size:14px; width:100%;">
      <thead style="background-color:#f2f2f2; text-align:left;">
        <tr>
          <th>Account</th><th>Campaign</th><th>Ad Set</th><th>Object</th>
          <th>Change</th><th>Actor</th><th>Time</th><th>Details</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  MailApp.sendEmail({
    to: MAIL_TO.join(','),
    subject: 'Meta Ads Activity Changes (Whitelisted Users)',
    htmlBody: htmlBody
  });
}

function formatExtraData(extraData) {
  if (!extraData) return '';
  try {
    const obj = typeof extraData === 'string' ? JSON.parse(extraData) : extraData;
    let formatted = '';
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        for (const subKey in obj[key]) {
          formatted += `${key}.${subKey}: ${obj[key][subKey]}, `;
        }
      } else {
        formatted += `${key}: ${obj[key]}, `;
      }
    }
    return formatted.replace(/, $/, '');
  } catch (e) {
    return extraData;
  }
}

function normalizeObjectType(objectType) {
  switch (objectType) {
    case 'ADGROUP':
      return 'AD';       
    case 'CAMPAIGN':
      return 'AD GROUP';  
    default:
      return objectType; 
  }
}
