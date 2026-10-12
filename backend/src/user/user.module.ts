import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { getEnv, getJwtSecret } from 'src/config/env';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: getEnv().JWT_ACCESS_TTL as unknown as number },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
