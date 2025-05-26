const request = require('supertest');
const { app, startServer } = require('../index');
const pool = require('../db');
const { encrypt, decrypt } = require('../crypto');

jest.mock('../db');
jest.mock('../crypto');
jest.mock('../cache', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
}));

describe('Delivery Service', () => {
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
            expect(response.body).toHaveProperty('service', 'delivery');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(server).get('/metrics');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('service', 'delivery');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /delivery', () => {
        it('should return all deliveries', async () => {
            const mockDeliveries = [
                { id: 1, order_id: 1, address: 'encrypted_123 Main St', delivery_date: '2024-05-27T00:00:00Z' }
            ];

            pool.query.mockResolvedValueOnce({ rows: mockDeliveries });

            const response = await request(server).get('/delivery');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([
                { id: 1, order_id: 1, address: '123 Main St', delivery_date: '2024-05-27T00:00:00Z' }
            ]);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM delivery');
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(server).get('/delivery');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /delivery', () => {
        it('should create a new delivery', async () => {
            const newDelivery = {
                order_id: 1,
                address: '123 Main St',
                delivery_date: '2024-05-27T00:00:00Z'
            };

            const mockDbResponse = {
                rows: [{
                    id: 1,
                    order_id: 1,
                    address: 'encrypted_123 Main St',
                    delivery_date: '2024-05-27T00:00:00Z'
                }]
            };

            pool.query.mockResolvedValueOnce(mockDbResponse);

            const response = await request(server)
                .post('/delivery')
                .send(newDelivery);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                order_id: 1,
                address: '123 Main St',
                delivery_date: '2024-05-27T00:00:00Z'
            });
            expect(pool.query).toHaveBeenCalled();
        });

        it('should handle database errors on creation', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(server)
                .post('/delivery')
                .send({
                    order_id: 1,
                    address: '123 Main St',
                    delivery_date: '2024-05-27T00:00:00Z'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });

        it('should validate required fields', async () => {
            const response = await request(server)
                .post('/delivery')
                .send({ delivery_date: '2024-05-27T00:00:00Z' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Valid order_id is required');
        });
    });
});
