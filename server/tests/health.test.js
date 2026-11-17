import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('should return 200 and healthy status response with database state', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'HireTrack API is healthy');
    expect(res.body.data).toHaveProperty('status', 'ok');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data.database).toHaveProperty('state');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('uptime');
  });

  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/not found/i);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

