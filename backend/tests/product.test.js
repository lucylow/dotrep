const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');

describe('Product API', () => {
  let authToken;
  let user;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-app', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});

    // Create test user
    user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin'
    });

    authToken = user.generateAuthToken();
  });

  describe('POST /api/v1/products', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 99.99,
        category: 'electronics',
        inventory: {
          quantity: 10,
          lowStockThreshold: 5
        }
      };

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(productData.name);
      expect(response.body.data.product.price).toBe(productData.price);
    });

    it('should not create product without authentication', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 99.99,
        category: 'electronics'
      };

      const response = await request(app)
        .post('/api/v1/products')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should get all products', async () => {
      await Product.create([
        {
          name: 'Product 1',
          description: 'Description 1',
          price: 10,
          category: 'electronics',
          createdBy: user._id
        },
        {
          name: 'Product 2',
          description: 'Description 2',
          price: 20,
          category: 'clothing',
          createdBy: user._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter products by category', async () => {
      await Product.create([
        {
          name: 'Product 1',
          description: 'Description 1',
          price: 10,
          category: 'electronics',
          createdBy: user._id
        },
        {
          name: 'Product 2',
          description: 'Description 2',
          price: 20,
          category: 'clothing',
          createdBy: user._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/products?category=electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category).toBe('electronics');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should get a single product', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'electronics',
        createdBy: user._id
      });

      const response = await request(app)
        .get(`/api/v1/products/${product._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(product.name);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    it('should update a product', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'electronics',
        createdBy: user._id
      });

      const updateData = {
        name: 'Updated Product',
        price: 149.99
      };

      const response = await request(app)
        .put(`/api/v1/products/${product._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(updateData.name);
      expect(response.body.data.product.price).toBe(updateData.price);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should soft delete a product', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'electronics',
        createdBy: user._id
      });

      const response = await request(app)
        .delete(`/api/v1/products/${product._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify product is soft deleted
      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct.isActive).toBe(false);
    });
  });
});


