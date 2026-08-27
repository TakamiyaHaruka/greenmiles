import { describe, it, expect } from 'vitest';
import { LoginSchema, RegisterSchema, ProductSchema, OrderSchema } from './schemas';

describe('LoginSchema', () => {
  it('accepts valid email and password', () => {
    const result = LoginSchema.safeParse({ email: 'test@example.com', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = LoginSchema.safeParse({ email: 'test@example.com', password: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = LoginSchema.safeParse({ email: '', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects password over 128 chars', () => {
    const result = LoginSchema.safeParse({ email: 'test@example.com', password: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });
});

describe('RegisterSchema', () => {
  it('accepts matching passwords', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different456',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find((i) => i.path.includes('confirmPassword'));
      expect(confirmError).toBeDefined();
    }
  });

  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({
      email: 'bad',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

describe('ProductSchema', () => {
  const validProduct = {
    name: 'Test Product',
    description: 'A test product',
    category: 'virtual' as const,
    mileage_cost: 1000,
    stock: 10,
    icon_type: 'bike',
  };

  it('accepts valid product', () => {
    const result = ProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('accepts product without optional fields', () => {
    const result = ProductSchema.safeParse({
      name: 'Minimal',
      category: 'carbon',
      mileage_cost: 500,
      stock: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = ProductSchema.safeParse({ ...validProduct, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects negative mileage_cost', () => {
    const result = ProductSchema.safeParse({ ...validProduct, mileage_cost: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero mileage_cost', () => {
    const result = ProductSchema.safeParse({ ...validProduct, mileage_cost: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock', () => {
    const result = ProductSchema.safeParse({ ...validProduct, stock: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = ProductSchema.safeParse({ ...validProduct, category: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('OrderSchema', () => {
  it('accepts valid order with address', () => {
    const result = OrderSchema.safeParse({ product_id: 1, address: '123 Main St' });
    expect(result.success).toBe(true);
  });

  it('accepts order without address', () => {
    const result = OrderSchema.safeParse({ product_id: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects negative product_id', () => {
    const result = OrderSchema.safeParse({ product_id: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects zero product_id', () => {
    const result = OrderSchema.safeParse({ product_id: 0 });
    expect(result.success).toBe(false);
  });
});
