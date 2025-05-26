const request = require('supertest');
const { app, startServer } = require('../index');

jest.mock('../db', () => ({
    query: jest.fn()
}));
const pool = require('../db');

describe('Payments Service', () => {
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
            expect(response.body).toHaveProperty('service', 'payments');
            expect(response.body).toHaveProperty('time');
        });
    });

    describe('GET /metrics', () => {
        it('should return service metrics', async () => {
            const response = await request(app).get('/metrics');
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
                { id: 1, order_id: 1, amount: 99.99, payment_date: '2025-05-26' }
            ];
            
            pool.query.mockResolvedValueOnce({ rows: mockPayments });

            const response = await request(app).get('/payments');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockPayments);
            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM payments');
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/payments');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
            expect(response.body).toHaveProperty('details', 'Database error');
        });
    });

    describe('POST /payments', () => {
        it('should create a new payment', async () => {
            const newPayment = {
                order_id: 1,
                amount: 99.99,
                payment_date: '2025-05-26'
            };

            const mockCreatedPayment = { id: 1, ...newPayment };
            pool.query.mockResolvedValueOnce({ rows: [mockCreatedPayment] });

            const response = await request(app)
                .post('/payments')
                .send(newPayment);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCreatedPayment);
            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO payments (order_id, amount, payment_date) VALUES ($1, $2, $3) RETURNING *',
                [newPayment.order_id, newPayment.amount, newPayment.payment_date]
            );
        });

        it('should handle database errors on creation', async () => {
            const newPayment = {
                order_id: 1,
                amount: 99.99,
                payment_date: '2025-05-26'
            };

            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/payments')
                .send(newPayment);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
            expect(response.body).toHaveProperty('details', 'Database error');
        });
    });
}); 