const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken) {
    console.log('No push token provided');
    return;
  }

  // Skip dummy tokens from development
  if (pushToken === 'dummy-token-for-development') {
    console.log('Skipping dummy token');
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
  };

  try {
    const response = await axios.post(EXPO_PUSH_URL, message, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
    console.log(`📤 Push notification sent to ${pushToken.substring(0, 20)}...`);
    return response.data;
  } catch (error) {
    console.error('Error sending push notification:', error.response?.data || error.message);
  }
}

module.exports = { sendPushNotification };