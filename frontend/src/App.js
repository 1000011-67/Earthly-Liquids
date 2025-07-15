import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity: quantity }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!customerDetails.name || !customerDetails.email || !customerDetails.phone || !customerDetails.address) {
      alert('Please fill in all customer details');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = Math.round(getCartTotal() * 100); // Convert to paise
      
      const response = await fetch(`${BACKEND_URL}/api/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          customer_details: customerDetails
        }),
      });

      const orderData = await response.json();

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Earthly Liquids',
        description: 'Natural Floor Cleaner',
        handler: async (response) => {
          // Verify payment
          await fetch(`${BACKEND_URL}/api/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          
          alert('Payment successful! Your order has been placed.');
          setCart([]);
          setShowCheckout(false);
          setShowCart(false);
          setCustomerDetails({ name: '', email: '', phone: '', address: '' });
        },
        prefill: {
          name: customerDetails.name,
          email: customerDetails.email,
          contact: customerDetails.phone,
        },
        theme: {
          color: '#059669',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-bold text-xl">
                EARTHLY LIQUIDS
              </div>
              <div className="text-emerald-100 text-sm">
                From Earth's Core to Home's Care
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative bg-emerald-500 hover:bg-emerald-400 px-4 py-2 rounded-lg transition-colors"
              >
                🛒 Cart ({getCartCount()})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-green-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Natural Floor Care, Naturally Pure</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Experience the power of nature with our eco-friendly floor cleaners. 
            From Earth's Core to Home's Care - keeping your floors spotless while protecting the planet.
          </p>
          <div className="flex justify-center">
            <img 
              src="https://images.unsplash.com/photo-1599228993027-0ab8422edf78?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxlY28lMjBjbGVhbmluZ3xlbnwwfHx8Z3JlZW58MTc1MjYxNDMxOHww&ixlib=rb-4.1.0&q=85"
              alt="Natural cleaning"
              className="rounded-lg shadow-2xl max-w-md w-full"
            />
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Our Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{product.name}</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">{product.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-emerald-600 mb-2">Key Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {product.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-emerald-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-emerald-600">₹{product.price}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 border-b pb-4">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <p className="text-emerald-600 font-bold">₹{item.price}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total: ₹{getCartTotal().toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Checkout</h2>
            
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Full Name"
                value={customerDetails.name}
                onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={customerDetails.email}
                onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerDetails.phone}
                onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <textarea
                placeholder="Delivery Address"
                value={customerDetails.address}
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows="3"
              />
            </div>
            
            <div className="flex justify-between text-xl font-bold mb-6">
              <span>Total: ₹{getCartTotal().toFixed(2)}</span>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-emerald-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">EARTHLY LIQUIDS</h3>
              <p className="text-emerald-100">
                From Earth's Core to Home's Care - Your trusted partner for natural, eco-friendly floor cleaning solutions.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Why Choose Natural?</h4>
              <ul className="space-y-2 text-emerald-100">
                <li>• Safe for family & pets</li>
                <li>• Environmentally friendly</li>
                <li>• No harmful chemicals</li>
                <li>• Effective cleaning power</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-emerald-100">
                <p>📧 info@earthlyliquids.com</p>
                <p>📞 +91 9876543210</p>
                <p>🏢 Made in India with Love</p>
              </div>
            </div>
          </div>
          <div className="border-t border-emerald-700 mt-8 pt-8 text-center text-emerald-100">
            <p>&copy; 2025 Earthly Liquids. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;