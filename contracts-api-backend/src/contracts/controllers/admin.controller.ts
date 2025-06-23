import {
  Controller,
  Patch,
  Delete,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ContractService } from '../services/contract.service';

@Controller('contract/admin/sales')
export class ContractAdminController {
  private readonly MSG_MISSING_FIELD = 'Missing required fields';

  constructor(private readonly contractService: ContractService) {}

  @Patch('price')
  updatePrice(
    @Body()
    body: {
      callerAddress: string;
      newPrice: string;
    },
  ) {
    if (!body?.callerAddress?.trim() || !body?.newPrice?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.updatePrice(body.callerAddress, body.newPrice);
  }

  @Patch('whitelist')
  addToWhitelist(@Body() body: { callerAddress: string; address: string }) {
    if (!body?.callerAddress?.trim() || !body?.address?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.addToWhitelist(
      body.callerAddress,
      body.address,
    );
  }

  @Delete('whitelist')
  removeFromWhitelist(
    @Body() body: { callerAddress: string; address: string },
  ) {
    if (!body?.callerAddress?.trim() || !body?.address?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.removeFromWhitelist(
      body.callerAddress,
      body.address,
    );
  }
}
