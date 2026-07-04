import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Bouquet Studio',
    loadComponent: () => import('./features/simulator/bouquet-simulator.component')
      .then((module) => module.BouquetSimulatorComponent),
  },
  {
    path: 'editor',
    title: 'Blumen-Editor',
    loadComponent: () => import('./features/editor/flower-editor.component')
      .then((module) => module.FlowerEditorComponent),
  },
  {path: '**', redirectTo: ''},
];
