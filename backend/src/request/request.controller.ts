import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequestService } from './request.service';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import type { AuthedRequest } from '../auth/types/authed-request';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class RequestController {
  constructor(private readonly friendRequestService: RequestService) {}

  @Get('myfriends')
  getAllFriends(@Req() req: AuthedRequest) {
    return this.friendRequestService.getAllFriends(req.user.userId);
  }

  @Get('requests')
  getAllFriendRequests(@Req() req: AuthedRequest) {
    return this.friendRequestService.getAllFriendRequests(req.user.userId);
  }

  @Get('requests/sent')
  getAllSentRequests(@Req() req: AuthedRequest) {
    return this.friendRequestService.getAllSentRequests(req.user.userId);
  }

  @Post('request/:receiverId')
  sendFriendRequest(
    @Req() req: AuthedRequest,
    @Param('receiverId', ParseIntPipe) receiverId: number,
  ) {
    return this.friendRequestService.sendFriendRequest(
      req.user.userId,
      receiverId,
    );
  }

  @Post('accept/:requestId')
  @HttpCode(200)
  acceptFriendRequest(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.friendRequestService.acceptFriendRequest(
      req.user.userId,
      requestId,
    );
  }

  @Post('reject/:requestId')
  @HttpCode(200)
  rejectFriendRequest(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.friendRequestService.rejectFriendRequest(
      req.user.userId,
      requestId,
    );
  }

  @Post('cancel/:requestId')
  @HttpCode(200)
  cancelFriendRequest(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.friendRequestService.cancelFriendRequest(
      req.user.userId,
      requestId,
    );
  }

  @Get('nonfriends')
  getAllNonAcceptedUser(@Req() req: AuthedRequest) {
    return this.friendRequestService.getAllNonAcceptedUser(req.user.userId);
  }

  @Delete(':friendId')
  unfriend(
    @Param('friendId', ParseIntPipe) friendId: number,
    @Req() req: AuthedRequest,
  ) {
    return this.friendRequestService.unfriend(req.user.userId, friendId);
  }
}
