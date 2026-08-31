import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PaystackPop from '@paystack/inline-js';
import { formatCurrency } from '../lib/utils';

export default function EquipmentShop({ user }) {
  // ── States ────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // ── Data Fetching ──────────────────────────────────────────────────
  useEffect(() => {
    fetchProducts();
    fetchMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) console.error('Error fetching products:', error);
    else setProducts(data || []);
    
    setLoading(false);
  }

  async function fetchMyOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price_at_purchase,
          products (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching orders:', error);
    else setMyOrders(data || []);

    setLoadingOrders(false);
  }

  // ── Cart Operations ────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    setOrderSuccess(false); 
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => 
      prev.map((item) => {
        if (item.product_id === productId) {
          const newQ = item.quantity + delta;
          return { ...item, quantity: newQ > 0 ? newQ : 1 };
        }
        return item;
      })
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ── Checkout Flow ──────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setOrderError('');

    // Production safety check: Ensure Paystack public key is configured
    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackPublicKey) {
      setOrderError('Payment service is not configured. Please contact the administrator.');
      setIsSubmitting(false);
      return;
    }

    // Production safety check: Ensure authenticated user email exists
    if (!user?.email) {
      setOrderError('Your account email is missing. Please ensure you are logged in with a valid email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Draft the Order as "pending"
      const { data: orderData, error: orderErrorRes } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: cartTotal,
          status: 'pending',
          shipping_address: 'Default Registered Address',
        })
        .select()
        .single();

      if (orderErrorRes) throw orderErrorRes;

      // 2. Insert Order Items
      const orderItemsToInsert = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Trigger Paystack Inline JS Modal
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: paystackPublicKey,
        email: user.email,
        amount: Math.round(cartTotal * 100), // Amount in kobo (1 Naira = 100 kobo)
        currency: 'NGN',
        onSuccess: async (response) => {
          const reference = response.reference;
          // Update order to 'processing' and save reference
          await supabase
            .from('orders')
            .update({ 
              status: 'processing',
              payment_reference: reference 
            })
            .eq('id', orderData.id);

          setCart([]);
          setIsCartOpen(false);
          setOrderSuccess(true);
          fetchMyOrders(); // Refresh order history
          setIsSubmitting(false);
        },
        onCancel: () => {
          setIsSubmitting(false);
          setOrderError('Payment was cancelled. Your order is saved as pending in your history.');
          fetchMyOrders(); // Refresh history to show pending order
        }
      });
      
    } catch (err) {
      console.error('Checkout failed:', err);
      setOrderError(err.message || 'Checkout failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[500px] flex flex-col gap-10 pb-20">
      
      {/* ── Top Section: Products ── */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-4 tracking-tight">Available Equipment</h2>
        


        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-[#0a2716]/40 border border-green-800/30 rounded-2xl h-80 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-[#0a2716]/40 border border-green-800/30 rounded-2xl">
            <p className="text-slate-400">No products available in the shop yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-[#0a2716]/60 backdrop-blur-md border border-green-800/40 shadow-lg rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:border-green-700/50 transition-all">
                <div className="h-48 bg-slate-900/50 flex-shrink-0 relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover opacity-90" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">No Image</div>
                  )}
                  <div className="absolute top-2 right-2 bg-green-950/80 backdrop-blur text-green-400 font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm border border-green-800/50">
                    {formatCurrency(product.price)}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-100 text-lg leading-tight mb-2">{product.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5 flex-1">{product.description}</p>
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-green-900/20"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Section: Order History ── */}
      <div id="my-orders-section" className="scroll-mt-24">
        <h2 className="text-xl font-extrabold text-slate-100 mb-4 tracking-tight border-t border-green-800/30 pt-10">My Orders</h2>
        
        {loadingOrders ? (
          <div className="animate-pulse bg-[#0a2716]/40 border border-green-800/30 rounded-2xl h-32 w-full" />
        ) : myOrders.length === 0 ? (
          <div className="text-center py-10 bg-[#0a2716]/40 border border-green-800/30 rounded-2xl text-slate-400 text-sm">
            You haven't placed any orders yet.
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => (
              <div key={order.id} className="bg-[#0a2716]/40 backdrop-blur-md border border-green-800/40 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-slate-300 font-mono text-xs bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/50">
                      ID: {order.id.split('-')[0]}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      order.status === 'pending' ? 'bg-amber-950/50 text-amber-500 border-amber-900/50' : 
                      order.status === 'processing' ? 'bg-blue-950/50 text-blue-400 border-blue-900/50' : 
                      'bg-green-950/50 text-green-400 border-green-900/50'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-3">
                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {order.order_items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-slate-500">{item.quantity}x</span> 
                        {item.products?.name || 'Unknown Product'} 
                        <span className="text-slate-500 text-xs">({formatCurrency(item.price_at_purchase)})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start sm:items-end justify-between border-t sm:border-t-0 border-green-800/30 pt-3 sm:pt-0">
                  <div className="text-lg font-extrabold text-white">{formatCurrency(order.total_amount)}</div>
                  {order.payment_reference && (
                    <div className="text-[10px] text-slate-500 mt-1 uppercase">Ref: {order.payment_reference}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Cart Button ── */}
      {cartItemCount > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-green-500 text-white p-4 rounded-full shadow-2xl shadow-green-900/50 hover:bg-green-400 hover:scale-105 transition-all flex items-center gap-2 group border-2 border-green-400"
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-green-500 shadow-sm">
              {cartItemCount}
            </span>
          </div>
          <span className="font-semibold pr-1 hidden sm:block">Checkout</span>
        </button>
      )}

      {/* ── Slide-Out Cart Panel ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-md bg-[#05150c] h-full shadow-2xl flex flex-col border-l border-green-800/50 animate-slide-in-right">
            
            {/* Cart Header */}
            <div className="px-6 py-5 border-b border-green-800/30 flex items-center justify-between bg-[#0a2716]/80">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                Your Cart
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900/50 rounded-full border border-green-800/30 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <p className="text-slate-500 text-center mt-10">Your cart is empty.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="flex gap-4 bg-[#0a2716]/40 border border-green-800/30 p-4 rounded-xl">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-200 text-sm leading-tight mb-1">{item.name}</h4>
                      <p className="text-green-400 font-bold text-sm">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button onClick={() => removeFromCart(item.product_id)} className="text-slate-500 hover:text-rose-400 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2 mt-2 bg-slate-900/50 border border-green-800/30 rounded-lg overflow-hidden shadow-inner">
                        <button onClick={() => updateQuantity(item.product_id, -1)} className="px-2.5 py-1 text-slate-400 hover:bg-green-900/50 hover:text-white transition font-bold">-</button>
                        <span className="text-xs font-semibold text-slate-200 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, 1)} className="px-2.5 py-1 text-slate-400 hover:bg-green-900/50 hover:text-white transition font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-[#0a2716]/80 border-t border-green-800/30 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                
                {orderError && (
                  <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs rounded-xl flex gap-2 items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {orderError}
                  </div>
                )}

                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-400 font-semibold text-sm uppercase tracking-wider">Total Amount</span>
                  <span className="text-2xl font-extrabold text-white">{formatCurrency(cartTotal)}</span>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/50 transition focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      Pay with Paystack
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* ── Success Modal ── */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setOrderSuccess(false)} />
          <div className="relative bg-[#0a2716] border border-green-500/50 p-8 rounded-3xl shadow-[0_0_60px_rgba(34,197,94,0.2)] max-w-sm w-full text-center flex flex-col items-center animate-slide-in-right">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 text-green-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Payment Successful!</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Your equipment order has been placed successfully. Our dispatch team is currently processing it.
            </p>
            <button 
              onClick={() => {
                setOrderSuccess(false);
                document.getElementById('my-orders-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-green-900/20"
            >
              View My Orders
            </button>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
