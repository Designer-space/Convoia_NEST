import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarStorage } from 'src/cloudinary/cloudinary.storage';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get("all")
    @UseGuards(JwtAuthGuard)
    getAllUsers(@Req() req : any) {
        return this.userService.getAllUsers(req.user.userId);
    }

    @Get("myprofile")
    @UseGuards(JwtAuthGuard)
    getPersonalProfile(@Req() req : any) {
        return this.userService.getPersonalProfile(req.user.userId);
    }

    @Post("updatemyprofile")
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: avatarStorage,
        }),
    )
    updatePersonalProfile(@Req() req: any, @Body() updateData: UpdateProfileDto, @UploadedFile() file?: Express.Multer.File) {
        const data: Record<string, any> = { ...updateData };
        if (file) {
            data.avatar = file.path;
            data.avatarPublicId = (file as any).filename;
        }
        return this.userService.updatePersonalProfile(req.user.userId, data);
    }
}
