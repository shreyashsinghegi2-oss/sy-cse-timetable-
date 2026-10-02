import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertProductSchema } from "@shared/schema";
import { ZodError } from "zod";

// Get all products with seller info
export async function getProducts(req: Request, res: Response) {
  try {
    const products = await storage.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
}

// Get product by ID
export async function getProductById(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.id);
    const product = await storage.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
}

// Get products by seller
export async function getProductsBySeller(req: Request, res: Response) {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const products = await storage.getProductsBySeller(sellerId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch seller products" });
  }
}

// Create new product
export async function createProduct(req: Request, res: Response) {
  try {
    const productData = insertProductSchema.parse(req.body);
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const product = await storage.createProduct({
      ...productData,
      sellerId: userId,
      price: parseFloat(productData.price),
      originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : undefined,
    });
    
    // Create notification for admin
    await storage.createNotification({
      type: "product_created",
      message: `New product listed: ${product.title} by seller ID ${userId}`,
      userId: userId
    });
    
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create product" });
  }
}

// Update product
export async function updateProduct(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.id);
    const productData = insertProductSchema.parse(req.body);
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Check if user owns this product
    const existingProduct = await storage.getProductById(productId);
    if (!existingProduct || existingProduct.sellerId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }
    
    const updatedProduct = await storage.updateProduct(productId, {
      ...productData,
      price: parseFloat(productData.price),
      originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : undefined,
    });
    
    res.json(updatedProduct);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update product" });
  }
}

// Delete product
export async function deleteProduct(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Check if user owns this product
    const existingProduct = await storage.getProductById(productId);
    if (!existingProduct || existingProduct.sellerId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }
    
    await storage.deleteProduct(productId);
    
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
}

// Search products
export async function searchProducts(req: Request, res: Response) {
  try {
    const { q, category, condition, minPrice, maxPrice } = req.query;
    
    const filters = {
      query: q as string,
      category: category as string,
      condition: condition as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    };
    
    const products = await storage.searchProducts(filters);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to search products" });
  }
}