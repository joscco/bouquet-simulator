import {TestBed} from '@angular/core/testing';
import {provideTestTransloco} from '../../testing/transloco-testing';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BouquetSidePanelComponent} from './bouquet-side-panel.component';

describe('BouquetSidePanelComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('requires a second click before resetting the complete bouquet', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const reset = vi.fn();
    component.bouquetReset.subscribe(reset);

    component.requestReset();
    expect(component.resetConfirmationPending()).toBe(true);
    expect(reset).not.toHaveBeenCalled();

    component.requestReset();
    expect(component.resetConfirmationPending()).toBe(false);
    expect(reset).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('expires an unconfirmed reset request', () => {
    vi.useFakeTimers();
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.requestReset();
    vi.advanceTimersByTime(3000);

    expect(component.resetConfirmationPending()).toBe(false);
    fixture.destroy();
  });

});

function createFixture() {
  TestBed.configureTestingModule({
    imports: [BouquetSidePanelComponent],
    providers: [provideTestTransloco()],
  });
  const fixture = TestBed.createComponent(BouquetSidePanelComponent);
  const inputs = {
    menuOpen: true,
    activeBouquetName: 'Strauß A',
    flowers: [],
    overlapCount: 0,
    selectedId: null,
    rotationDegrees: 0,
    vaseOptions: [],
    activeVaseId: 'classic',
    vaseMaterialOptions: [],
    activeVaseMaterialId: 'stoneware',
    videoExportSupported: true,
    videoExporting: false,
    videoExportProgress: 0,
    modelExporting: false,
    backgroundMode: 'light',
    sceneEffects: {sparkles: false, glowPoints: false, uplight: false},
    videoFormat: {id: 'square', name: 'Quadrat', ratio: '1:1', width: 1080, height: 1080},
  };
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  return fixture;
}
