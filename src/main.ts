import {bootstrapApplication} from '@angular/platform-browser';
import {inject, isDevMode, provideAppInitializer} from '@angular/core';
import {MatIconRegistry} from '@angular/material/icon';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {provideHttpClient} from '@angular/common/http';
import {provideTransloco} from '@jsverse/transloco';
import {AppComponent} from './app/app.component';
import {TranslocoHttpLoader} from './app/transloco-loader';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['de', 'en'],
        defaultLang: 'de',
        fallbackLang: 'de',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
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
