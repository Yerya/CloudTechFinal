const request = require('supertest');
const { app, startServer } = require('../index');
const pool = require('../db');
const { encrypt, decrypt } = require('../crypto');

jest.mock('../db');
jest.mock('../crypto');

describe('Payments Service', () => {
    let server;

    beforeAll(() => {
        server = startServer();
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        encrypt.mockImplementation(text => `encrypted_${text}`);
        decrypt.mockImplementation(text => text.replace('encrypted_', ''));
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(server).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('service', 'payments');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(server).get('/metrics');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('service', 'payments');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /payments', () => {
        it('should return all payments', async () => {
            const mockPayments = [
                { id: 1, order_id: 1, amount: 'encrypted_99.99', payment_date: '2024-05-26T00:00:00Z' }
            ];

            pool.query.mockResolvedValueOnce({ rows: mockPayments });

            const response = await request(server).get('/payments');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([
                { id: 1, order_id: 1, amount: '99.99', payment_date: '2024-05-26T00:00:00Z' }
            ]);
        });
    });

    describe('POST /payments', () => {
        it('should validate required fields', async () => {
            const response = await request(server).post('/payments').send({ payment_date: '2024-05-26T00:00:00Z' });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Valid order_id is required');
        });
    });
});
