# Automated Task Status Notifier

Sends Gmail notifications when task statuses change or tasks become overdue, driven by a Google Sheet.

## Features
- Detects status changes (Pending → In Progress → Completed) and On Hold
- Sends styled, customised Gmail notifications for each change
- Alerts when tasks are past their Due Date and not Completed
- Tracks Last Status and Last Notified to prevent duplicate emails

## Tech
Google Sheets · Google Apps Script · GmailApp

## Sheet columns
Task | Assigned To | Due Date | Status | Last Notified | Priority | Last Status

## How it works
1. The script loops through each task row.
2. It compares Status with Last Status.
3. On a recognised change, or when overdue, it sends an email.
4. It updates Last Status and Last Notified.
5. A daily time-based trigger runs it automatically.

## Demo
[Demo video] · [Sample sheet] · [Screenshot of email]
