import {Injectable, inject} from '@angular/core';
import {MatSnackBar, MatSnackBarRef, TextOnlySnackBar} from '@angular/material/snack-bar';

export type EditorNotificationKind = 'info' | 'error';

@Injectable()
export class EditorNotifications {
  static readonly INFO_DURATION_MS = 3_200;
  static readonly ERROR_DURATION_MS = 9_000;

  private readonly snackBar = inject(MatSnackBar);
  private active: {
    message: string;
    kind: EditorNotificationKind;
    ref: MatSnackBarRef<TextOnlySnackBar>;
  } | null = null;

  show(message: string, kind: EditorNotificationKind = 'info'): void {
    if (this.active?.message === message && this.active.kind === kind) return;

    const ref = this.snackBar.open(
      message,
      kind === 'error' ? 'Schließen' : undefined,
      {
        duration: kind === 'error'
          ? EditorNotifications.ERROR_DURATION_MS
          : EditorNotifications.INFO_DURATION_MS,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        politeness: kind === 'error' ? 'assertive' : 'polite',
        panelClass: kind === 'error' ? [
          '[--mat-snack-bar-container-color:#7f1d1d]',
          '[--mat-snack-bar-supporting-text-color:#fff]',
          '[--mat-snack-bar-button-color:#fecaca]',
        ] : [],
      },
    );
    this.active = {message, kind, ref};
    ref.afterDismissed().subscribe(() => {
      if (this.active?.ref === ref) this.active = null;
    });
  }
}
