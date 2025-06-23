import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Erc721Entity } from '../entities/erc721.entity';
import { AuctionEntity } from '../entities/auction.entity';
import { ConfigService } from '@nestjs/config';
import * as zurcusNftAbi from '../ABI/ZurcusNFT.json';
import { ProviderConnectionError } from '../errors/ProviderConnectionError';
import { ContractOperationError } from '../errors/ContractOperationError';
import { PersistenceError } from '../errors/PersistenceError';
import { RetryFailedError } from '../errors/RetryFailedError';
import {
  OPERATIONS,
  MESSAGES,
  CONFIG_KEYS,
} from '../../constants/auction.constants';

@Injectable()
export class ContractService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly DEFAULT_ADMIN_ROLE = ethers.ZeroHash

  private readonly logger = new Logger(ContractService.name);
  private provider: ethers.WebSocketProvider;
  private wallet: ethers.Wallet;
  private zurcusNft: ethers.Contract;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Erc721Entity) private nftRepo: Repository<Erc721Entity>,
    @InjectRepository(AuctionEntity)
    private auctionRepo: Repository<AuctionEntity>,
  ) {
    const privateKey = this.configService.get<string>(CONFIG_KEYS.PRIVATE_KEY)!;
    const wsUrl = this.configService.get<string>(CONFIG_KEYS.WS_URL)!;
    const nftAddress = this.configService.get<string>(
      CONFIG_KEYS.NFT_CONTRACT,
    )!;

    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.zurcusNft = new ethers.Contract(
      nftAddress,
      zurcusNftAbi.abi,
      this.wallet,
    );
  }

  private validateEthereumAddress(address: string): void {
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(address)) {
      throw new BadRequestException(MESSAGES.ETH_ADDRESS_INVALID);
    }
  }

  private validatePrice(price: string): void {
    if (!price || isNaN(Number(price))) {
      throw new BadRequestException(MESSAGES.PRICE_INVALID);
    }
    if (Number(price) < 0) {
      throw new BadRequestException(MESSAGES.PRICE_NEGATIVE);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    contractAddress: string,
  ): Promise<T> {
    let lastError: Error = new Error(OPERATIONS.OPERATION_FAILURE);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `${operationName} attempt ${attempt} failed: ${error.message}`,
        );

        if (attempt === this.MAX_RETRIES) {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, this.RETRY_DELAY * attempt),
        );
      }
    }
    this.logger.error(
      `Operation ${operationName} failed for contract ${contractAddress} | Reason: ${lastError?.message}`,
    );

    throw new RetryFailedError(operationName, contractAddress, lastError);
  }

  private async validateNetworkConnection(): Promise<void> {
    try {
      await this.provider.getNetwork();
    } catch (error) {
      throw new ProviderConnectionError(error);
    }
  }

  async fetchAvailableNFTs(): Promise<Erc721Entity[]> {
    try {
      await this.validateNetworkConnection();
      return await this.nftRepo.find();
    } catch (error) {
      throw new PersistenceError(OPERATIONS.GET_AVAILABLE_NFTS, error);
    }
  }

  async fetchOngoingAuctions(): Promise<AuctionEntity[]> {
    try {
      await this.validateNetworkConnection();
      return await this.auctionRepo.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new PersistenceError(OPERATIONS.GET_ONGOING_AUCTIONS, error);
    }
  }

  async updatePrice(callerAddress: string, newPrice: string) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(newPrice);

    await this.validateNetworkConnection();
    await this.assertDefaultAdminRole(callerAddress);

    try {
      const contractAddress = await this.zurcusNft.getAddress();
      this.logger.log(`Update prices for nft contract at ${contractAddress}`);

      return await this.executeWithRetry(
        async () => {
          const tx = await this.zurcusNft.setPrice(
            ethers.parseEther(newPrice.toString()),
          );
          tx.wait();
          return { success: true, message: MESSAGES.PRICE_UPDATED };
        },
        OPERATIONS.SET_PRICES,
        contractAddress,
      );
    } catch (error) {
      if (error instanceof RetryFailedError) {
        throw error;
      }

      this.logger.error(`Error updating nft prices: ${error.message}`);
      throw new ContractOperationError(
        OPERATIONS.SET_PRICES,
        await this.zurcusNft.getAddress(),
        error,
      );
    }
  }

  async addToWhitelist(
    callerAddress: string,
    address: string,
  ): Promise<{ success: boolean; message: string }> {
    this.validateEthereumAddress(callerAddress);
    this.validateEthereumAddress(address);

    await this.validateNetworkConnection();
    await this.assertDefaultAdminRole(callerAddress);

    try {
      const contractAddress = await this.zurcusNft.getAddress();

      const isWhitelisted = await this.executeWithRetry(
        () =>
          this.zurcusNft.hasRole(this.zurcusNft.WHITELISTED_ROLE(), address),
        OPERATIONS.VERIFY_WHITELIST_STATUS,
        contractAddress,
      );

      if (isWhitelisted) {
        return {
          success: false,
          message: MESSAGES.ALREADY_WHITELISTED,
        };
      }

      this.logger.log(`Add address to nft contract at ${contractAddress}`);

      await this.executeWithRetry(
        async () => {
          const tx = await this.zurcusNft.addWhitelistedUser(address);
          tx.wait();
        },
        OPERATIONS.ADD_WHITELIST_ADDRESS,
        contractAddress,
      );
    } catch (error) {
      if (error instanceof RetryFailedError) {
        throw error;
      }

      if (error.message?.includes(MESSAGES.ALREADY_WHITELISTED)) {
        return {
          success: false,
          message: MESSAGES.ALREADY_WHITELISTED,
        };
      }

      this.logger.error(`Error adding address to whitelist: ${error.message}`);
      throw new ContractOperationError(
        OPERATIONS.ADD_WHITELIST_ADDRESS,
        await this.zurcusNft.getAddress(),
        error,
      );
    }

    return { success: true, message: MESSAGES.WHITELIST_ADDED };
  }

  async removeFromWhitelist(
    callerAddress: string,
    address: string,
  ): Promise<{ success: boolean; message: string }> {
    this.validateEthereumAddress(callerAddress);
    if (!address || !ethers.isAddress(address)) {
      return {
        success: false,
        message: MESSAGES.NO_ADDRESS_PROVIDED,
      };
    }

    await this.validateNetworkConnection();
    await this.assertDefaultAdminRole(callerAddress);

    try {
      const contractAddress = await this.zurcusNft.getAddress();

      const isWhitelisted = await this.executeWithRetry(
        () =>
          this.zurcusNft.hasRole(this.zurcusNft.WHITELISTED_ROLE(), address),
        OPERATIONS.VERIFY_WHITELIST_STATUS,
        contractAddress,
      );

      if (!isWhitelisted) {
        return {
          success: false,
          message: MESSAGES.NOT_IN_WHITELIST,
        };
      }

      this.logger.log(`Remove address from nft contract at ${contractAddress}`);

      await this.executeWithRetry(
        async () => {
          const tx = await this.zurcusNft.removeWhitelistedUser(address);
          tx.wait();
          return { success: true, message: MESSAGES.WHITELIST_REMOVED };
        },
        OPERATIONS.REMOVE_WHITELIST_ADDRESS,
        contractAddress,
      );

      return {
        success: true,
        message: MESSAGES.WHITELIST_REMOVED,
      };
    } catch (error) {
      if (error instanceof RetryFailedError) {
        throw error;
      }

      this.logger.error(
        `Error removing address from whitelist: ${error.message}`,
      );
      throw new ContractOperationError(
        OPERATIONS.REMOVE_WHITELIST_ADDRESS,
        await this.zurcusNft.getAddress(),
        error,
      );
    }
  }

  private async assertDefaultAdminRole(callerAddress: string): Promise<void> {
    this.validateEthereumAddress(callerAddress);

    try {
      this.logger.log(
        `Checking if ${callerAddress} has DEFAULT_ADMIN_ROLE for ${await this.zurcusNft.getAddress()}`,
      );
      const hasRole = await this.zurcusNft.hasRole(
        this.DEFAULT_ADMIN_ROLE,
        callerAddress,
      );

      if (!hasRole) {
        throw new ForbiddenException(MESSAGES.MISSING_DEFAULT_ADMIN_ROLE);
      }
    } catch (error) {
      this.logger.error(
        `Error checking WHITELIST_ADMIN_ROLE for ${callerAddress}: ${error.message}`,
      );
      throw new ContractOperationError(
        OPERATIONS.VERIFY_ROLE,
        await this.zurcusNft.getAddress(),
        error,
      );
    }
  }
}
