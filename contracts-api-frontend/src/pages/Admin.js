import React, { useState } from 'react';
import './Admin.css';
import { API_ENDPOINTS } from '../config/config';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('nft');
  const [callerAddress, setCallerAddress] = useState('');
  const [price, setPrice] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Helper function to extract error message from various error types
  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    // Handle nested message structure from NestJS: { message: { message: "actual error" } }
    if (error?.message && typeof error.message === 'object' && error.message.message) {
      return error.message.message;
    }
    
    // Handle direct message field
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }
    
    // Handle error field
    if (error?.error) {
      return error.error;
    }
    
    return 'An unexpected error occurred';
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.UPDATE_PRICE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callerAddress,
          newPrice: price,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update price';
        try {
          const errorData = await response.json();
          errorMessage = getErrorMessage(errorData) || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setSuccess('Price updated successfully!');
      setPrice('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWhitelist = async (e) => {
    e.preventDefault();
    if (!callerAddress) {
      setError('Please enter your wallet address');
      return;
    }

    if (!whitelistAddress) {
      setError('Please enter an address to add to whitelist');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      callerAddress,
      address: whitelistAddress,
    };
    
    console.log('Sending whitelist request with payload:', payload);

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.ADD_WHITELIST, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let responseData = {};
      try {
        responseData = await response.json();
      } catch (parseError) {
        // Handle cases where response is not JSON
      }
      
      console.log('Response from server:', responseData);

      if (!response.ok || !responseData.success) {
        const errorMessage = getErrorMessage(responseData) || 'Failed to add to whitelist';
        throw new Error(errorMessage);
      }

      setSuccess(responseData.message || 'Added to whitelist successfully!');
      setWhitelistAddress('');
    } catch (err) {
      console.error('Error details:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRemoval = async () => {
    if (!callerAddress) {
      setError('Please enter your wallet address first');
      return;
    }

    if (!whitelistAddress) {
      setError('Please enter an address to remove from whitelist');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Removing address from whitelist:', whitelistAddress);
      const response = await fetch(API_ENDPOINTS.ADMIN.REMOVE_WHITELIST, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callerAddress,
          address: whitelistAddress
        }),
      });

      let responseData = {};
      try {
        responseData = await response.json();
      } catch (parseError) {
        // Handle cases where response is not JSON
      }
      
      console.log('Response from server:', responseData);

      if (!response.ok || !responseData.success) {
        const errorMessage = getErrorMessage(responseData) || 'Failed to remove from whitelist';
        throw new Error(errorMessage);
      }

      setSuccess(responseData.message || 'Removed from whitelist successfully!');
      setWhitelistAddress('');
    } catch (err) {
      console.error('Error removing from whitelist:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';
  };

  const handlePriceChange = (e, setter) => {
    const value = e.target.value;
    // Only allow numbers and one decimal point
    if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
      setter(value);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'nft' ? 'active' : ''}`}
            onClick={() => setActiveTab('nft')}
          >
            NFT Management
          </button>
          <button
            className={`tab-button ${activeTab === 'whitelist' ? 'active' : ''}`}
            onClick={() => setActiveTab('whitelist')}
          >
            Whitelist Management
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {activeTab === 'nft' && (
        <div className="section">
          <h2>NFT Price Management</h2>
          <form onSubmit={handleUpdatePrice} className="price-form">
            <div className="form-group">
              <label htmlFor="callerAddress">Your Wallet Address</label>
              <input
                id="callerAddress"
                type="text"
                value={callerAddress}
                onChange={(e) => setCallerAddress(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (ETH)</label>
              <input
                id="price"
                type="text"
                value={price}
                onChange={(e) => handlePriceChange(e, setPrice)}
                placeholder="e.g., 0.1 for 0.1 ETH"
                min="0"
                required
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Price'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'whitelist' && (
        <div className="section">
          <h2>Whitelist Management</h2>
          <div className="whitelist-form">
            <div className="form-group">
              <label htmlFor="whitelistCallerAddress">Your Wallet Address</label>
              <input
                id="whitelistCallerAddress"
                type="text"
                value={callerAddress}
                onChange={(e) => setCallerAddress(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="whitelistAddress">Wallet Address</label>
              <input
                id="whitelistAddress"
                type="text"
                value={whitelistAddress}
                onChange={(e) => setWhitelistAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>

            <div className="button-group">
              <button
                onClick={handleSubmitWhitelist}
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add to Whitelist'}
              </button>
              <button
                onClick={handleSubmitRemoval}
                className="remove-button"
                disabled={loading}
              >
                {loading ? 'Removing...' : 'Remove from Whitelist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin; 