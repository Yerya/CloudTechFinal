const request = require('supertest');
const { app, startServer } = require('../index');

jest.mock('../db', () => ({
    query: jest.fn()
}));
const pool = require('../db');

describe('Delivery Service', () => {
    let server;

    beforeAll(() => {
        server = startServer();
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('service', 'delivery');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(app).get('/metrics');
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
                { id: 1, order_id: 1, address: 'Test Address 123', delivery_date: '2025-05-26' }
            ];
            
            pool.query.mockResolvedValueOnce({ rows: mockDeliveries });

            const response = await request(app).get('/delivery');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockDeliveries);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM delivery');
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/delivery');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /delivery', () => {
        it('should create a new delivery', async () => {
            const newDelivery = {
                order_id: 1,
                address: 'Test Address 123',
                delivery_date: '2025-05-26'
            };

            const mockCreatedDelivery = { id: 1, ...newDelivery };
            pool.query.mockResolvedValueOnce({ rows: [mockCreatedDelivery] });

            const response = await request(app)
                .post('/delivery')
                .send(newDelivery);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCreatedDelivery);
            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO delivery (order_id, address, delivery_date) VALUES ($1, $2, $3) RETURNING *',
                [newDelivery.order_id, newDelivery.address, newDelivery.delivery_date]
            );
        });

        it('should handle database errors on creation', async () => {
            const newDelivery = {
                order_id: 1,
                address: 'Test Address 123',
                delivery_date: '2025-05-26'
            };

            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/delivery')
                .send(newDelivery);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });
}); 