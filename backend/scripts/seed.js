const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/production-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'Admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true
    });
    console.log('Created admin user:', admin.email);

    // Create regular user
    const user = await User.create({
      email: 'user@example.com',
      password: 'User123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      isEmailVerified: true
    });
    console.log('Created regular user:', user.email);

    // Create products
    const products = await Product.create([
      {
        name: 'Laptop Pro 15',
        description: 'High-performance laptop with latest processor and graphics',
        shortDescription: 'Powerful laptop for professionals',
        price: 1299.99,
        compareAtPrice: 1499.99,
        category: 'electronics',
        inventory: {
          quantity: 50,
          lowStockThreshold: 10
        },
        images: [
          {
            url: 'https://example.com/images/laptop.jpg',
            alt: 'Laptop Pro 15',
            isPrimary: true
          }
        ],
        tags: ['laptop', 'computer', 'electronics'],
        isFeatured: true,
        createdBy: admin._id
      },
      {
        name: 'Wireless Headphones',
        description: 'Premium wireless headphones with noise cancellation',
        shortDescription: 'High-quality wireless headphones',
        price: 199.99,
        category: 'electronics',
        inventory: {
          quantity: 100,
          lowStockThreshold: 20
        },
        images: [
          {
            url: 'https://example.com/images/headphones.jpg',
            alt: 'Wireless Headphones',
            isPrimary: true
          }
        ],
        tags: ['headphones', 'audio', 'wireless'],
        isFeatured: true,
        createdBy: admin._id
      },
      {
        name: 'Cotton T-Shirt',
        description: 'Comfortable 100% cotton t-shirt in various colors',
        shortDescription: 'Classic cotton t-shirt',
        price: 29.99,
        category: 'clothing',
        inventory: {
          quantity: 200,
          lowStockThreshold: 50
        },
        images: [
          {
            url: 'https://example.com/images/tshirt.jpg',
            alt: 'Cotton T-Shirt',
            isPrimary: true
          }
        ],
        tags: ['clothing', 'tshirt', 'casual'],
        createdBy: user._id
      },
      {
        name: 'JavaScript: The Definitive Guide',
        description: 'Comprehensive guide to JavaScript programming',
        shortDescription: 'Complete JavaScript reference',
        price: 49.99,
        category: 'books',
        inventory: {
          quantity: 75,
          lowStockThreshold: 15
        },
        images: [
          {
            url: 'https://example.com/images/js-book.jpg',
            alt: 'JavaScript Book',
            isPrimary: true
          }
        ],
        tags: ['book', 'programming', 'javascript'],
        createdBy: admin._id
      },
      {
        name: 'Yoga Mat',
        description: 'Non-slip yoga mat for all types of yoga practice',
        shortDescription: 'Premium yoga mat',
        price: 39.99,
        category: 'sports',
        inventory: {
          quantity: 150,
          lowStockThreshold: 30
        },
        images: [
          {
            url: 'https://example.com/images/yoga-mat.jpg',
            alt: 'Yoga Mat',
            isPrimary: true
          }
        ],
        tags: ['sports', 'yoga', 'fitness'],
        createdBy: user._id
      }
    ]);

    console.log(`Created ${products.length} products`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();


