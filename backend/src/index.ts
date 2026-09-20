import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
});

const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'ka09934147002@gmail.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || RECIPIENT_EMAIL;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Request body is empty' }),
      };
    }

    let payload: ContactPayload;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON format in request body' }),
      };
    }

    const { name, email, message } = payload;

    // Validate fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Name is required' }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'A valid email address is required' }),
      };
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Sanitize input
    const cleanName = name.trim().replace(/[\r\n]/g, ' ');
    const cleanEmail = email.trim().replace(/[\r\n]/g, '');
    const cleanMessage = message.trim();

    const timestamp = new Date().toUTCString();

    // Prepare SES email command
    const emailCommand = new SendEmailCommand({
      Source: SENDER_EMAIL,
      Destination: {
        ToAddresses: [RECIPIENT_EMAIL],
      },
      ReplyToAddresses: [cleanEmail],
      Message: {
        Subject: {
          Data: `[Portfolio Contact] New message from ${cleanName}`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: `You received a new message from your portfolio contact form:\n\nName: ${cleanName}\nEmail: ${cleanEmail}\nDate: ${timestamp}\n\nMessage:\n${cleanMessage}\n`,
            Charset: 'UTF-8',
          },
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #00bcd4; border-bottom: 2px solid #eee; padding-bottom: 8px;">New Contact Message</h2>
                <p><strong>From:</strong> ${escapeHtml(cleanName)} (&lt;<a href="mailto:${escapeHtml(cleanEmail)}">${escapeHtml(cleanEmail)}</a>&gt;)</p>
                <p><strong>Received:</strong> ${timestamp}</p>
                <div style="background-color: #f9f9f9; border-left: 4px solid #00bcd4; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <h4 style="margin-top: 0; color: #555;">Message:</h4>
                  <p style="white-space: pre-wrap; margin-bottom: 0;">${escapeHtml(cleanMessage)}</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #888;">Sent from Kumar Aditya's Developer Portfolio Contact Form</p>
              </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(emailCommand);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Thank you! Your message has been sent successfully.',
      }),
    };
  } catch (err: any) {
    console.error('Error sending contact email via SES:', err);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to deliver message. Please try again later or contact directly via email.',
      }),
    };
  }
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
