function monitorTaskStatusChanges() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data[0];

  const emailRecipient = "replace@gmail.com"; 

  const taskIndex = header.indexOf("Task");
  const assignedToIndex = header.indexOf("Assigned To");
  const dueDateIndex = header.indexOf("Due Date");
  const statusIndex = header.indexOf("Status");
  const lastNotifiedIndex = header.indexOf("Last Notified");
  const priorityIndex = header.indexOf("Priority");
  const lastStatusIndex = header.indexOf("Last Status");

  const today = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const task = row[taskIndex];
    const assignedTo = row[assignedToIndex];
    const dueDate = new Date(row[dueDateIndex]);
    const status = row[statusIndex];
    const lastStatus = row[lastStatusIndex];

    let subject = "";
    let message = "";

    // Status change detection
    if (status !== lastStatus) {
      if (lastStatus === "Pending" && status === "In Progress") {
        subject = `Task Started: "${task}"`;
        message = `Hi ${assignedTo},\n\nThe task "${task}" is now In Progress.\n\nPlease continue your work as scheduled.`;
      } else if (lastStatus === "In Progress" && status === "Completed") {
        subject = `Task Completed: "${task}"`;
        message = `Hi ${assignedTo},\n\nGreat job! The task "${task}" has been marked as Completed.\n\nThanks for your effort.`;
      } else if (status === "On Hold") {
        subject = `Task On Hold: "${task}"`;
        message = `Hi ${assignedTo},\n\nThe task "${task}" is now On Hold. We'll notify you when it's resumed.\n\nPlease await further instructions.`;
      }

      if (subject) {
        MailApp.sendEmail(emailRecipient, subject, message);
        sheet.getRange(i + 1, lastNotifiedIndex + 1).setValue(formatDate(today));
        Logger.log(`Status change notification sent for row ${i + 1}: ${subject}`);
      }

      // Update Last Status
      sheet.getRange(i + 1, lastStatusIndex + 1).setValue(status);
    }

    // Overdue check (only if not completed)
    if (status !== "Completed" && today > dueDate) {
      const notifiedDate = new Date(row[lastNotifiedIndex]);
      const daysSinceNotified = (today - notifiedDate) / (1000 * 60 * 60 * 24);

      if (isNaN(notifiedDate) || daysSinceNotified >= 1) {
        subject = `Task Overdue: "${task}"`;
        message = `Hi ${assignedTo},\n\nThe task "${task}" was due on ${formatDate(dueDate)} and is still marked as "${status}".\n\nPlease take immediate action.`;

        MailApp.sendEmail(emailRecipient, subject, message);
        sheet.getRange(i + 1, lastNotifiedIndex + 1).setValue(formatDate(today));
        Logger.log(`Overdue notification sent for row ${i + 1}: ${subject}`);
      }
    }
  }

  Logger.log("Task monitoring completed.");
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "MM/dd/yyyy");
}
