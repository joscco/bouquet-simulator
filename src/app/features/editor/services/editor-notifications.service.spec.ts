import {TestBed} from '@angular/core/testing';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subject} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {EditorNotifications} from './editor-notifications.service';

describe('EditorNotifications', () => {
  const dismissed = new Subject<void>();
  const snackBar = {
    open: vi.fn(() => ({afterDismissed: () => dismissed.asObservable()})),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        EditorNotifications,
        {provide: MatSnackBar, useValue: snackBar},
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('closes informational messages automatically after a short duration', () => {
    TestBed.inject(EditorNotifications).show('Gespeichert.');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Gespeichert.',
      undefined,
      expect.objectContaining({duration: EditorNotifications.INFO_DURATION_MS, politeness: 'polite'}),
    );
  });

  it('keeps errors longer and offers a manual close action', () => {
    TestBed.inject(EditorNotifications).show('Import fehlgeschlagen.', 'error');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Import fehlgeschlagen.',
      'Schließen',
      expect.objectContaining({
        duration: EditorNotifications.ERROR_DURATION_MS,
        politeness: 'assertive',
        panelClass: [
          '[--mat-snack-bar-container-color:#7f1d1d]',
          '[--mat-snack-bar-supporting-text-color:#fff]',
          '[--mat-snack-bar-button-color:#fecaca]',
        ],
      }),
    );
  });

  it('does not reopen an identical active message', () => {
    const notifications = TestBed.inject(EditorNotifications);

    notifications.show('Gespeichert.');
    notifications.show('Gespeichert.');

    expect(snackBar.open).toHaveBeenCalledTimes(1);
  });
});
