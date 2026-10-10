export interface Product {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  description: string;
  category: string;
  imageUrl: string;
  isPublished?: boolean; // defaults to true
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface StoreSettings {
  businessName: string;
  banner: string;
  bannerSubtitle: string;
  whatsappName: string;
  whatsappNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface Order {
  orderId: string;
  customerName: string;
  customerLocation: string;
  customerWhatsApp: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }[];
  total: number;
  paymentStatus: string;
  orderStatus: 'Pending' | 'Confirmed' | 'Delivered';
  createdAt: string;
}
