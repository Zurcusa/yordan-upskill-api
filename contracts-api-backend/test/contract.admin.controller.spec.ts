import { Test, TestingModule } from '@nestjs/testing';
import { ContractAdminController } from '../src/contracts/controllers/admin.controller';
import { ContractService } from '../src/contracts/services/contract.service';
import { BadRequestException } from '@nestjs/common';

describe('ContractAdminController', () => {
  let controller: ContractAdminController;
  let service: ContractService;

  const mockContractService = {
    updatePrice: jest.fn(),
    addToWhitelist: jest.fn(),
    removeFromWhitelist: jest.fn(),
  } as Partial<Record<keyof ContractService, jest.Mock>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractAdminController],
      providers: [
        {
          provide: ContractService,
          useValue: mockContractService,
        },
      ],
    }).compile();

    controller = module.get<ContractAdminController>(ContractAdminController);
    service = module.get<ContractService>(ContractService);
  });

  describe('updatePrice', () => {
    it('should update price with valid input', async () => {
      const body = {
        callerAddress: '0x1234567890123456789012345678901234567890',
        newPrice: '0.1',
      };
      mockContractService.updatePrice!.mockResolvedValue({});

      await controller.updatePrice(body);
      expect(service.updatePrice).toHaveBeenCalledWith(
        body.callerAddress,
        body.newPrice,
      );
    });

    it('should throw BadRequestException when fields are missing', () => {
      expect(() =>
        controller.updatePrice(
          {} as { callerAddress: string; newPrice: string },
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('addToWhitelist', () => {
    it('should add address with valid input', async () => {
      const body = {
        callerAddress: '0x1234567890123456789012345678901234567890',
        address: '0x1111111111111111111111111111111111111111',
      };
      mockContractService.addToWhitelist!.mockResolvedValue({ success: true });

      const result = await controller.addToWhitelist(body);
      expect(result).toEqual({ success: true });
      expect(service.addToWhitelist).toHaveBeenCalledWith(
        body.callerAddress,
        body.address,
      );
    });

    it('should throw BadRequestException when fields are missing', () => {
      const body = { callerAddress: '', address: '' } as any;
      expect(() => controller.addToWhitelist(body)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeFromWhitelist', () => {
    it('should remove address with valid input', async () => {
      const body = {
        callerAddress: '0x1234567890123456789012345678901234567890',
        address: '0x1111111111111111111111111111111111111111',
      };
      mockContractService.removeFromWhitelist!.mockResolvedValue({
        success: true,
      });

      const result = await controller.removeFromWhitelist(body);
      expect(result).toEqual({ success: true });
      expect(service.removeFromWhitelist).toHaveBeenCalledWith(
        body.callerAddress,
        body.address,
      );
    });

    it('should throw BadRequestException when fields are missing', () => {
      const body = { callerAddress: '', address: '' } as any;
      expect(() => controller.removeFromWhitelist(body)).toThrow(
        BadRequestException,
      );
    });
  });
});
