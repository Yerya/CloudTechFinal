const request = require('supertest');
const { app, startServer } = require('../index');
const pool = require('../db');
const { encrypt, decrypt } = require('../crypto');

jest.mock('../db');
jest.mock('../crypto');

describe('Products Service', () => {
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
            expect(response.body).toHaveProperty('service', 'products');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(server).get('/metrics');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('service', 'products');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /products', () => {
        it('should return all products', async () => {
            const mockProducts = [{
                id: 1,
                name: 'Test Product',
                description: 'Test Description',
                price: 'encrypted_99.99'
            }];

            pool.query.mockResolvedValueOnce({ rows: mockProducts });

            const response = await request(server).get('/products');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([{
                id: 1,
                name: 'Test Product',
                description: 'Test Description',
                price: '99.99'
            }]);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM products');
        });
    });

    describe('POST /products', () => {
        it('should create a new product', async () => {
            const newProduct = {
                name: 'New Product',
                description: 'New Description',
                price: '199.99'
            };

            const mockDbResponse = {
                rows: [{
                    id: 1,
                    name: 'New Product',
                    description: 'New Description',
                    price: 'encrypted_199.99'
                }]
            };

            pool.query.mockResolvedValueOnce(mockDbResponse);

            const response = await request(server)
                .post('/products')
                .send(newProduct);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                name: 'New Product',
                description: 'New Description',
                price: '199.99'
            });
        });

        it('should validate required fields', async () => {
            const newProduct = {
                description: 'New Description',
                price: '199.99'
            };

            const response = await request(server)
                .post('/products')
                .send(newProduct);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Name is required');
        });
    });
});
