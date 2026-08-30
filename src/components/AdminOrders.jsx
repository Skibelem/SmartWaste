import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id ( full_name ),
        order_items (
          quantity,
          price_at_purchase,
          products ( name )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching orders:', error);
    else setOrders(data || []);
    
    setLoading(false);
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full h-screen p-8 flex items-center justify-center bg-[#05150c]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-green-500 font-bold tracking-widest uppercase text-sm">Loading Orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-screen bg-[#05150c] overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8 tracking-tight">Shop Orders Fulfillment</h2>
        
        {orders.length === 0 ? (
          <div className="bg-[#0a2716]/40 border border-green-900/50 rounded-2xl p-12 text-center">
            <p className="text-slate-400">No orders have been placed yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-[#0a2716]/60 backdrop-blur-md border border-green-800/40 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row gap-6 justify-between">
                
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-slate-300 font-mono text-sm bg-slate-900/50 px-3 py-1 rounded-md border border-slate-700/50">
                      Order ID: {order.id.split('-')[0]}
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      order.status === 'pending' ? 'bg-amber-950/50 text-amber-500 border-amber-900/50' : 
                      order.status === 'processing' ? 'bg-blue-950/50 text-blue-400 border-blue-900/50' : 
                      order.status === 'shipped' ? 'bg-purple-950/50 text-purple-400 border-purple-900/50' :
                      'bg-green-950/50 text-green-400 border-green-900/50'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Customer</p>
                      <p className="text-slate-200 font-medium">{order.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-slate-400 text-sm">{order.profiles?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Payment</p>
                      <p className="text-lg font-extrabold text-white">{formatCurrency(order.total_amount)}</p>
                      <p className="text-slate-400 text-xs mt-0.5">Ref: {order.payment_reference || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">Items</p>
                    <ul className="text-sm text-slate-300 space-y-1.5 bg-slate-950/30 p-3 rounded-xl border border-green-900/30">
                      {order.order_items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center">
                          <span><span className="text-slate-500 mr-2">{item.quantity}x</span> {item.products?.name}</span>
                          <span className="text-slate-400 text-xs">{formatCurrency(item.price_at_purchase)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-end gap-3 border-t lg:border-t-0 lg:border-l border-green-800/30 pt-4 lg:pt-0 lg:pl-6 w-full lg:w-48">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest w-full text-center lg:text-right hidden lg:block mb-2">Update Status</p>
                  
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'processing')}
                    disabled={updatingId === order.id || order.status === 'processing'}
                    className="w-full py-2 px-3 bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 text-sm font-bold rounded-lg transition disabled:opacity-30 border border-blue-800/30"
                  >
                    Set Processing
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'shipped')}
                    disabled={updatingId === order.id || order.status === 'shipped'}
                    className="w-full py-2 px-3 bg-purple-900/40 hover:bg-purple-800/60 text-purple-400 text-sm font-bold rounded-lg transition disabled:opacity-30 border border-purple-800/30"
                  >
                    Mark Shipped
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                    disabled={updatingId === order.id || order.status === 'delivered'}
                    className="w-full py-2 px-3 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-sm font-bold rounded-lg transition disabled:opacity-30 border border-green-800/30"
                  >
                    Mark Delivered
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
