import { Controller, Get } from '@nestjs/common';
import { ContractService } from '../services/contract.service';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get('/nfts')
  getAvailableNFTs() {
    return this.contractService.fetchAvailableNFTs();
  }

  @Get('/auctions')
  getOngoingAuctions() {
    return this.contractService.fetchOngoingAuctions();
  }
}
