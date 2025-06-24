# NFT Auction Platform

A full-stack NFT auction platform built with NestJS backend, React frontend, and Ethereum smart contracts.

## Functionalities

- **View Auctions**: Browse ongoing NFT auctions
- **View NFTs**: Display available NFTs for auction (Not available in the Frontend)
- **Admin Controls**: Manage auction prices and whitelist addresses

## Architecture

- **Backend**: NestJS API with PostgreSQL database
- **Frontend**: React web application
- **Blockchain**: Ethereum smart contracts integration

## Quick Start

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd yordan-upskill-api
```

### 2. Start PostgreSQL Database

```bash
cd contracts-api-backend
docker-compose up -d
```

### 3. Backend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database and blockchain configuration

# Run migrations
npm run migration:run

# Start backend
npm run start:dev
```

Backend runs on `http://localhost:3000`

### 4. Frontend Setup

```bash
cd ../contracts-api-frontend

# Install dependencies
npm install

# Start frontend
npm start
```

Frontend runs on `http://localhost:3000` (React default)

### NFT Endpoints
```http
GET /contract/nfts
```
Get all available NFTs for auction.

### Auction Endpoints
```http
GET /contract/auctions
```
Get all ongoing auctions.

### Admin Endpoints

**Update Price**
```http
PATCH /contract/admin/sales/price
Content-Type: application/json

{
  "callerAddress": "0x...",
  "newPrice": "0.1"
}
```

**Add to Whitelist**
```http
PATCH /contract/admin/sales/whitelist
Content-Type: application/json

{
  "callerAddress": "0x...",
  "address": "0x..."
}
```

**Remove from Whitelist**
```http
DELETE /contract/admin/sales/whitelist
Content-Type: application/json

{
  "callerAddress": "0x...",
  "address": "0x..."
}
```

## Environment Configuration

### Backend Configuration

Create `.env` file in `contracts-api-backend/`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=auction_platform

# Blockchain Configuration
WS_URL=wss://your-websocket-endpoint
PRIVATE_KEY=your_private_key

# Smart Contract Addresses
AUCTION_FACTORY=0x...
NFT_CONTRACT=0x...

# API Configuration
PORT=3000
```

### Frontend Configuration

Create `.env` file in `contracts-api-frontend/`:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3000
```

## Database Commands

```bash
# Generate new migration
npm run migration:generate

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## License

MIT License 