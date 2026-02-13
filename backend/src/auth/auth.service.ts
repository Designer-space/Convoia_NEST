import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { sampleUser } from 'src/utils/sampleUsers';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, @InjectRepository(User)
    private userRepository: Repository<User>,) {}

  async registerUser(user : { name: string; email: string; password: string; username: string; }) {
    const {name, email, password, username} = user;
    if (await this.userRepository.findOne({ where: { email } })) {
        throw new BadRequestException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({ name, username, email, password: hashedPassword });
    const foundUser = await this.userRepository.save(newUser);

    const payload = {sub: foundUser.id, email: foundUser.email};    
    const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'default' });
    const access_token = jwtService.sign(payload);
    return { message: 'User registered successfully', access_token };
}

  async login(email: string, password: string) {
    const foundUser = await this.userRepository.findOne({ where: { email } });
    if (!foundUser) throw new UnauthorizedException('No User Found');
    const isPasswordValid = await bcrypt.compare(password, foundUser?.password);
    if (!foundUser || !isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    const payload = {sub: foundUser.id, email: foundUser.email};    
    const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'default' });
    const access_token = jwtService.sign(payload);
    return {
        message: 'Login successful',
        access_token,
    };
  }
}
