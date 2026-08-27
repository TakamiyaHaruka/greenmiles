import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 位').max(128, '密码不能超过 128 位'),
});

export const RegisterSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 位').max(128, '密码不能超过 128 位'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
});

export const ProductSchema = z.object({
  name: z.string().min(1, '商品名称不能为空'),
  description: z.string().optional(),
  category: z.enum(['virtual', 'carbon', 'physical']),
  mileage_cost: z.number().positive('里程必须大于 0'),
  stock: z.number().int().min(0, '库存不能为负'),
  icon_type: z.string().optional(),
});

export const OrderSchema = z.object({
  product_id: z.number().positive('商品 ID 无效'),
  address: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ProductInput = z.infer<typeof ProductSchema>;
export type OrderInput = z.infer<typeof OrderSchema>;
