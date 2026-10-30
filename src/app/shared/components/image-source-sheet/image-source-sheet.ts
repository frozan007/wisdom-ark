import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

export type ImageSource = 'camera' | 'gallery';

@Component({
  selector: 'app-image-source-sheet',
  standalone: true,
  imports: [MatListModule, MatIconModule],
  templateUrl: './image-source-sheet.html',
  styleUrl: './image-source-sheet.scss',
})
export class ImageSourceSheet {
  private readonly sheetRef =
    inject(MatBottomSheetRef<ImageSourceSheet, ImageSource>);

  choose(source: ImageSource): void {
    this.sheetRef.dismiss(source);
  }
}
