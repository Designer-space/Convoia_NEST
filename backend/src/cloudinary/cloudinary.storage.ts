import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.config';

export const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req: any, file) => {
    // Support both JWT payload (userId) and entity (id) shapes on req.user
    const authUser = req?.user as any;
    const userId = authUser?.userId ?? authUser?.id;
    const publicId = userId
      ? `avatars/user-${userId}-avatar`
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    return {
      folder: 'avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      unique_filename: false,
      transformation: [
        { width: 300, height: 300, crop: 'fill' },
      ],
    };
  },
});
