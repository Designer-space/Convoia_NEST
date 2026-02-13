import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarStorage } from 'src/cloudinary/cloudinary.storage';

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
    updatePersonalProfile(@Req() req: any, @Body() updateData: Partial<any>, @UploadedFile() file?: Express.Multer.File) {
        if (file) {
            updateData.avatar = file.path;
            updateData.avatarPublicId = (file as any).filename;
        }
        return this.userService.updatePersonalProfile(req.user.userId, updateData);
    }
}
