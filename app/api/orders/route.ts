import { NextRequest, NextResponse } from 'next/server';
import {
  getAllOrders,
  createOrder,
  getProductById,
  getStoreSettings,
  isValidAdminSession,
  extractTokenFromRequest,
  OrderItem,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);

    if (!isValidAdminSession(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const orders = getAllOrders();
    return NextResponse.json({ success: true, orders });
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

      // Look up current product in authoritative database to prevent client tampering
      const dbProduct = item.id ? getProductById(String(item.id)) : null;
      const trustedPrice = dbProduct ? dbProduct.price : Number(item.price);
      const trustedName = dbProduct ? dbProduct.name : String(item.name || 'Palm Oil');
      const trustedImage = dbProduct ? dbProduct.imageUrl : String(item.imageUrl || '');

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

    // 3. Save order to database
    const savedOrder = createOrder({
      customerName: customerName.trim(),
      customerLocation: customerLocation.trim(),
      customerWhatsApp: customerWhatsApp.trim(),
      items: validatedItems,
      total: calculatedTotal,
    });

    if (!savedOrder || !savedOrder.orderId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to record order in database. Please try again.',
      }, { status: 500 });
    }

    // 4. Retrieve current store settings for WhatsApp formatting
    const settings = getStoreSettings();
    const formattedDate = new Date(savedOrder.createdAt).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Format products list for WhatsApp per exact spec
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

    // Sanitize store owner's WhatsApp number (must be international format without +, spaces or dashes)
    let phone = settings.whatsappNumber.replace(/[^0-9]/g, '');
    if (phone.startsWith('0') && phone.length === 11) {
      // e.g. Nigerian 080... -> 23480...
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
