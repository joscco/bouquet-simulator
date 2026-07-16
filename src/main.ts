import {bootstrapApplication} from '@angular/platform-browser';
import {inject, provideAppInitializer} from '@angular/core';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {MatIconRegistry} from '@angular/material/icon';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {AppComponent} from './app/app.component';
import {routes} from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass(
        "font-['Material_Icons']!",
        'mat-ligature-font',
      );
    }),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {duration: 3200, horizontalPosition: 'center', verticalPosition: 'top'},
    },
  ],
}).catch((error: unknown) => console.error(error));
