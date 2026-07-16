import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {Translation, TranslocoLoader, provideTransloco} from '@jsverse/transloco';

class TestTranslocoLoader implements TranslocoLoader {
  getTranslation(): Promise<Translation> {
    return Promise.resolve({});
  }
}

export function provideTestTransloco(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {availableLangs: ['de', 'en'], defaultLang: 'de'},
      loader: TestTranslocoLoader,
    }),
  ]);
}
