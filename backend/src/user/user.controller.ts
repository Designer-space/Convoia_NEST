import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { avatarStorage } from '../cloudinary/cloudinary.storage';
import { UpdateProfileDto } from './dto/update-profile.dto';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];

interface AuthedRequest {
  user: { userId: number; email: string };
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  @UseGuards(JwtAuthGuard)
  getAllUsers(
    @Req() req: AuthedRequest,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getAllUsers(
      req.user.userId,
      search,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('myprofile')
  @UseGuards(JwtAuthGuard)
  getPersonalProfile(@Req() req: AuthedRequest) {
    return this.userService.getPersonalProfile(req.user.userId);
  }

  @Post('updatemyprofile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: avatarStorage,
      limits: { fileSize: MAX_AVATAR_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_AVATAR_MIME.includes(file.mimetype)) {
          cb(
            new BadRequestException('Avatar must be a JPEG, PNG or WebP image'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  updatePersonalProfile(
    @Req() req: AuthedRequest,
    @Body() updateData: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data: Partial<Record<string, unknown>> = { ...updateData };
    if (file) {
      data.avatar = file.path;
      data.avatarPublicId = (file as unknown as { filename?: string }).filename;
    }
    return this.userService.updatePersonalProfile(req.user.userId, data);
  }
}
