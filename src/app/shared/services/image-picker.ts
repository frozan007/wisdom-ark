import { inject, Injectable } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Capacitor } from '@capacitor/core';
import { Camera, MediaResult } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';
import {
  ImageSource,
  ImageSourceSheet,
} from '../components/image-source-sheet/image-source-sheet';

@Injectable({
  providedIn: 'root',
})
export class ImagePickerService {
  private readonly bottomSheet = inject(MatBottomSheet);

  /**
   * On the phone, asks for camera or gallery and resolves with the chosen
   * image. In the browser, opens the given file input instead and resolves
   * with null, leaving the input's (change) handler to receive the file.
   */
  async pick(fileInput: HTMLInputElement): Promise<File | null> {
    if (!Capacitor.isNativePlatform()) {
      fileInput.click();
      return null;
    }

    const source = await firstValueFrom(
      this.bottomSheet
        .open<ImageSourceSheet, void, ImageSource>(ImageSourceSheet)
        .afterDismissed()
    );

    if (!source) {
      return null;
    }

    try {
      const result =
        source === 'camera'
          ? await Camera.takePhoto({
              quality: 80,
              targetWidth: 1600,
              targetHeight: 1600,
              correctOrientation: true,
            })
          : (
              await Camera.chooseFromGallery({
                quality: 80,
                targetWidth: 1600,
                targetHeight: 1600,
                correctOrientation: true,
              })
            ).results[0];

      return result ? await this.toFile(result) : null;
    } catch (error) {
      if (this.isCancellation(error)) {
        return null;
      }

      throw error;
    }
  }

  private async toFile(result: MediaResult): Promise<File | null> {
    if (!result.webPath) {
      return null;
    }

    const blob = await (await fetch(result.webPath)).blob();
    const type = blob.type || 'image/jpeg';
    const extension = type.split('/')[1] ?? 'jpg';

    return new File([blob], `photo-${Date.now()}.${extension}`, { type });
  }

  private isCancellation(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : String(error);

    return /cancel/i.test(message);
  }
}
