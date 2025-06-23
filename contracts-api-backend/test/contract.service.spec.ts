import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from '../src/contracts/services/contract.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Erc721Entity } from '../src/contracts/entities/erc721.entity';
import { AuctionEntity } from '../src/contracts/entities/auction.entity';
import { ethers } from 'ethers';
import { BadRequestException } from '@nestjs/common';
import { ProviderConnectionError } from '../src/contracts/errors/ProviderConnectionError';
import { PersistenceError } from '../src/contracts/errors/PersistenceError';
import { RetryFailedError } from '../src/contracts/errors/RetryFailedError';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    WebSocketProvider: jest.fn().mockImplementation(() => ({
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      address: '0x1234567890123456789012345678901234567890',
    })),
    Contract: jest.fn().mockImplementation(() => ({
      owner: jest
        .fn()
        .mockResolvedValue('0x1234567890123456789012345678901234567890'),
      isWhitelisted: jest.fn().mockImplementation((address) => {
        return Promise.resolve(
          address === '0x1111111111111111111111111111111111111111',
        );
      }),
      addToWhitelist: jest
        .fn()
        .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      removeFromWhitelist: jest
        .fn()
        .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      updatePrice: jest
        .fn()
        .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      updatePublicPrice: jest
        .fn()
        .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      updatePrivatePrice: jest
        .fn()
        .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      setPrice: jest
        .fn()
        .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
    })),
    parseEther: jest.fn((value) => value),
    encodeBytes32String: jest.fn((str) => `0x${str}`),
    id: jest.fn((str) => `id:${str}`),
    isAddress: jest.fn((address) => /^0x[a-fA-F0-9]{40}$/.test(address)),
  },
}));

describe('ContractService', () => {
  let service: ContractService;
  let mockNftRepo;
  let mockAuctionRepo;
  let mockConfigService;
  let mockContract;
  let mockProvider;

  const mockOwner = '0x1234567890123456789012345678901234567890';

  beforeEach(async () => {
    mockNftRepo = {
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockAuctionRepo = {
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          WS_URL: 'http://localhost:8545',
          PRIVATE_KEY:
            '0x1234567890123456789012345678901234567890123456789012345678901234',
          NFT_CONTRACT: '0x1234567890123456789012345678901234567890',
          AUCTION_FACTORY: '0x1234567890123456789012345678901234567890',
        };
        return config[key];
      }),
    };

    mockContract = {
      owner: jest.fn(),
      getAddress: jest.fn(),
      setPrice: jest.fn(),
      setPublicSalePrice: jest.fn(),
      setPrivateSalePrice: jest.fn(),
      addWhitelistedUser: jest.fn(),
      removeWhitelistedUser: jest.fn(),
      whitelist: jest.fn(),
      isWhitelisted: jest.fn(),
      hasRole: jest.fn(),
      WHITELISTED_ROLE: jest.fn().mockReturnValue('WHITELISTED_ROLE'),
    };

    mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
    };

    // Mock the Contract constructor
    (ethers.Contract as jest.Mock).mockImplementation(() => mockContract);
    // Mock the WebSocketProvider constructor
    (ethers.WebSocketProvider as jest.Mock).mockImplementation(
      () => mockProvider,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(Erc721Entity),
          useValue: mockNftRepo,
        },
        {
          provide: getRepositoryToken(AuctionEntity),
          useValue: mockAuctionRepo,
        },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);

    jest.clearAllMocks();
  });

  describe('fetchAvailableNFTs', () => {
    it('should return all NFTs', async () => {
      const mockNFTs = [{ id: 1, tokenId: '123' }];
      mockNftRepo.find.mockResolvedValue(mockNFTs);

      const result = await service.fetchAvailableNFTs();
      expect(result).toEqual(mockNFTs);
      expect(mockNftRepo.find).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockNftRepo.find.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.fetchAvailableNFTs()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle empty result', async () => {
      mockNftRepo.find.mockResolvedValue([]);

      const result = await service.fetchAvailableNFTs();
      expect(result).toEqual([]);
    });
  });

  describe('fetchOngoingAuctions', () => {
    it('should return active auctions', async () => {
      const mockAuctions = [{ id: 1, status: 'active' }];
      mockAuctionRepo.find.mockResolvedValue(mockAuctions);

      const result = await service.fetchOngoingAuctions();
      expect(result).toEqual(mockAuctions);
      expect(mockAuctionRepo.find).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockAuctionRepo.find.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.fetchOngoingAuctions()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle empty result', async () => {
      mockAuctionRepo.find.mockResolvedValue([]);

      const result = await service.fetchOngoingAuctions();
      expect(result).toEqual([]);
    });
  });

  describe('NFT Price Management', () => {
    beforeEach(() => {
      mockContract.owner.mockResolvedValue(mockOwner);
      mockContract.getAddress.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should validate Ethereum address format', async () => {
      const invalidAddress = '0xinvalid';
      await expect(service.updatePrice(invalidAddress, '0.1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate price format', async () => {
      await expect(service.updatePrice(mockOwner, 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate negative prices', async () => {
      await expect(service.updatePrice(mockOwner, '-0.1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Whitelist Management', () => {
    beforeEach(() => {
      mockContract.owner.mockResolvedValue(mockOwner);
      mockContract.getAddress.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should validate whitelist addresses format', async () => {
      await expect(
        service.addToWhitelist(mockOwner, '0xInvalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty whitelist addresses array', async () => {
      const result = await service.removeFromWhitelist(mockOwner, '0xInvalid');
      expect(result).toEqual({
        success: false,
        message: 'No address specified',
      });
    });

    it('should validate caller address format', async () => {
      const invalidCaller = '0xinvalid';
      await expect(
        service.addToWhitelist(invalidCaller, mockOwner),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Network Connection', () => {
    it('should validate network connection before operations', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network error'));

      await expect(service.updatePrice(mockOwner, '0.1')).rejects.toThrow(
        ProviderConnectionError,
      );
    });

    it('should throw PersistenceError (caused by ProviderConnectionError) when network connection fails', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network error'));
      await expect(service.fetchAvailableNFTs()).rejects.toThrow(
        PersistenceError,
      );
      try {
        await service.fetchAvailableNFTs();
      } catch (e) {
        expect(e.cause).toBeInstanceOf(ProviderConnectionError);
      }
    });

    it('should throw RetryFailedError when contract operation fails after retries', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      mockContract.getAddress.mockResolvedValue(contractAddress);
      mockContract.hasRole.mockResolvedValue(true); // Mock admin role check to pass
      mockContract.setPrice.mockRejectedValue(new Error('Transaction failed'));

      await expect(service.updatePrice(mockOwner, "0.1")).rejects.toThrow(
        RetryFailedError,
      );
    });
  });

  describe('Database Operations', () => {
    it('should throw PersistenceError when NFT fetch fails', async () => {
      mockNftRepo.find.mockRejectedValue(new Error('Database error'));

      await expect(service.fetchAvailableNFTs()).rejects.toThrow(
        PersistenceError,
      );
    });

    it('should throw PersistenceError when auction fetch fails', async () => {
      mockAuctionRepo.find.mockRejectedValue(new Error('Database error'));

      await expect(service.fetchOngoingAuctions()).rejects.toThrow(
        PersistenceError,
      );
    });
  });
});
