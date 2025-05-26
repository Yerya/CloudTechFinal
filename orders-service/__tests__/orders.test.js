const request = require('supertest');
const { app, startServer } = require('../index');
const pool = require('../db');
const { encrypt, decrypt } = require('../crypto');

// Мокаем модули
jest.mock('../db');
jest.mock('../crypto');
jest.mock('../cache', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
}));

describe('Orders Service', () => {
    let server;

    beforeAll(() => {
        server = startServer();
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Устанавливаем базовые моки для crypto
        encrypt.mockImplementation(text => `encrypted_${text}`);
        decrypt.mockImplementation(text => text.replace('encrypted_', ''));
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(server).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('service', 'orders');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(server).get('/metrics');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('service', 'orders');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /orders', () => {
        it('should return all orders', async () => {
            const mockOrders = [
                {
                    id: 1,
                    customer_name: 'encrypted_John Doe',
                    product_name: 'Test Product',
                    quantity: 1,
                    total_price: 'encrypted_99.99'
                }
            ];

            pool.query.mockResolvedValueOnce({ rows: mockOrders });

            const response = await request(server).get('/orders');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([{
                id: 1,
                customer_name: 'John Doe',
                product_name: 'Test Product',
                quantity: 1,
                total_price: '99.99'
            }]);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM orders');
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(server).get('/orders');
            
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
            expect(response.body).toHaveProperty('details', 'Database error');
        });
    });

    describe('POST /orders', () => {
        it('should create a new order', async () => {
            const newOrder = {
                customer_name: 'John Doe',
                product_name: 'Test Product',
                quantity: 1,
                total_price: '99.99'
            };

            const mockDbResponse = {
                rows: [{
                    id: 1,
                    customer_name: 'encrypted_John Doe',
                    product_name: 'Test Product',
                    quantity: 1,
                    total_price: 'encrypted_99.99'
                }]
            };

            pool.query.mockResolvedValueOnce(mockDbResponse);

            const response = await request(server)
                .post('/orders')
                .send(newOrder);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                ...newOrder
            });
            expect(pool.query).toHaveBeenCalled();
        });

        it('should handle database errors on creation', async () => {
            const newOrder = {
                customer_name: 'John Doe',
                product_name: 'Test Product',
                quantity: 1,
                total_price: '99.99'
            };

            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(server)
                .post('/orders')
                .send(newOrder);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
            expect(response.body).toHaveProperty('details', 'Database error');
        });

        it('should validate required fields', async () => {
            const newOrder = {
                customer_name: 'John Doe',
                total_price: '99.99'
            };

            const response = await request(server)
                .post('/orders')
                .send(newOrder);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Product name is required');
        });
    });
}); 