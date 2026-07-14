"use strict";

var webpush = require("web-push");

var hour = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  hour: "2-digit",
  hour12: false
}).format(new Date());

if (hour !== "20" && process.env.FORCE_SEND !== "true") {
  console.log("Not 20:00 Israel time (it's " + hour + ":xx), skipping.");
  process.exit(0);
}

var subJson = process.env.PUSH_SUBSCRIPTION;
if (!subJson) {
  console.log("No PUSH_SUBSCRIPTION secret set yet, skipping.");
  process.exit(0);
}

var subscription = JSON.parse(subJson);

webpush.setVapidDetails(
  "mailto:ricocir1234@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

webpush
  .sendNotification(subscription, JSON.stringify({
    title: "ROTA",
    body: "Time for your daily workout 💪"
  }))
  .then(function () {
    console.log("Reminder sent.");
  })
  .catch(function (err) {
    console.error("Failed to send reminder:", err);
    process.exit(1);
  });
