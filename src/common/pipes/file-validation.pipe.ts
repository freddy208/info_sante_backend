// src/common/pipes/file-validation.pipe.ts

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * 📁 FILE VALIDATION PIPE
 *
 * Valide les fichiers uploadés (type, taille, etc.).
 *
 * UTILISATION :
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * uploadFile(
 *   @UploadedFile(new FileValidationPipe({
 *     maxSize: 5 * 1024 * 1024, // 5 MB
 *     allowedMimeTypes: ['image/jpeg', 'image/png'],
 *   }))
 *   file: Express.Multer.File,
 * ) {
 *   return { filename: file.filename };
 * }
 */

interface FileValidationOptions {
  maxSize?: number; // En bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions = {}) {}

  transform(file: Express.Multer.File) {
    const {
      maxSize = 10 * 1024 * 1024, // 10 MB par défaut
      allowedMimeTypes = [],
      allowedExtensions = [],
      required = true,
    } = this.options;

    // Vérifier si le fichier est requis
    if (required && !file) {
      throw new BadRequestException('Un fichier est requis');
    }

    // Si optionnel et pas de fichier
    if (!required && !file) {
      return null;
    }

    // Vérifier la taille
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `Le fichier est trop volumineux. Taille maximale : ${maxSizeMB} MB`,
      );
    }

    // Vérifier le type MIME
    if (
      allowedMimeTypes.length > 0 &&
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Types acceptés : ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Vérifier l'extension
    if (allowedExtensions.length > 0) {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        throw new BadRequestException(
          `Extension de fichier non autorisée. Extensions acceptées : ${allowedExtensions.join(', ')}`,
        );
      }
    }

    return file;
  }
}
