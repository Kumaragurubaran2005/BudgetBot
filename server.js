const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DB_FILE = path.join(__dirname, 'sms_log.json');

// 🧠 Utility to safely load messages
function loadSMS() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const content = fs.readFileSync(DB_FILE, 'utf-8').trim();
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      console.warn('⚠️ Invalid JSON in log, resetting file.');
      fs.renameSync(DB_FILE, DB_FILE + '.corrupt_' + Date.now());
      saveSMS([]);
      return [];
    }
  } catch (err) {
    console.error('Error reading SMS log:', err);
    return [];
  }
}

// 🧠 Utility to save messages safely
function saveSMS(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing SMS log:', err);
  }
}

// 🧹 Utility to clear the log
function clearSMS() {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  console.log('🧹 SMS log cleared after being accessed.');
}

// 📨 POST: Receive SMS data (only store type + amount)
app.post('/smsinfodeposit', (req, res) => {
  const sms = req.body;

  // ✅ Only extract required fields
  const minimalSMS = {
    amount: sms.amount,
    type: sms.type
  };

  console.log('✅ Received minimal SMS:', minimalSMS);

  const messages = loadSMS();
  messages.push(minimalSMS);
  saveSMS(messages);

  res.json({
    status: 'success',
    message: 'SMS stored successfully!',
    received: minimalSMS
  });
});

// 📜 GET: Retrieve only type & amount, then clear
app.get('/smsinfogetter', (req, res) => {
  const messages = loadSMS();

  if (messages.length === 0) {
    return res.json({ status: 'empty', message: 'No SMS available' });
  }

  // ✅ Only return {type, amount} fields for each message
  const minimalData = messages.map(m => ({
    type: m.type,
    amount: m.amount
  }));

  res.json({
    count: minimalData.length,
    data: minimalData
  });

  // Clear data after sending
  setTimeout(() => clearSMS(), 500);
});

// 🧹 Optional manual clear
app.delete('/smsinfodeposit', (req, res) => {
  clearSMS();
  res.json({ status: 'cleared', message: 'All SMS records deleted manually.' });
});

// 🚀 Start the server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running!`);
  console.log(`➡ Local:   http://localhost:${PORT}`);
  console.log(`➡ Public:  https://ewa-wigless-raucously.ngrok-free.dev`);
});
