import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';
import {EditorDisclosureComponent} from './editor-disclosure.component';

describe('EditorDisclosureComponent', () => {
  it('keeps its model and native disclosure state in sync', async () => {
    await TestBed.configureTestingModule({imports: [EditorDisclosureComponent]}).compileComponents();
    const fixture = TestBed.createComponent(EditorDisclosureComponent);
    fixture.componentRef.setInput('title', 'Szene & Licht');
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);

    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();

    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(details.textContent).toContain('Szene & Licht');

    fixture.componentInstance.expanded.set(false);
    fixture.detectChanges();
    expect(details.open).toBe(false);
  });
});
