import { Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { RequestService } from './request.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { NotificationService } from 'src/notification/notification.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class RequestController {
    constructor( private readonly friendRequestServices: RequestService, private readonly notificationService: NotificationService ) {}

    @Get('myfriends')
    async getAllFriends(@Req() req: any) {
        const userId = req.user.userId;
        return this.friendRequestServices.getAllFriends(userId);
    }

    @Get("requests")
    getAllFriendRequests(@Req() req:any){
        return this.friendRequestServices.getAllFriendRequests(req.user.userId)
    }

    @Post("request/:receiverId")
    sendFriendRequest(@Req() req: any, @Param() param: any){
        return this.friendRequestServices.sendFriendRequest(req.user.userId, Number(param.receiverId))
    }

    @Post("accept/:requestId")
    acceptFriendRequest(@Req() req:any, @Param() param: any){
        return this.friendRequestServices.acceptFriendRequest(req.user.userId, param.requestId)
    }

    @Post("reject/:requestId")
    rejectFriendRequest(@Req() req:any, @Param() param: any){
        return this.friendRequestServices.rejectFriendRequest(req.user.userId, param.requestId)
    }

    @Get("nonfriends")
    getAllNonAcceptedUser(@Req() req:any){
        return this.friendRequestServices.getAllNonAcceptedUser(req.user.userId)
    }

    @Delete(':friendId')
    async unfriend(
      @Param('friendId', ParseIntPipe) friendId: number,
      @Req() req: any,
    ) {
      return this.friendRequestServices.unfriend(req.user.userId, friendId);
    }

}
