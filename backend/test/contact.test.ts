import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock AWS SES Client
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendEmailCommand: vi.fn().mockImplementation((args: any) => args),
  };
});

// Import handler after mock
import { handler } from '../src/index';

function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/contact',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
  };
}

describe('Contact Form Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ MessageId: 'test-message-id' });
  });

  it('should handle OPTIONS preflight request with CORS headers', async () => {
    const event = createMockEvent({ httpMethod: 'OPTIONS' });
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(response.headers?.['Access-Control-Allow-Methods']).toContain('GET');
    expect(response.headers?.['Access-Control-Allow-Methods']).toContain('POST');
  });

  it('should return 200 and healthy status for GET /health', async () => {
    const event = createMockEvent({ httpMethod: 'GET', path: '/health' });
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('portfolio-contact-service');
    expect(body.timestamp).toBeDefined();
  });

  it('should reject GET on non-health paths with 405', async () => {
    const event = createMockEvent({ httpMethod: 'GET', path: '/contact' });
    const response = await handler(event);

    expect(response.statusCode).toBe(405);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Method Not Allowed');
  });

  it('should return 400 when body is empty', async () => {
    const event = createMockEvent({ body: null });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Request body is empty');
  });

  it('should return 400 when body is invalid JSON', async () => {
    const event = createMockEvent({ body: 'invalid-json{' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('Invalid JSON');
  });

  it('should return 400 when name is missing or empty', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ name: '', email: 'alex@example.com', message: 'Hello!' }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Name is required');
  });

  it('should return 400 when name is whitespace only', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ name: '   ', email: 'alex@example.com', message: 'Hello!' }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Name is required');
  });

  it('should return 400 when email is invalid', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ name: 'Alex', email: 'not-an-email', message: 'Hello!' }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('A valid email address is required');
  });

  it('should return 400 when message is missing or empty', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ name: 'Alex', email: 'alex@example.com', message: '   ' }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Message is required');
  });

  it('should return 400 when message exceeds the length limit', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ name: 'Alex', email: 'alex@example.com', message: 'a'.repeat(5001) }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('Input too long');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should return 400 when name exceeds the length limit', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ name: 'a'.repeat(101), email: 'alex@example.com', message: 'Hello!' }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('Input too long');
  });

  it('should successfully send email and return 200 for valid input', async () => {
    const event = createMockEvent({
      body: JSON.stringify({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        message: 'Excited to discuss your portfolio projects!',
      }),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.message).toContain('successfully');
  });

  it('should handle SES delivery errors gracefully with 500', async () => {
    mockSend.mockRejectedValueOnce(new Error('SES Service Unavailable'));

    const event = createMockEvent({
      body: JSON.stringify({
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello!',
      }),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toContain('Failed to deliver message');
  });
});
