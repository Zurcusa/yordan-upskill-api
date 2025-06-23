import { Module } from '@nestjs/common';
import { ContractController } from './controllers/contract.controller';
import { ContractAdminController } from './controllers/admin.controller';
import { ContractService } from './services/contract.service';
import { ContractListenerService } from './services/contractListener.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Erc721Entity } from './entities/erc721.entity';
import { AuctionEntity } from './entities/auction.entity';
import { UserEntity } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Erc721Entity, AuctionEntity, UserEntity]),
  ],
  controllers: [ContractController, ContractAdminController],
  providers: [ContractService, ContractListenerService],
})
export class ContractsModule {}
