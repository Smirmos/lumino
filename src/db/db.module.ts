import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb } from './index';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        if (!url) throw new Error('DATABASE_URL is required');
        return createDb(url);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['DB'],
})
export class DbModule {}
