export const AUCTION_EVENTS = {
  AUCTION_CANCELLED: 'AuctionCancelled',
  AUCTION_CREATED: 'AuctionCreated',
  AUCTION_ENDED: 'AuctionEnded',
  AUCTION_EXTENDED: 'AuctionExtended',
  AUCTION_STARTED: 'AuctionStarted',
  BID_PLACED: 'BidPlaced',
  TRANSFER: 'Transfer',
} as const;

export const OPERATIONS = {
  ADD_WHITELIST_ADDRESS: 'Add address to whitelist',
  GET_AVAILABLE_NFTS: 'Retrieve available NFTs',
  GET_ONGOING_AUCTIONS: 'Retrieve ongoing auctions',
  OPERATION_FAILURE: 'Operation failed',
  REMOVE_OLD_AUCTIONS: 'Remove outdated auctions',
  REMOVE_WHITELIST_ADDRESS: 'Remove address from whitelist',
  SAVE_NFT_RECORD: 'Persist NFT record',
  SAVE_USER_RECORD: 'Persist user record',
  SET_NFT_PRICE: 'Update NFT price',
  SET_PRICES: 'Update NFT prices',
  SET_PRIVATE_SALE_PRICE: 'Update private sale price',
  SET_PUBLIC_SALE_PRICE: 'Update public sale price',
  VERIFY_ROLE: 'Verify whitelister role',
  VERIFY_WHITELIST_STATUS: 'Verify whitelist status',
} as const;

export const MESSAGES = {
  ALREADY_WHITELISTED: 'Address is already whitelisted',
  ETH_ADDRESS_INVALID: 'Invalid Ethereum address',
  MISSING_DEFAULT_ADMIN_ROLE: 'Caller lacks DEFAULT_ADMIN_ROLE',
  NO_ADDRESS_PROVIDED: 'No address specified',
  NOT_IN_WHITELIST: 'Address not found in whitelist',
  PRICE_INVALID: 'Invalid price value',
  PRICE_NEGATIVE: 'Price must be positive',
  PRICE_UPDATED: 'Price updated successfully',
  WHITELIST_ADDED: 'Address successfully whitelisted',
  WHITELIST_REMOVED: 'Address removed from whitelist',
} as const;

export const CONFIG_KEYS = {
  AUCTION_FACTORY: 'AUCTION_FACTORY',
  NFT_CONTRACT: 'NFT_CONTRACT',
  PRIVATE_KEY: 'PRIVATE_KEY',
  WS_URL: 'WS_URL',
} as const;
