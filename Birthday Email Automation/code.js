Logger.log("Spreadsheet URL: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());
function sendBirthdayEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Birthdays");
  const data = sheet.getDataRange().getValues();

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth(); // January = 0
  const isFirstOfJan = todayDay === 1 && todayMonth === 0;

  const header = data[0];
  const nameIndex = header.indexOf("First Name");
  const emailIndex = header.indexOf("Email");
  const birthdayIndex = header.indexOf("Birthday");
  const statusIndex = header.indexOf("Status");

   // Reset all statuses if it's Jan 1st
  if (isFirstOfJan) {
    for (let i = 1; i < data.length; i++) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(""); // clear "Sent"/"Failed" status
    }
    Logger.log("Status column reset for the new year.");
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const birthdayStr = row[birthdayIndex];
    const status = row[statusIndex];

    if (!birthdayStr || status === "Sent" || status === "Invalid Email") continue;

    try {
      const birthday = new Date(birthdayStr);
      if (birthday.getDate() === todayDay && birthday.getMonth() === todayMonth) {
        const name = row[nameIndex];
        const email = row[emailIndex];

        const subject = `Happy Birthday, ${name}! 🎉`;
        const body = `
          <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
              <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #2e6f95;">🎂 Happy Birthday, ${name}!</h2>
                <p>Dear ${name},</p>
                <p>On behalf of everyone at <strong>JTech</strong>, we’d like to wish you a very Happy Birthday!</p>
                <p>We hope your day is filled with joy, laughter, and memorable moments.</p>
                <p>Here’s to another year of success, happiness, and great opportunities. 🎈🎉</p>
                <br>
                <p>Warm regards,</p>
                <p><strong>JTech Team</strong></p>
                <img src="https://cdn.pixabay.com/photo/2016/12/26/17/28/birthday-1936544_1280.png" alt="Birthday Cake" width="100" style="margin-top: 20px;" />
              </div>
            </body>
          </html>
        `;

        GmailApp.sendEmail(email, subject, '', { htmlBody: body });

        // Update status
        sheet.getRange(i + 1, statusIndex + 1).setValue("Sent");

        // Console log
        Logger.log(` Email sent to ${name} (${email})`);
      }
    } catch (error) {
      const failMessage = ` Failed to send email to ${row[nameIndex]} (${row[emailIndex]}): ${error.message}`;
      Logger.log(failMessage);

      // Update status in sheet
      sheet.getRange(i + 1, statusIndex + 1).setValue("Failed: " + error.message);
    }
  }

  Logger.log(" Birthday email process completed.");
}
