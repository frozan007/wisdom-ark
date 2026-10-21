import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReversePaymentDialog } from './reverse-payment-dialog';

describe('ReversePaymentDialog', () => {
  let component: ReversePaymentDialog;
  let fixture: ComponentFixture<ReversePaymentDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReversePaymentDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReversePaymentDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
