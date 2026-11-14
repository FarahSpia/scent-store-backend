import multer from "multer";
import path from "path";
import { unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { AppError } from "../middleware/response_hanlder.ts";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

class ImageUploader {
  private readonly dir: string;
  private readonly publicPath: string;

  constructor(folderName: string) {
    this.dir = path.join(process.cwd(), "src", "uploads", folderName);
    this.publicPath = `/uploads/${folderName}`;
    mkdirSync(this.dir, { recursive: true });
  }

  public async deleteByUrl(url: string) {
  
  const fileName = path.basename(url);
  try {
    await unlink(path.join(this.dir, fileName));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err; 
  }
  }

  private diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, this.dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  public uploader = multer({
    storage: this.diskStorage,
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED.includes(file.mimetype))
        return cb(new AppError("Invalid image type", 400, "INVALID_FILE_TYPE"));
      cb(null, true);
    },
  });

  
  public getUrl(file: Express.Multer.File) {
    return `${this.publicPath}/${file.filename}`;
  }
}




const productImageUpload = new ImageUploader("product");

export const productImage_Uploader = productImageUpload.uploader;

export const getProductImageUrl = (file: Express.Multer.File) =>
  productImageUpload.getUrl(file);

export const deleteProductImageFile = (url: string) =>
  productImageUpload.deleteByUrl(url);
