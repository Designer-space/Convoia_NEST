import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entity/notification.entity";
import { NotificationGateway } from "./notification.gateway";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private gateway: NotificationGateway,
  ) {}

  async notify(userId: number | string, type: string, payload?: any) {
    const numericUserId = Number(userId);
  
    const notification = this.notificationRepo.create({
      userId: numericUserId,
      type,
      payload,
    });
  
    await this.notificationRepo.save(notification);
  
    this.gateway.sendToUser(numericUserId, "notification", notification);
  
    return notification;
  } 
}

