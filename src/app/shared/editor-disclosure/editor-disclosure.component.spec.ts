import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';
import {EditorDisclosureComponent} from './editor-disclosure.component';

describe('EditorDisclosureComponent', () => {
  it('toggles its model and accessible disclosure state', async () => {
    await TestBed.configureTestingModule({imports: [EditorDisclosureComponent]}).compileComponents();
    const fixture = TestBed.createComponent(EditorDisclosureComponent);
    fixture.componentRef.setInput('title', 'Szene & Licht');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Szene & Licht');

    fixture.componentInstance.expanded.set(false);
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
