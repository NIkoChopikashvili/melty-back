# Melty Backend

Simple backend with Express, MongoDB, and Mongoose.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/melty-back
   
   # Flitt Payment Configuration
   FLITT_MERCHANT_ID=your_merchant_id
   FLITT_SECRET_KEY=your_secret_key
   ```

3. Run the server:
   ```bash
   node index.js
   ```

## Endpoints

### Balance
- **POST /api/balance/topup**
  - Body: `{ "userId": "string", "amount": number }`
- **POST /api/balance/withdraw**
  - Body: `{ "userId": "string", "amount": number }`
- **GET /api/balance/:userId**

### Payment (Flitt)
- **POST /api/payment/checkout-url**
  - Body: `{ "amount": number, "currency": "GEL", "order_desc": "string", "order_id": "string" (optional), "server_callback_url": "string" }`
  - Returns: `{ "checkout_url": "string" }` or error info.
- **POST /api/payment/status**
  - Body: `{ "order_id": "string" }`
- **POST /api/payment/callback**
  - Endpoint for Flitt to call with payment updates.
