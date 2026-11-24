const mongoose = require("mongoose");
const Click = require("../models/click");

const top = (rows, n = 6) =>
  rows
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((r) => ({ name: r._id, count: r.count }));

const groupBy = (urlId, field) =>
  Click.aggregate([
    { $match: { url: urlId } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);

async function getAnalytics(urlDoc, days = 14) {
  const urlId = new mongoose.Types.ObjectId(String(urlDoc._id));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceDay = since.toISOString().slice(0, 10);

  const [perDay, referrers, browsers, devices, oses, recent] = await Promise.all([
    Click.aggregate([
      { $match: { url: urlId, day: { $gte: sinceDay } } },
      { $group: { _id: "$day", count: { $sum: 1 } } },
    ]),
    groupBy(urlId, "referrer"),
    groupBy(urlId, "browser"),
    groupBy(urlId, "device"),
    groupBy(urlId, "os"),
    Click.find({ url: urlId }).sort({ timestamp: -1 }).limit(10).lean(),
  ]);

  // Fill missing days with 0 so the chart has a continuous x-axis.
  const map = new Map(perDay.map((r) => [r._id, r.count]));
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, clicks: map.get(key) || 0 });
  }

  return {
    totalClicks: urlDoc.clickCount,
    clicksPerDay: series,
    referrers: top(referrers),
    browsers: top(browsers),
    devices: top(devices),
    os: top(oses),
    recent: recent.map((c) => ({
      timestamp: c.timestamp, referrer: c.referrer, browser: c.browser, os: c.os, device: c.device,
    })),
  };
}

module.exports = { getAnalytics };
