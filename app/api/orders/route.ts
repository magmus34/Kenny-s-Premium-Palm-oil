import { NextRequest, NextResponse } from 'next/server';
import {
  getFirestoreOrders,
  createFirestoreOrder,
  getFirestoreProductById,
  getFirestoreSettings,
} from '@/lib/firestore-db';
import { isValidAdminSession, extractTokenFromRequest, OrderItem, Order } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const orders = await getFirestoreOrders();
    return NextResponse.json(
      { success: true, orders },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerLocation, customerWhatsApp, items } = body;

    // 1. Validate customer information
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your Full Name' }, { status: 400 });
    }

    if (!customerLocation || typeof customerLocation !== 'string' || !customerLocation.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your Delivery Location or City' }, { status: 400 });
    }

    if (!customerWhatsApp || typeof customerWhatsApp !== 'string' || !customerWhatsApp.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your WhatsApp Phone Number' }, { status: 400 });
    }

    // 2. Validate cart items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Your cart is empty. Please add at least one product.' }, { status: 400 });
    }

    const validatedItems: OrderItem[] = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({
          success: false,
          error: `Invalid product quantity in cart: ${item.name || 'Unnamed item'}`,
        }, { status: 400 });
      }

      // Look up current product in authoritative Firestore database
      const dbProduct = item.id ? await getFirestoreProductById(String(item.id)) : null;

      // Ensure product still exists and is published
      if (!dbProduct || dbProduct.isPublished === false) {
        return NextResponse.json({
          success: false,
          error: `Product "${item.name || 'Selected item'}" is no longer available or was removed from the store. Please refresh your cart.`,
        }, { status: 400 });
      }

      const trustedPrice = dbProduct.price;
      const trustedName = dbProduct.name;
      const trustedImage = dbProduct.imageUrl;

      if (isNaN(trustedPrice) || trustedPrice <= 0) {
        return NextResponse.json({
          success: false,
          error: `Invalid product price for: ${trustedName}`,
        }, { status: 400 });
      }

      const itemTotal = trustedPrice * qty;
      calculatedTotal += itemTotal;

      validatedItems.push({
        id: String(item.id || ''),
        name: trustedName,
        price: trustedPrice,
        quantity: qty,
        imageUrl: trustedImage,
      });
    }

    const orderId = 'PO-' + Math.floor(10000 + Math.random() * 90000);
    const now = new Date().toISOString();

    const newOrder: Order = {
      orderId,
      customerName: customerName.trim(),
      customerLocation: customerLocation.trim(),
      customerWhatsApp: customerWhatsApp.trim(),
      items: validatedItems,
      total: calculatedTotal,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      createdAt: now,
    };

    // 3. Save order to Firestore
    const savedOrder = await createFirestoreOrder(newOrder);

    // 4. Retrieve current store settings from Firestore for WhatsApp formatting
    const settings = await getFirestoreSettings();
    const formattedDate = new Date(savedOrder.createdAt).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const itemsListText = savedOrder.items
      .map(
        (it) =>
          `- ${it.name}\n  Quantity: ${it.quantity}\n  Price: ₦${it.price.toLocaleString()} (Subtotal: ₦${(
            it.quantity * it.price
          ).toLocaleString()})`
      )
      .join('\n\n');

    const whatsappMessage = `Order Reference: ${savedOrder.orderId}
Order Date: ${formattedDate}

Customer Name: ${savedOrder.customerName}
Customer Location: ${savedOrder.customerLocation}
Customer WhatsApp Number: ${savedOrder.customerWhatsApp}

Products Ordered:
${itemsListText}

Total Amount: ₦${savedOrder.total.toLocaleString()}

Payment Method:
Bank Transfer

Payment Status:
Pending

----------------------------------
Bank Transfer Details:
Bank: ${settings.bankName}
Account Name: ${settings.accountName}
Account Number: ${settings.accountNumber}

Please confirm my palm oil order.`;

    let phone = settings.whatsappNumber.replace(/[^0-9]/g, '');
    if (phone.startsWith('0') && phone.length === 11) {
      phone = '234' + phone.substring(1);
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      order: savedOrder,
      whatsappUrl,
      whatsappMessage,
      settings: {
        bankName: settings.bankName,
        accountName: settings.accountName,
        accountNumber: settings.accountNumber,
        whatsappNumber: settings.whatsappNumber,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to place order';
    console.error('Error in order creation:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
