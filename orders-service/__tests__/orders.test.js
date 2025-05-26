const request = require('supertest');
const app = require('../index');

jest.mock('../db', () => ({
    query: jest.fn()
}));
const pool = require('../db');

describe('Orders Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('service', 'orders');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(app).get('/metrics');
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
                { id: 1, customer_name: 'Test Customer', product_name: 'Test Product', quantity: 1, total_price: 100 }
            ];
            
            pool.query.mockResolvedValueOnce({ rows: mockOrders });

            const response = await request(app).get('/orders');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockOrders);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM public.orders');
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/orders');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /orders', () => {
        it('should create a new order', async () => {
            const newOrder = {
                customer_name: 'Test Customer',
                product_name: 'Test Product',
                quantity: 1,
                total_price: 100
            };

            const mockCreatedOrder = { id: 1, ...newOrder };
            pool.query.mockResolvedValueOnce({ rows: [mockCreatedOrder] });

            const response = await request(app)
                .post('/orders')
                .send(newOrder);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCreatedOrder);
            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO orders (customer_name, product_name, quantity, total_price) VALUES ($1, $2, $3, $4) RETURNING *',
                [newOrder.customer_name, newOrder.product_name, newOrder.quantity, newOrder.total_price]
            );
        });

        it('should handle database errors on creation', async () => {
            const newOrder = {
                customer_name: 'Test Customer',
                product_name: 'Test Product',
                quantity: 1,
                total_price: 100
            };

            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/orders')
                .send(newOrder);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });
}); 