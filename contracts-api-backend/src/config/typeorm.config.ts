import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { Erc721Entity } from '../contracts/entities/erc721.entity';
import { AuctionEntity } from '../contracts/entities/auction.entity';
import { UserEntity } from '../contracts/entities/user.entity';
import { MissingConfigurationError } from '.././contracts/errors/MissingConfigurationError';
import { configValidationSchema } from './config.validation';

config();

const { error, value: env } = configValidationSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
});

if (error) {
  throw new MissingConfigurationError(error);
}

const options: DataSourceOptions = {
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  entities: [Erc721Entity, AuctionEntity, UserEntity],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
};

export default new DataSource(options);
