const request = require('supertest');
const { app, startServer } = require('../index');

jest.mock('../db', () => ({
    query: jest.fn()
}));
const pool = require('../db');

describe('Products Service', () => {
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
            expect(response.body).toHaveProperty('service', 'products');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(app).get('/metrics');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('service', 'products');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /products', () => {
        it('should return all products', async () => {
            const mockProducts = [
                { id: 1, name: 'Test Product', description: 'Test Description', price: 99.99 }
            ];
            
            pool.query.mockResolvedValueOnce({ rows: mockProducts });

            const response = await request(app).get('/products');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockProducts);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM products');
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/products');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /products', () => {
        it('should create a new product', async () => {
            const newProduct = {
                name: 'Test Product',
                description: 'Test Description',
                price: 99.99
            };

            const mockCreatedProduct = { id: 1, ...newProduct };
            pool.query.mockResolvedValueOnce({ rows: [mockCreatedProduct] });

            const response = await request(app)
                .post('/products')
                .send(newProduct);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCreatedProduct);
            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
                [newProduct.name, newProduct.description, newProduct.price]
            );
        });

        it('should handle database errors on creation', async () => {
            const newProduct = {
                name: 'Test Product',
                description: 'Test Description',
                price: 99.99
            };

            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/products')
                .send(newProduct);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });
}); 