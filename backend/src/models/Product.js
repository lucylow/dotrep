const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
      index: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description cannot exceed 200 characters']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Price must be a positive number'
      },
      index: true
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'other'],
      index: true
    },
    inventory: {
      quantity: {
        type: Number,
        required: true,
        min: [0, 'Quantity cannot be negative'],
        default: 0
      },
      lowStockThreshold: {
        type: Number,
        default: 10
      },
      trackQuantity: {
        type: Boolean,
        default: true
      }
    },
    images: [
      {
        url: {
          type: String,
          required: true
        },
        alt: String,
        isPrimary: {
          type: Boolean,
          default: false
        },
        order: {
          type: Number,
          default: 0
        }
      }
    ],
    specifications: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true
      }
    ],
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (v) => Math.round(v * 10) / 10 // Round to 1 decimal place
      },
      count: {
        type: Number,
        default: 0
      },
      breakdown: {
        type: Map,
        of: Number,
        default: {}
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    views: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
      virtuals: true
    },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', shortDescription: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ slug: 1 });

// Pre-save middleware to generate slug
productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for checking if product is in low stock
productSchema.virtual('isLowStock').get(function () {
  return this.inventory.quantity <= this.inventory.lowStockThreshold;
});

// Virtual for checking if product is on sale
productSchema.virtual('isOnSale').get(function () {
  return this.compareAtPrice && this.compareAtPrice > this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Instance method to update inventory
productSchema.methods.updateInventory = async function (newQuantity) {
  if (newQuantity < 0) {
    throw new Error('Inventory quantity cannot be negative');
  }
  this.inventory.quantity = newQuantity;
  return await this.save();
};

// Instance method to increment views
productSchema.methods.incrementViews = async function () {
  this.views += 1;
  return await this.save({ validateBeforeSave: false });
};

// Instance method to update rating
productSchema.methods.updateRating = async function (rating) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // This is a simplified version - in production, you'd want to track individual ratings
  const currentTotal = this.ratings.average * this.ratings.count;
  this.ratings.count += 1;
  this.ratings.average = (currentTotal + rating) / this.ratings.count;

  // Update breakdown
  if (!this.ratings.breakdown) {
    this.ratings.breakdown = new Map();
  }
  const currentCount = this.ratings.breakdown.get(rating.toString()) || 0;
  this.ratings.breakdown.set(rating.toString(), currentCount + 1);

  return await this.save();
};

// Static method to get products by category with pagination
productSchema.statics.findByCategory = function (category, page = 1, limit = 10) {
  return this.paginate(
    { category, isActive: true },
    {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: 'createdBy'
    }
  );
};

// Static method to get featured products
productSchema.statics.findFeatured = function (limit = 10) {
  return this.paginate(
    { isFeatured: true, isActive: true },
    {
      page: 1,
      limit,
      sort: { 'ratings.average': -1, createdAt: -1 },
      populate: 'createdBy'
    }
  );
};

// Static method to search products
productSchema.statics.search = function (query, page = 1, limit = 10) {
  return this.paginate(
    {
      $text: { $search: query },
      isActive: true
    },
    {
      page,
      limit,
      sort: { score: { $meta: 'textScore' } },
      populate: 'createdBy'
    }
  );
};

// Plugin for pagination
productSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Product', productSchema);


