import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';
import {SettingsDrawerComponent} from './settings-drawer.component';

describe('SettingsDrawerComponent', () => {
  it('changes its extent with the keyboard and clamps the result', () => {
    TestBed.configureTestingModule({imports: [SettingsDrawerComponent]});
    const fixture = TestBed.createComponent(SettingsDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('toggleLabel', 'Einstellungen');
    fixture.componentRef.setInput('extentRatio', 0.81);
    const ratios: number[] = [];
    fixture.componentInstance.extentRatioChange.subscribe((ratio) => ratios.push(ratio));

    fixture.componentInstance.resizeWithKeyboard(new KeyboardEvent('keydown', {key: 'ArrowRight'}));

    expect(ratios).toEqual([0.82]);
  });

  it('resets the drawer to its default half-screen extent', () => {
    TestBed.configureTestingModule({imports: [SettingsDrawerComponent]});
    const fixture = TestBed.createComponent(SettingsDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('toggleLabel', 'Einstellungen');
    const ratios: number[] = [];
    fixture.componentInstance.extentRatioChange.subscribe((ratio) => ratios.push(ratio));

    fixture.componentInstance.resetExtent();

    expect(ratios).toEqual([0.5]);
  });

  it('keeps the drawer edge highlighted for the complete resize gesture', () => {
    TestBed.configureTestingModule({imports: [SettingsDrawerComponent]});
    const fixture = TestBed.createComponent(SettingsDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('toggleLabel', 'Einstellungen');
    const pointer = {
      button: 0,
      pointerType: 'mouse',
      pointerId: 7,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
      currentTarget: {setPointerCapture: () => undefined},
    } as unknown as PointerEvent;

    fixture.componentInstance.startResize(pointer);
    expect(fixture.componentInstance.resizing()).toBe(true);

    fixture.componentInstance.finishResize(pointer);
    expect(fixture.componentInstance.resizing()).toBe(false);
  });
});
